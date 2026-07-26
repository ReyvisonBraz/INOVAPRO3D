import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "../../../services/firebase";
import { saveQuoteFromCalc, uploadQuoteImage } from "../../../lib/quotes";
import {
  DEFAULT_ENERGY,
  DEFAULT_MACHINE,
  DEFAULT_PRICING_SETTINGS,
  machineHourBreakdown,
  MATERIAL_PRESETS,
  mergePricingSettings,
  parseTimeToHours,
  type MaterialKey,
  type MaterialSettings,
} from "../../../lib/pricing";
import {
  computeProjectPricing,
  createEmptyPlate,
  validateCalculatorProject,
  type CalculatorProject,
} from "../../../lib/calculatorProject";
import type { Material, MaterialUsage } from "../../../types/domain";

function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function useCalculatorState() {
  const [project, setProject] = useState<CalculatorProject>({
    name: "",
    plates: [createEmptyPlate(1)],
  });
  const [projectIssues, setProjectIssues] = useState<ReturnType<typeof validateCalculatorProject>>([]);
  const [pricingSettings, setPricingSettings] = useState(DEFAULT_PRICING_SETTINGS);
  // --- Parâmetros centrais de material (vindos de settings/pricing) ---
  const [materialSettings, setMaterialSettings] = useState<Record<MaterialKey, MaterialSettings>>(
    DEFAULT_PRICING_SETTINGS.materials,
  );

  // --- Material / job ---
  const [material, setMaterial] = useState<MaterialKey>("pla");
  const [spoolPrice, setSpoolPrice] = useState(MATERIAL_PRESETS.pla.spoolPrice);
  const [spoolWeight, setSpoolWeight] = useState(1000);
  const [slicerWeight, setSlicerWeight] = useState(120);
  const [reservePct, setReservePct] = useState(MATERIAL_PRESETS.pla.defaultReservePct);
  const [failureRatePct, setFailureRatePct] = useState(0);
  const [failureImpactPct, setFailureImpactPct] = useState(DEFAULT_PRICING_SETTINGS.failureImpactPct);
  const [batchQuantity, setBatchQuantity] = useState(1);
  const [inventoryMaterials, setInventoryMaterials] = useState<Material[]>([]);
  const [materialUsages, setMaterialUsages] = useState<MaterialUsage[]>([]);

  // --- Machine ---
  const [machinePrice, setMachinePrice] = useState(DEFAULT_MACHINE.price);
  const [lifespanHours, setLifespanHours] = useState(DEFAULT_MACHINE.lifespanHours);
  const [nozzlePrice, setNozzlePrice] = useState(DEFAULT_MACHINE.nozzlePrice);
  const [nozzleLifeHours, setNozzleLifeHours] = useState(DEFAULT_MACHINE.nozzleLifeHours);
  const [platePrice, setPlatePrice] = useState(DEFAULT_MACHINE.platePrice);
  const [plateLifeHours, setPlateLifeHours] = useState(DEFAULT_MACHINE.plateLifeHours);
  const [beltsPrice, setBeltsPrice] = useState(DEFAULT_MACHINE.beltsPrice);
  const [beltsLifeHours, setBeltsLifeHours] = useState(DEFAULT_MACHINE.beltsLifeHours);
  const [maintPerHour, setMaintPerHour] = useState(DEFAULT_MACHINE.maintPerHour);

  // --- Energy ---
  const [printTimeStr, setPrintTimeStr] = useState("3h 28min");
  const printTime = parseTimeToHours(printTimeStr);
  const [kwhCost, setKwhCost] = useState(DEFAULT_ENERGY.kwhCost);
  const [steadyPower, setSteadyPower] = useState(MATERIAL_PRESETS.pla.steadyPowerWatts);
  const [startupPower, setStartupPower] = useState(1000);
  const [startupMinutes, setStartupMinutes] = useState(8);

  // --- Labor ---
  const [requiresLabor, setRequiresLabor] = useState(false);
  const [laborHours, setLaborHours] = useState(0);
  const [laborRate, setLaborRate] = useState(30);
  const [extraSupplies, setExtraSupplies] = useState(0);
  const [packagingCost, setPackagingCost] = useState(0);
  const [targetProfitPerMachineHour, setTargetProfitPerMachineHour] = useState(
    DEFAULT_PRICING_SETTINGS.targetProfitPerMachineHour,
  );

  // --- Pricing / markup ---
  const [wholesaleMarkup, setWholesaleMarkup] = useState(DEFAULT_PRICING_SETTINGS.wholesaleMarkup);
  const [retailMarkup, setRetailMarkup] = useState(DEFAULT_PRICING_SETTINGS.retailMarkup);
  const [minPrice, setMinPrice] = useState(DEFAULT_PRICING_SETTINGS.minPrice);
  const [markupMode, setMarkupMode] = useState<"mult" | "pct">("mult");

  // --- UI toggles ---
  const [showAdvancedMachine, setShowAdvancedMachine] = useState(false);
  const [showAdvancedEnergy, setShowAdvancedEnergy] = useState(false);
  const [showMachineConfig, setShowMachineConfig] = useState(false);
  const [showMaterialConfig, setShowMaterialConfig] = useState(false);
  const [showEnergyConfig, setShowEnergyConfig] = useState(false);
  const [showLaborConfig, setShowLaborConfig] = useState(false);

  // --- Save calc / orçamento ---
  const [savingCalc, setSavingCalc] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [quoteImageUrl, setQuoteImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // --- Material preset selector (usa os parâmetros centrais do admin) ---
  function selectMaterial(key: MaterialKey) {
    const preset = materialSettings[key];
    setMaterial(key);
    setSpoolPrice(preset.spoolPrice);
    setSpoolWeight(preset.spoolWeight);
    setSteadyPower(preset.steadyPowerWatts);
    setReservePct(preset.defaultReservePct);
  }

  // --- Markup helpers (mult ↔ %) ---
  const markupLabel = (mult: number) =>
    markupMode === "pct"
      ? `${((mult - 1) * 100).toFixed(0)}%`
      : `${mult.toFixed(1)}×`;

  const wholesaleDisplay =
    markupMode === "pct" ? Math.round((wholesaleMarkup - 1) * 10000) / 100 : wholesaleMarkup;
  const retailDisplay =
    markupMode === "pct" ? Math.round((retailMarkup - 1) * 10000) / 100 : retailMarkup;

  function handleWholesaleMarkup(val: number) {
    setWholesaleMarkup(markupMode === "pct" ? 1 + val / 100 : val);
  }
  function handleRetailMarkup(val: number) {
    setRetailMarkup(markupMode === "pct" ? 1 + val / 100 : val);
  }

  // --- Load central pricing config from Firestore (admin é a fonte de verdade) ---
  // Sobrescreve os defaults: energia, markups, falha e material.
  useEffect(() => {
    getDoc(doc(db, "settings", "pricing")).then((snap) => {
      if (!snap.exists()) return;
      const cfg = mergePricingSettings(snap.data());
      setPricingSettings(cfg);
      setMaterialSettings(cfg.materials);
      setKwhCost(cfg.kwhCost);
      setStartupPower(cfg.startupPowerWatts);
      setStartupMinutes(cfg.startupMinutes);
      setFailureImpactPct(cfg.failureImpactPct);
      setTargetProfitPerMachineHour(cfg.targetProfitPerMachineHour);
      setWholesaleMarkup(cfg.wholesaleMarkup);
      setRetailMarkup(cfg.retailMarkup);
      setMinPrice(cfg.minPrice);
      // Aplica o preset do material atualmente selecionado.
      setMaterial((cur) => {
        const mat = cfg.materials[cur];
        setSpoolPrice(mat.spoolPrice);
        setSpoolWeight(mat.spoolWeight);
        setSteadyPower(mat.steadyPowerWatts);
        setReservePct(mat.defaultReservePct);
        return cur;
      });
    });
  }, []);

  // Filamentos reais cadastrados no painel. O orçamento apenas registra a
  // previsão; a reserva/baixa acontece nas transições do pedido.
  useEffect(() => {
    getDocs(collection(db, "materials"))
      .then((snapshot) => setInventoryMaterials(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() } as Material))
          .filter((item) => item.active !== false),
      ))
      .catch(() => setInventoryMaterials([]));
  }, []);

  // --- Load machine config from Firestore (overrides localStorage defaults) ---
  useEffect(() => {
    getDoc(doc(db, "settings", "machine")).then((snap) => {
      if (!snap.exists()) return;
      const m = snap.data();
      if (Number.isFinite(m.price)) setMachinePrice(m.price);
      if (Number.isFinite(m.lifespanHours)) setLifespanHours(m.lifespanHours);
      if (Number.isFinite(m.nozzlePrice)) setNozzlePrice(m.nozzlePrice);
      if (Number.isFinite(m.nozzleLifeHours)) setNozzleLifeHours(m.nozzleLifeHours);
      if (Number.isFinite(m.platePrice)) setPlatePrice(m.platePrice);
      if (Number.isFinite(m.plateLifeHours)) setPlateLifeHours(m.plateLifeHours);
      if (Number.isFinite(m.beltsPrice)) setBeltsPrice(m.beltsPrice);
      if (Number.isFinite(m.beltsLifeHours)) setBeltsLifeHours(m.beltsLifeHours);
      if (Number.isFinite(m.maintPerHour)) setMaintPerHour(m.maintPerHour);
    });
  }, []);

  // --- Computed values ---
  const machineBreak = machineHourBreakdown({
    price: machinePrice, lifespanHours,
    nozzlePrice, nozzleLifeHours,
    platePrice, plateLifeHours,
    beltsPrice, beltsLifeHours,
    maintPerHour,
  });

  const projectPricingSettings = useMemo(() => ({
    ...pricingSettings,
    kwhCost,
    startupPowerWatts: startupPower,
    startupMinutes,
    failureRatePct,
    failureImpactPct,
    targetProfitPerMachineHour,
  }), [pricingSettings, kwhCost, startupPower, startupMinutes, failureRatePct, failureImpactPct, targetProfitPerMachineHour]);
  const projectPricing = useMemo(
    () => computeProjectPricing(
      project,
      {
        price: machinePrice, lifespanHours,
        nozzlePrice, nozzleLifeHours,
        platePrice, plateLifeHours,
        beltsPrice, beltsLifeHours, maintPerHour,
      },
      projectPricingSettings,
      {
        laborHours: requiresLabor ? laborHours : 0,
        laborRate,
        extraSupplies,
        packagingCost,
        wholesaleMarkup,
        retailMarkup,
        minPrice,
      },
    ),
    [
      project, machinePrice, lifespanHours, nozzlePrice, nozzleLifeHours,
      platePrice, plateLifeHours, beltsPrice, beltsLifeHours, maintPerHour,
      projectPricingSettings, requiresLabor, laborHours, laborRate, extraSupplies,
      packagingCost, wholesaleMarkup, retailMarkup, minPrice,
    ],
  );
  const result = projectPricing.result;

  const reserveMultiplier = 1 + Math.max(0, reservePct) / 100;
  const laborTotal = result.laborCost + result.extraSupplies + result.packagingCost;
  const generatedAt = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  // --- Upload da imagem opcional do produto ---
  const handleUploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.", { position: "bottom-center" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 8 MB).", { position: "bottom-center" });
      return;
    }
    setUploadingImage(true);
    try {
      const url = await uploadQuoteImage(file);
      setQuoteImageUrl(url);
      toast.success("Imagem anexada.", { duration: 2200, position: "bottom-center" });
    } catch (err) {
      console.error("[quote-image-upload]", err);
      const code = (err as { code?: string })?.code || "";
      if (code === "storage/unauthenticated") {
        toast.error("Faça login como admin para anexar imagem.", { position: "bottom-center" });
      } else if (code === "storage/unauthorized") {
        toast.error("Upload bloqueado: publique as regras do Storage (firebase deploy --only storage).", { duration: 5000, position: "bottom-center" });
      } else {
        toast.error("Falha ao enviar imagem.", { position: "bottom-center" });
      }
    } finally {
      setUploadingImage(false);
    }
  };

  // --- Salvar orçamento no sistema (aba Orçamentos) ---
  const handleSaveCalc = async () => {
    if (!clientName.trim()) {
      toast.error("Informe o nome do cliente para salvar.", { position: "bottom-center" });
      return;
    }
    const issues = validateCalculatorProject(project);
    setProjectIssues(issues);
    if (issues.length) {
      toast.error(issues[0].message, { position: "bottom-center" });
      return;
    }
    const predictedUsages: MaterialUsage[] = project.plates.flatMap((plate) =>
      plate.filaments.map((filament) => ({
        materialId: filament.materialId || `manual:${filament.id}`,
        materialName: filament.materialName,
        plateId: plate.id,
        plateName: plate.name,
        inventoryTracked: Boolean(filament.materialId),
        ...(filament.manual ? {
          manualColor: filament.manual.color,
          manualBrand: filament.manual.brand,
          manualType: filament.manual.type,
          pricePerKg: filament.manual.pricePerKg,
        } : {}),
        estimatedGrams: filament.totalGrams * Math.max(1, plate.repetitions),
      })),
    );
    setSavingCalc(true);
    try {
      await saveQuoteFromCalc({
        clientName,
        phone: clientPhone,
        pieceName: project.name,
        materialLabel: project.plates.some((plate) => plate.type === "MULTICOLOR") ? "Multicolor" : "Cor única",
        weight: result.weightGrams,
        printTime: `${result.hours.toFixed(2)}h`,
        quantity: projectPricing.totalPieces,
        price: result.retailTotal,
        unitPrice: result.retailUnit,
        costTotal: result.totalCost,
        imageUrl: quoteImageUrl || undefined,
        materialUsages: predictedUsages,
        calculationProject: project,
        notes: `Custo previsto ${result.totalCost.toFixed(2)} · atacado ${result.wholesaleTotal.toFixed(2)} · varejo ${result.retailTotal.toFixed(2)} · ${project.plates.length} bandeja(s) · ${result.weightGrams.toFixed(2)}g · ${result.hours.toFixed(2)}h`,
      });
      toast.success("Orçamento salvo na aba Orçamentos!", { duration: 2800, position: "bottom-center" });
      setClientName("");
      setClientPhone("");
      setQuoteImageUrl("");
      setProject({ name: "", plates: [createEmptyPlate(1)] });
      setProjectIssues([]);
    } catch {
      toast.error("Erro ao salvar. É preciso estar logado como admin.", { position: "bottom-center" });
    } finally {
      setSavingCalc(false);
    }
  };

  return {
    project, setProject, projectIssues, setProjectIssues, pricingSettings: projectPricingSettings,
    projectPricing,
    // material
    material, spoolPrice, setSpoolPrice, spoolWeight, setSpoolWeight,
    slicerWeight, setSlicerWeight, reservePct, setReservePct,
    failureRatePct, setFailureRatePct, failureImpactPct, setFailureImpactPct,
    batchQuantity, setBatchQuantity,
    selectMaterial, materialSettings, inventoryMaterials, materialUsages, setMaterialUsages,
    // machine
    machinePrice, setMachinePrice, lifespanHours, setLifespanHours,
    nozzlePrice, setNozzlePrice, nozzleLifeHours, setNozzleLifeHours,
    platePrice, setPlatePrice, plateLifeHours, setPlateLifeHours,
    beltsPrice, setBeltsPrice, beltsLifeHours, setBeltsLifeHours,
    maintPerHour, setMaintPerHour,
    // energy
    printTimeStr, setPrintTimeStr, printTime, kwhCost, setKwhCost,
    steadyPower, setSteadyPower, startupPower, setStartupPower,
    startupMinutes, setStartupMinutes,
    // labor
    requiresLabor, setRequiresLabor, laborHours, setLaborHours,
    laborRate, setLaborRate, extraSupplies, setExtraSupplies,
    packagingCost, setPackagingCost,
    targetProfitPerMachineHour, setTargetProfitPerMachineHour,
    // pricing
    wholesaleMarkup, retailMarkup, minPrice, setMinPrice,
    markupMode, setMarkupMode,
    wholesaleDisplay, retailDisplay, markupLabel,
    handleWholesaleMarkup, handleRetailMarkup,
    // ui toggles
    showAdvancedMachine, setShowAdvancedMachine,
    showAdvancedEnergy, setShowAdvancedEnergy,
    showMachineConfig, setShowMachineConfig,
    showMaterialConfig, setShowMaterialConfig,
    showEnergyConfig, setShowEnergyConfig,
    showLaborConfig, setShowLaborConfig,
    // save
    savingCalc, handleSaveCalc,
    clientName, setClientName, clientPhone, setClientPhone,
    quoteImageUrl, setQuoteImageUrl, uploadingImage, handleUploadImage,
    // computed
    result, machineBreak, reserveMultiplier, laborTotal, generatedAt,
  };
}

export { safeNumber };

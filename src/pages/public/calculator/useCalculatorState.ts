import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "../../../services/firebase";
import { saveQuoteFromCalc, uploadQuoteImage } from "../../../lib/quotes";
import {
  computePricing,
  DEFAULT_ENERGY,
  DEFAULT_FAILURE_RATE,
  DEFAULT_MACHINE,
  DEFAULT_PRICING_SETTINGS,
  machineHourBreakdown,
  MATERIAL_PRESETS,
  mergePricingSettings,
  parseTimeToHours,
  type MaterialKey,
  type MaterialSettings,
} from "../../../lib/pricing";

const CONFIG_KEY = "inovapro3d:calc-config";

function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function useCalculatorState() {
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
  const [failureRatePct, setFailureRatePct] = useState(DEFAULT_FAILURE_RATE);
  const [batchQuantity, setBatchQuantity] = useState(1);

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

  // --- Pricing / markup ---
  const [wholesaleMarkup, setWholesaleMarkup] = useState(1.6);
  const [retailMarkup, setRetailMarkup] = useState(2.5);
  const [minPrice, setMinPrice] = useState(0);
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
  const [saveLabel, setSaveLabel] = useState("");
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

  // --- Load persisted business config on mount ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return;
      const cfg = JSON.parse(raw);
      if (typeof cfg !== "object" || cfg === null) return;
      if (cfg.material === "pla" || cfg.material === "petg") setMaterial(cfg.material);
      if (Number.isFinite(cfg.spoolPrice)) setSpoolPrice(cfg.spoolPrice);
      if (Number.isFinite(cfg.spoolWeight)) setSpoolWeight(cfg.spoolWeight);
      if (Number.isFinite(cfg.reservePct)) setReservePct(cfg.reservePct);
      if (Number.isFinite(cfg.failureRatePct)) setFailureRatePct(cfg.failureRatePct);
      if (Number.isFinite(cfg.machinePrice)) setMachinePrice(cfg.machinePrice);
      if (Number.isFinite(cfg.lifespanHours)) setLifespanHours(cfg.lifespanHours);
      if (Number.isFinite(cfg.nozzlePrice)) setNozzlePrice(cfg.nozzlePrice);
      if (Number.isFinite(cfg.nozzleLifeHours)) setNozzleLifeHours(cfg.nozzleLifeHours);
      if (Number.isFinite(cfg.platePrice)) setPlatePrice(cfg.platePrice);
      if (Number.isFinite(cfg.plateLifeHours)) setPlateLifeHours(cfg.plateLifeHours);
      if (Number.isFinite(cfg.beltsPrice)) setBeltsPrice(cfg.beltsPrice);
      if (Number.isFinite(cfg.beltsLifeHours)) setBeltsLifeHours(cfg.beltsLifeHours);
      if (Number.isFinite(cfg.maintPerHour)) setMaintPerHour(cfg.maintPerHour);
      if (Number.isFinite(cfg.kwhCost)) setKwhCost(cfg.kwhCost);
      if (Number.isFinite(cfg.steadyPower)) setSteadyPower(cfg.steadyPower);
      if (Number.isFinite(cfg.startupPower)) setStartupPower(cfg.startupPower);
      if (Number.isFinite(cfg.startupMinutes)) setStartupMinutes(cfg.startupMinutes);
      if (Number.isFinite(cfg.laborRate)) setLaborRate(cfg.laborRate);
      if (Number.isFinite(cfg.wholesaleMarkup)) setWholesaleMarkup(cfg.wholesaleMarkup);
      if (Number.isFinite(cfg.retailMarkup)) setRetailMarkup(cfg.retailMarkup);
      if (Number.isFinite(cfg.minPrice)) setMinPrice(cfg.minPrice);
      if (cfg.markupMode === "mult" || cfg.markupMode === "pct") setMarkupMode(cfg.markupMode);
    } catch {
      // ignore corrupt config
    }
  }, []);

  // --- Load central pricing config from Firestore (admin é a fonte de verdade) ---
  // Sobrescreve os defaults/localStorage: energia, markups, falha e material.
  useEffect(() => {
    getDoc(doc(db, "settings", "pricing")).then((snap) => {
      if (!snap.exists()) return;
      const cfg = mergePricingSettings(snap.data());
      setMaterialSettings(cfg.materials);
      setKwhCost(cfg.kwhCost);
      setStartupPower(cfg.startupPowerWatts);
      setStartupMinutes(cfg.startupMinutes);
      setFailureRatePct(cfg.failureRatePct);
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

  // --- Persist business config to localStorage (not per-job fields) ---
  useEffect(() => {
    try {
      localStorage.setItem(
        CONFIG_KEY,
        JSON.stringify({
          material, spoolPrice, spoolWeight, reservePct, failureRatePct,
          machinePrice, lifespanHours, nozzlePrice, nozzleLifeHours,
          platePrice, plateLifeHours, beltsPrice, beltsLifeHours, maintPerHour,
          kwhCost, steadyPower, startupPower, startupMinutes,
          laborRate, wholesaleMarkup, retailMarkup, minPrice, markupMode,
        }),
      );
    } catch {
      // ignore storage failures (private mode, quota)
    }
  }, [
    material, spoolPrice, spoolWeight, reservePct, failureRatePct,
    machinePrice, lifespanHours, nozzlePrice, nozzleLifeHours,
    platePrice, plateLifeHours, beltsPrice, beltsLifeHours, maintPerHour,
    kwhCost, steadyPower, startupPower, startupMinutes,
    laborRate, wholesaleMarkup, retailMarkup, minPrice, markupMode,
  ]);

  // --- Computed values ---
  const machineBreak = machineHourBreakdown({
    price: machinePrice, lifespanHours,
    nozzlePrice, nozzleLifeHours,
    platePrice, plateLifeHours,
    beltsPrice, beltsLifeHours,
    maintPerHour,
  });

  const result = useMemo(
    () =>
      computePricing({
        material, spoolPrice, spoolWeight,
        steadyPowerWatts: steadyPower,
        weightGrams: slicerWeight,
        hours: printTime,
        quantity: batchQuantity,
        reservePct, failureRatePct, kwhCost,
        startupPowerWatts: startupPower, startupMinutes,
        machine: {
          price: machinePrice, lifespanHours,
          nozzlePrice, nozzleLifeHours,
          platePrice, plateLifeHours,
          beltsPrice, beltsLifeHours, maintPerHour,
        },
        laborHours: requiresLabor ? laborHours : 0,
        laborRate,
        extraSupplies: requiresLabor ? extraSupplies : 0,
        wholesaleMarkup, retailMarkup, minPrice,
      }),
    [
      material, spoolPrice, spoolWeight, steadyPower, slicerWeight, printTime,
      batchQuantity, reservePct, failureRatePct, kwhCost, startupPower, startupMinutes,
      machinePrice, lifespanHours, nozzlePrice, nozzleLifeHours,
      platePrice, plateLifeHours, beltsPrice, beltsLifeHours, maintPerHour,
      requiresLabor, laborHours, laborRate, extraSupplies,
      wholesaleMarkup, retailMarkup, minPrice,
    ],
  );

  const reserveMultiplier = 1 + Math.max(0, reservePct) / 100;
  const laborTotal = result.laborCost + result.extraSupplies;
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
    setSavingCalc(true);
    try {
      await saveQuoteFromCalc({
        clientName,
        phone: clientPhone,
        pieceName: saveLabel,
        materialLabel: MATERIAL_PRESETS[material].label,
        weight: slicerWeight,
        printTime: printTimeStr,
        quantity: batchQuantity,
        price: result.retailTotal,
        unitPrice: result.retailUnit,
        costTotal: result.totalCost,
        imageUrl: quoteImageUrl || undefined,
        notes: `Custo real ${result.totalCost.toFixed(2)} · atacado ${result.wholesaleTotal.toFixed(2)} · varejo ${result.retailTotal.toFixed(2)} · ${MATERIAL_PRESETS[material].label} ${slicerWeight}g · ${printTimeStr}`,
      });
      toast.success("Orçamento salvo na aba Orçamentos!", { duration: 2800, position: "bottom-center" });
      setSaveLabel("");
      setClientName("");
      setClientPhone("");
      setQuoteImageUrl("");
    } catch {
      toast.error("Erro ao salvar. É preciso estar logado como admin.", { position: "bottom-center" });
    } finally {
      setSavingCalc(false);
    }
  };

  return {
    // material
    material, spoolPrice, setSpoolPrice, spoolWeight, setSpoolWeight,
    slicerWeight, setSlicerWeight, reservePct, setReservePct,
    failureRatePct, setFailureRatePct, batchQuantity, setBatchQuantity,
    selectMaterial, materialSettings,
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
    savingCalc, saveLabel, setSaveLabel, handleSaveCalc,
    clientName, setClientName, clientPhone, setClientPhone,
    quoteImageUrl, setQuoteImageUrl, uploadingImage, handleUploadImage,
    // computed
    result, machineBreak, reserveMultiplier, laborTotal, generatedAt,
  };
}

export { safeNumber };

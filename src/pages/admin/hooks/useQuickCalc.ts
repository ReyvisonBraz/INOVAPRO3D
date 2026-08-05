import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_PRICING_SETTINGS,
  machineHourBreakdown,
  formatHoursToHHMM,
  type MaterialKey,
  type MachineConfig,
  type PricingSettings,
} from "../../../lib/pricing";
import {
  computeProjectPricing,
  createEmptyPlate,
  validateCalculatorProject,
  type CalculatorProject,
} from "../../../lib/calculatorProject";
import type { Material, MaterialUsage } from "../../../types/domain";
import { saveQuoteFromCalc, uploadQuoteImage } from "../../../lib/quotes";
import { buildCommercialQuoteMessage } from "../../../lib/quoteMessage";

/**
 * Calculadora rápida de orçamento do admin: entradas, resultado do motor de
 * preços e envio da proposta por WhatsApp.
 *
 * Os parâmetros de NEGÓCIO (energia, markups, preço mínimo, taxa de falha e
 * preços de material) vêm de `pricingSettings` — a mesma fonte usada pela
 * calculadora pública. Assim as duas calculadoras dão sempre o mesmo preço.
 */
export function useQuickCalc(
  machineConfig: MachineConfig,
  pricingSettings: PricingSettings = DEFAULT_PRICING_SETTINGS,
  _inventoryMaterials: Material[] = [],
  onSaved?: () => void,
) {
  const [quickProject, setQuickProject] = useState<CalculatorProject>({
    name: "",
    outputQuantity: 1,
    plates: [createEmptyPlate(1)],
  });
  const [quickProjectIssues, setQuickProjectIssues] = useState<
    ReturnType<typeof validateCalculatorProject>
  >([]);
  const [quickCalcWeight, setQuickCalcWeight] = useState(80);
  const [quickCalcTime, setQuickCalcTime] = useState("2h 30m");
  const [quickCalcPhone, setQuickCalcPhone] = useState("");
  const [quickCalcCustomerName, setQuickCalcCustomerName] = useState("");
  const [quickCalcPieceName, setQuickCalcPieceName] = useState("");
  const [quickCalcBatchQty, setQuickCalcBatchQty] = useState(1);
  const [quickCalcMaterial, setQuickCalcMaterial] = useState<MaterialKey>("pla");
  const [quickMaterialUsages, setQuickMaterialUsages] = useState<MaterialUsage[]>([]);

  // Imagem opcional do produto + salvamento do orçamento na aba Orçamentos.
  const [quickCalcImageUrl, setQuickCalcImageUrl] = useState("");
  const [quickCalcUploadingImage, setQuickCalcUploadingImage] = useState(false);
  const [quickCalcSaving, setQuickCalcSaving] = useState(false);

  // Valores de negócio: iniciam dos parâmetros centrais, editáveis por job.
  const [quickCalcMaterialReserve, setQuickCalcMaterialReserve] = useState(
    pricingSettings.materials.pla.defaultReservePct,
  );
  const [quickCalcFailureRate, setQuickCalcFailureRate] = useState(0);
  const [quickCalcMinPrice, setQuickCalcMinPrice] = useState(pricingSettings.minPrice);
  const [quickCalcWholesaleMarkup, setQuickCalcWholesaleMarkup] = useState(
    pricingSettings.wholesaleMarkup,
  );
  const [quickCalcRetailMarkup, setQuickCalcRetailMarkup] = useState(pricingSettings.retailMarkup);

  // Quando os parâmetros centrais carregam/mudam, o quick calc os adota.
  useEffect(() => {
    setQuickCalcMinPrice(pricingSettings.minPrice);
    setQuickCalcWholesaleMarkup(pricingSettings.wholesaleMarkup);
    setQuickCalcRetailMarkup(pricingSettings.retailMarkup);
    setQuickCalcMaterialReserve(pricingSettings.materials[quickCalcMaterial].defaultReservePct);
  }, [
    pricingSettings.minPrice,
    pricingSettings.wholesaleMarkup,
    pricingSettings.retailMarkup,
    pricingSettings.materials,
    quickCalcMaterial,
  ]);

  // Trocar o material ajusta a reserva sugerida para o preset daquele material.
  const selectQuickMaterial = useCallback(
    (key: MaterialKey) => {
      setQuickCalcMaterial(key);
      setQuickCalcMaterialReserve(pricingSettings.materials[key].defaultReservePct);
    },
    [pricingSettings],
  );

  const quickMachine = machineConfig;
  const quickProjectPricing = useMemo(
    () =>
      computeProjectPricing(
        quickProject,
        quickMachine,
        { ...pricingSettings, failureRatePct: quickCalcFailureRate },
        {
          laborHours: 0,
          laborRate: 0,
          extraSupplies: 0,
          packagingCost: 0,
          wholesaleMarkup: quickCalcWholesaleMarkup,
          retailMarkup: quickCalcRetailMarkup,
          minPrice: quickCalcMinPrice,
        },
      ),
    [
      quickProject,
      quickMachine,
      pricingSettings,
      quickCalcFailureRate,
      quickCalcWholesaleMarkup,
      quickCalcRetailMarkup,
      quickCalcMinPrice,
    ],
  );
  const quickCalcResult = quickProjectPricing.result;
  const quickMachineBreak = useMemo(() => machineHourBreakdown(quickMachine), [quickMachine]);

  const handleSendQuickWhatsAppQuote = useCallback(() => {
    const phoneClean = quickCalcPhone.replace(/\D/g, "");
    if (!phoneClean) {
      toast.error("Preencha o WhatsApp do cliente.");
      return;
    }
    const clientName = quickCalcCustomerName || "Cliente";
    const pieceName = quickProject.name || quickCalcPieceName || "Peça personalizada";
    const text = buildCommercialQuoteMessage({
      customerName: clientName,
      projectName: pieceName,
      quantity: quickCalcResult.quantity,
      total: quickCalcResult.retailTotal,
    });
    window.open(
      `https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodeURIComponent(text)}`,
      "_blank",
    );
  }, [quickCalcPhone, quickCalcCustomerName, quickCalcPieceName, quickProject, quickCalcResult]);

  const handleUploadQuickImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 8 MB).");
      return;
    }
    setQuickCalcUploadingImage(true);
    try {
      const url = await uploadQuoteImage(file);
      setQuickCalcImageUrl(url);
      toast.success("Imagem anexada ao orçamento.");
    } catch (err) {
      console.error("[quote-image-upload]", err);
      const code = (err as { code?: string })?.code || "";
      if (code === "storage/unauthenticated") {
        toast.error("Sessão expirada. Faça login novamente.");
      } else if (code === "storage/unauthorized") {
        toast.error(
          "Upload bloqueado: publique as regras do Storage (firebase deploy --only storage).",
          { duration: 5000 },
        );
      } else {
        toast.error("Falha ao enviar a imagem.");
      }
    } finally {
      setQuickCalcUploadingImage(false);
    }
  }, []);

  const handleSaveQuickQuote = useCallback(async () => {
    if (!quickCalcCustomerName.trim()) {
      toast.error("Informe o nome do cliente para salvar.");
      return;
    }
    const issues = validateCalculatorProject(quickProject);
    setQuickProjectIssues(issues);
    if (issues.length) {
      toast.error(issues[0].message);
      return;
    }
    const predictedUsages: MaterialUsage[] = quickProject.plates.flatMap((plate) =>
      plate.filaments.map((filament) => ({
        materialId: filament.materialId || `manual:${filament.id}`,
        materialName: filament.materialName,
        plateId: plate.id,
        plateName: plate.name,
        inventoryTracked: Boolean(filament.materialId),
        ...(filament.manual
          ? {
              manualColor: filament.manual.color,
              manualBrand: filament.manual.brand,
              manualType: filament.manual.type,
              pricePerKg: filament.manual.pricePerKg,
            }
          : {}),
        estimatedGrams: filament.totalGrams * Math.max(1, plate.repetitions),
      })),
    );
    setQuickCalcSaving(true);
    try {
      await saveQuoteFromCalc({
        clientName: quickCalcCustomerName,
        phone: quickCalcPhone,
        pieceName: quickProject.name || quickCalcPieceName,
        materialLabel: quickProject.plates.some((plate) => plate.type === "MULTICOLOR")
          ? "Multicolor"
          : "Cor única",
        weight: quickCalcResult.weightGrams,
        printTime: formatHoursToHHMM(quickCalcResult.hours),
        quantity: quickCalcResult.quantity,
        price: quickCalcResult.retailTotal,
        unitPrice: quickCalcResult.retailUnit,
        costTotal: quickCalcResult.totalCost,
        imageUrl: quickCalcImageUrl || undefined,
        materialUsages: predictedUsages,
        calculationProject: quickProject,
        notes: `Custo previsto ${quickCalcResult.totalCost.toFixed(2)} · atacado ${quickCalcResult.wholesaleTotal.toFixed(2)} · varejo ${quickCalcResult.retailTotal.toFixed(2)} · ${quickProject.plates.length} bandeja(s) · ${quickCalcResult.weightGrams.toFixed(2)}g · ${formatHoursToHHMM(quickCalcResult.hours)}`,
      });
      toast.success("Orçamento salvo na aba Orçamentos!");
      setQuickCalcImageUrl("");
      setQuickProject({ name: "", outputQuantity: 1, plates: [createEmptyPlate(1)] });
      setQuickProjectIssues([]);
      onSaved?.();
    } catch {
      toast.error("Falha ao salvar o orçamento.");
    } finally {
      setQuickCalcSaving(false);
    }
  }, [
    quickCalcCustomerName,
    quickCalcPhone,
    quickCalcPieceName,
    quickProject,
    quickCalcResult,
    quickCalcImageUrl,
    onSaved,
  ]);

  return {
    quickProject,
    setQuickProject,
    quickProjectIssues,
    setQuickProjectIssues,
    quickProjectPricing,
    quickCalcWeight,
    setQuickCalcWeight,
    quickCalcTime,
    setQuickCalcTime,
    quickCalcPhone,
    setQuickCalcPhone,
    quickCalcCustomerName,
    setQuickCalcCustomerName,
    quickCalcPieceName,
    setQuickCalcPieceName,
    quickCalcBatchQty,
    setQuickCalcBatchQty,
    quickCalcMaterial,
    setQuickCalcMaterial,
    selectQuickMaterial,
    quickMaterialUsages,
    setQuickMaterialUsages,
    quickCalcMaterialReserve,
    setQuickCalcMaterialReserve,
    quickCalcFailureRate,
    setQuickCalcFailureRate,
    quickCalcMinPrice,
    setQuickCalcMinPrice,
    quickCalcWholesaleMarkup,
    setQuickCalcWholesaleMarkup,
    quickCalcRetailMarkup,
    setQuickCalcRetailMarkup,
    quickMachine,
    quickCalcResult,
    quickMachineBreak,
    handleSendQuickWhatsAppQuote,
    quickCalcImageUrl,
    setQuickCalcImageUrl,
    quickCalcUploadingImage,
    quickCalcSaving,
    handleUploadQuickImage,
    handleSaveQuickQuote,
  };
}

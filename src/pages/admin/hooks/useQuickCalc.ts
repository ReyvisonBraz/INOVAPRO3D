import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MATERIAL_PRESETS,
  DEFAULT_PRICING_SETTINGS,
  machineHourBreakdown,
  computePricing,
  formatBRL,
  parseTimeToHours,
  type MaterialKey,
  type MachineConfig,
  type PricingSettings,
} from "../../../lib/pricing";
import { saveQuoteFromCalc, uploadQuoteImage } from "../../../lib/quotes";

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
  onSaved?: () => void,
) {
  const [quickCalcWeight, setQuickCalcWeight] = useState(80);
  const [quickCalcTime, setQuickCalcTime] = useState("2h 30m");
  const [quickCalcPhone, setQuickCalcPhone] = useState("");
  const [quickCalcCustomerName, setQuickCalcCustomerName] = useState("");
  const [quickCalcPieceName, setQuickCalcPieceName] = useState("");
  const [quickCalcBatchQty, setQuickCalcBatchQty] = useState(1);
  const [quickCalcMaterial, setQuickCalcMaterial] = useState<MaterialKey>("pla");

  // Imagem opcional do produto + salvamento do orçamento na aba Orçamentos.
  const [quickCalcImageUrl, setQuickCalcImageUrl] = useState("");
  const [quickCalcUploadingImage, setQuickCalcUploadingImage] = useState(false);
  const [quickCalcSaving, setQuickCalcSaving] = useState(false);

  // Valores de negócio: iniciam dos parâmetros centrais, editáveis por job.
  const [quickCalcMaterialReserve, setQuickCalcMaterialReserve] = useState(
    pricingSettings.materials.pla.defaultReservePct,
  );
  const [quickCalcFailureRate, setQuickCalcFailureRate] = useState(pricingSettings.failureRatePct);
  const [quickCalcMinPrice, setQuickCalcMinPrice] = useState(pricingSettings.minPrice);
  const [quickCalcWholesaleMarkup, setQuickCalcWholesaleMarkup] = useState(pricingSettings.wholesaleMarkup);
  const [quickCalcRetailMarkup, setQuickCalcRetailMarkup] = useState(pricingSettings.retailMarkup);

  // Quando os parâmetros centrais carregam/mudam, o quick calc os adota.
  useEffect(() => {
    setQuickCalcFailureRate(pricingSettings.failureRatePct);
    setQuickCalcMinPrice(pricingSettings.minPrice);
    setQuickCalcWholesaleMarkup(pricingSettings.wholesaleMarkup);
    setQuickCalcRetailMarkup(pricingSettings.retailMarkup);
  }, [
    pricingSettings.failureRatePct,
    pricingSettings.minPrice,
    pricingSettings.wholesaleMarkup,
    pricingSettings.retailMarkup,
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
  const quickCalcResult = useMemo(() => {
    const mat = pricingSettings.materials[quickCalcMaterial];
    return computePricing({
      material: quickCalcMaterial,
      spoolPrice: mat.spoolPrice,
      spoolWeight: mat.spoolWeight,
      steadyPowerWatts: mat.steadyPowerWatts,
      weightGrams: Math.max(0, Number(quickCalcWeight) || 0),
      hours: Math.max(0, parseTimeToHours(quickCalcTime)),
      quantity: Math.max(1, Math.floor(Number(quickCalcBatchQty) || 1)),
      reservePct: Math.max(0, Number(quickCalcMaterialReserve) || 0),
      failureRatePct: Math.max(0, Number(quickCalcFailureRate) || 0),
      kwhCost: pricingSettings.kwhCost,
      startupPowerWatts: pricingSettings.startupPowerWatts,
      startupMinutes: pricingSettings.startupMinutes,
      machine: quickMachine, laborHours: 0, laborRate: 0, extraSupplies: 0,
      wholesaleMarkup: Math.max(0, Number(quickCalcWholesaleMarkup) || 0),
      retailMarkup: Math.max(0, Number(quickCalcRetailMarkup) || 0),
      minPrice: Math.max(0, Number(quickCalcMinPrice) || 0),
    });
  }, [quickCalcMaterial, quickCalcWeight, quickCalcTime, quickCalcBatchQty, quickCalcMaterialReserve, quickCalcFailureRate, quickCalcWholesaleMarkup, quickCalcRetailMarkup, quickCalcMinPrice, quickMachine, pricingSettings]);
  const quickMachineBreak = useMemo(() => machineHourBreakdown(quickMachine), [quickMachine]);

  const handleSendQuickWhatsAppQuote = useCallback(() => {
    const phoneClean = quickCalcPhone.replace(/\D/g, "");
    if (!phoneClean) { toast.error("Preencha o WhatsApp do cliente."); return; }
    const clientName = quickCalcCustomerName || "Cliente";
    const pieceName = quickCalcPieceName || "Peça personalizada";
    const text = `Olá, *${clientName}*!\n\nSeu orçamento de manufatura 3D para o projeto *${pieceName}* foi gerado pela *INOVAPRO3D*.\n\n*Especificações:*\n- Material: ${MATERIAL_PRESETS[quickCalcMaterial].label}\n- Quantidade: ${quickCalcResult.quantity} unidade(s)\n- Peso do job/lote: ${quickCalcResult.weightGrams.toFixed(1).replace(".", ",")}g\n- Tempo de impressão: ${quickCalcTime || "0h"} (${quickCalcResult.hours.toFixed(2).replace(".", ",")}h)\n\n*Investimento final (varejo):*\nTotal: ${formatBRL(quickCalcResult.retailTotal)}\nUnitário: ${formatBRL(quickCalcResult.retailUnit)}\n\nProposta baseada em cálculo técnico com material ${MATERIAL_PRESETS[quickCalcMaterial].label}, energia e hora-máquina P2S.`;
    window.open(`https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodeURIComponent(text)}`, "_blank");
  }, [quickCalcPhone, quickCalcCustomerName, quickCalcPieceName, quickCalcMaterial, quickCalcTime, quickCalcResult]);

  const handleUploadQuickImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 8 MB)."); return; }
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
        toast.error("Upload bloqueado: publique as regras do Storage (firebase deploy --only storage).", { duration: 5000 });
      } else {
        toast.error("Falha ao enviar a imagem.");
      }
    } finally {
      setQuickCalcUploadingImage(false);
    }
  }, []);

  const handleSaveQuickQuote = useCallback(async () => {
    if (!quickCalcCustomerName.trim()) { toast.error("Informe o nome do cliente para salvar."); return; }
    setQuickCalcSaving(true);
    try {
      await saveQuoteFromCalc({
        clientName: quickCalcCustomerName,
        phone: quickCalcPhone,
        pieceName: quickCalcPieceName,
        materialLabel: MATERIAL_PRESETS[quickCalcMaterial].label,
        weight: quickCalcResult.weightGrams,
        printTime: quickCalcTime,
        quantity: quickCalcResult.quantity,
        price: quickCalcResult.retailTotal,
        unitPrice: quickCalcResult.retailUnit,
        costTotal: quickCalcResult.totalCost,
        imageUrl: quickCalcImageUrl || undefined,
        notes: `Custo real ${quickCalcResult.totalCost.toFixed(2)} · atacado ${quickCalcResult.wholesaleTotal.toFixed(2)} · varejo ${quickCalcResult.retailTotal.toFixed(2)} · ${MATERIAL_PRESETS[quickCalcMaterial].label} ${quickCalcResult.weightGrams.toFixed(0)}g · ${quickCalcTime}`,
      });
      toast.success("Orçamento salvo na aba Orçamentos!");
      setQuickCalcImageUrl("");
      onSaved?.();
    } catch {
      toast.error("Falha ao salvar o orçamento.");
    } finally {
      setQuickCalcSaving(false);
    }
  }, [quickCalcCustomerName, quickCalcPhone, quickCalcPieceName, quickCalcMaterial, quickCalcTime, quickCalcResult, quickCalcImageUrl, onSaved]);

  return {
    quickCalcWeight, setQuickCalcWeight,
    quickCalcTime, setQuickCalcTime,
    quickCalcPhone, setQuickCalcPhone,
    quickCalcCustomerName, setQuickCalcCustomerName,
    quickCalcPieceName, setQuickCalcPieceName,
    quickCalcBatchQty, setQuickCalcBatchQty,
    quickCalcMaterial, setQuickCalcMaterial, selectQuickMaterial,
    quickCalcMaterialReserve, setQuickCalcMaterialReserve,
    quickCalcFailureRate, setQuickCalcFailureRate,
    quickCalcMinPrice, setQuickCalcMinPrice,
    quickCalcWholesaleMarkup, setQuickCalcWholesaleMarkup,
    quickCalcRetailMarkup, setQuickCalcRetailMarkup,
    quickMachine,
    quickCalcResult,
    quickMachineBreak,
    handleSendQuickWhatsAppQuote,
    quickCalcImageUrl, setQuickCalcImageUrl,
    quickCalcUploadingImage, quickCalcSaving,
    handleUploadQuickImage, handleSaveQuickQuote,
  };
}

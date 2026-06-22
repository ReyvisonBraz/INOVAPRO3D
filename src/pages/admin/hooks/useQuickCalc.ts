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
) {
  const [quickCalcWeight, setQuickCalcWeight] = useState(80);
  const [quickCalcTime, setQuickCalcTime] = useState("2h 30m");
  const [quickCalcPhone, setQuickCalcPhone] = useState("");
  const [quickCalcCustomerName, setQuickCalcCustomerName] = useState("");
  const [quickCalcPieceName, setQuickCalcPieceName] = useState("");
  const [quickCalcBatchQty, setQuickCalcBatchQty] = useState(1);
  const [quickCalcMaterial, setQuickCalcMaterial] = useState<MaterialKey>("pla");

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
  };
}

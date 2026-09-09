import { Package } from "lucide-react";
import { HELP } from "../../lib/pricing";
import { Reveal } from "../ui/Reveal";
import { CollapsibleSection, NumberField } from "./primitives";

interface CalculatorMaterialCostSectionProps {
  spoolPrice: number;
  spoolWeight: number;
  reservePct: number;
  failureRatePct: number;
  failureImpactPct: number;
  targetProfitPerMachineHour: number;
  open: boolean;
  onToggle: () => void;
  onSpoolPriceChange: (value: number) => void;
  onSpoolWeightChange: (value: number) => void;
  onReservePctChange: (value: number) => void;
  onFailureRatePctChange: (value: number) => void;
  onFailureImpactPctChange: (value: number) => void;
  onTargetProfitPerMachineHourChange: (value: number) => void;
}

export function CalculatorMaterialCostSection({
  spoolPrice,
  spoolWeight,
  reservePct,
  failureRatePct,
  failureImpactPct,
  targetProfitPerMachineHour,
  open,
  onToggle,
  onSpoolPriceChange,
  onSpoolWeightChange,
  onReservePctChange,
  onFailureRatePctChange,
  onFailureImpactPctChange,
  onTargetProfitPerMachineHourChange,
}: CalculatorMaterialCostSectionProps) {
  return (
    <Reveal delay={0.2}>
      <CollapsibleSection
        icon={Package}
        title="Filamento & Custos"
        summary={`reserva ${reservePct}% · falha ${failureRatePct}% · referência R$${spoolPrice}/rolo`}
        open={open}
        onToggle={onToggle}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Preço de referência do rolo"
            prefix="R$"
            value={spoolPrice}
            onChange={onSpoolPriceChange}
            step={0.01}
            help={HELP.spoolPrice}
          />
          <NumberField
            label="Peso do rolo de referência"
            suffix="g"
            value={spoolWeight}
            onChange={onSpoolWeightChange}
            min={1}
            help={HELP.spoolWeight}
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-white/40">
          Plano B: vale só para filamento{" "}
          <strong className="text-white/60">sem preço próprio</strong> — colado do slicer sem
          correspondência no estoque, ou material cadastrado sem custo por kg.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Margem técnica de material"
            suffix="%"
            value={reservePct}
            onChange={onReservePctChange}
            step={1}
            help={HELP.reserve}
          />
          <NumberField
            label="Taxa de falha"
            suffix="%"
            value={failureRatePct}
            onChange={onFailureRatePctChange}
            step={1}
            help={HELP.failureRate}
          />
          <NumberField
            label="Perda média quando falha"
            suffix="%"
            value={failureImpactPct}
            onChange={onFailureImpactPctChange}
            step={5}
            help={HELP.failureImpact}
          />
          <NumberField
            label="Meta por hora ocupada"
            prefix="R$"
            suffix="/h"
            value={targetProfitPerMachineHour}
            onChange={onTargetProfitPerMachineHourChange}
            step={1}
            help={HELP.targetProfitPerMachineHour}
          />
        </div>
        <div className="mt-5 rounded-xl border border-blue-400/20 bg-blue-400/[0.05] p-4 text-xs leading-relaxed text-white/50">
          O custo do material vem de cada bandeja, com o preço do filamento escolhido no estoque ou
          informado à mão — não dos campos acima. Filamentos manuais entram no custo previsto, mas
          não movimentam o estoque.
        </div>
      </CollapsibleSection>
    </Reveal>
  );
}

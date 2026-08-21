import { Wrench } from "lucide-react";
import { formatBRL, HELP } from "../../lib/pricing";
import { Reveal } from "../ui/Reveal";
import { CollapsibleSection, NumberField, Toggle } from "./primitives";

interface CalculatorLaborSectionProps {
  requiresLabor: boolean;
  laborTotal: number;
  laborHours: number;
  laborRate: number;
  extraSupplies: number;
  packagingCost: number;
  open: boolean;
  onToggle: () => void;
  onRequiresLaborChange: (value: boolean) => void;
  onLaborHoursChange: (value: number) => void;
  onLaborRateChange: (value: number) => void;
  onExtraSuppliesChange: (value: number) => void;
  onPackagingCostChange: (value: number) => void;
}

export function CalculatorLaborSection({
  requiresLabor,
  laborTotal,
  laborHours,
  laborRate,
  extraSupplies,
  packagingCost,
  open,
  onToggle,
  onRequiresLaborChange,
  onLaborHoursChange,
  onLaborRateChange,
  onExtraSuppliesChange,
  onPackagingCostChange,
}: CalculatorLaborSectionProps) {
  return (
    <Reveal delay={0.4}>
      <CollapsibleSection
        icon={Wrench}
        title="Mão de Obra & Insumos"
        summary={requiresLabor ? `${formatBRL(laborTotal)} computados` : "Não computada"}
        open={open}
        onToggle={onToggle}
      >
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-white/90">
              Tem trabalho manual / pós-processamento?
            </p>
            <p className="mt-1 text-xs text-white/40">
              Ative para computar fatiar, tirar suportes, lixar, pintar, montar e embalar.
            </p>
          </div>
          <Toggle checked={requiresLabor} onChange={onRequiresLaborChange} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="Horas de trabalho"
            suffix="h"
            value={laborHours}
            onChange={onLaborHoursChange}
            step={0.25}
            disabled={!requiresLabor}
            help={HELP.laborHours}
          />
          <NumberField
            label="Valor da sua hora"
            prefix="R$"
            value={laborRate}
            onChange={onLaborRateChange}
            step={1}
            help={HELP.laborRate}
          />
          <NumberField
            label="Insumos extras"
            prefix="R$"
            value={extraSupplies}
            onChange={onExtraSuppliesChange}
            step={0.01}
            help={HELP.extraSupplies}
          />
          <NumberField
            label="Embalagem"
            prefix="R$"
            value={packagingCost}
            onChange={onPackagingCostChange}
            step={0.5}
            help="Caixa ou envelope, proteção, etiqueta, fita e demais itens usados para entregar o pedido."
          />
        </div>
      </CollapsibleSection>
    </Reveal>
  );
}

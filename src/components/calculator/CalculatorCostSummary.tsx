import { HELP, type PricingResult } from "../../lib/pricing";
import { CostBar, HelpTip } from "./primitives";

const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

interface CalculatorCostSummaryProps {
  result: PricingResult;
  laborTotal: number;
}

export function CalculatorCostSummary({ result, laborTotal }: CalculatorCostSummaryProps) {
  return (
    <>
      <div className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
            Custo real de produção
            <HelpTip text={HELP.totalCost} />
          </p>
          <div className="mt-3 flex items-start gap-2">
            <span className="mt-2 text-xl font-black text-white/40">R$</span>
            <span className="text-5xl font-black tracking-tight text-white sm:text-6xl">
              {result.totalCost.toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-right">
          <p className="flex items-center justify-end gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
            Por grama
            <HelpTip text={HELP.costPerGram} />
          </p>
          <p className="mt-1 font-mono text-xl font-black text-cyan-300">
            R$ {decimal.format(result.costPerGram)}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <CostBar
          label="Material"
          value={result.materialCost}
          percent={result.shares.material}
          color="bg-cyan-400"
          help={HELP.spoolPrice}
        />
        <CostBar
          label="Energia"
          value={result.energyCost}
          percent={result.shares.energy}
          color="bg-orange-400"
          help={HELP.kwh}
        />
        <CostBar
          label="Máquina"
          value={result.machineCost}
          percent={result.shares.machine}
          color="bg-primary"
          help={HELP.depreciation}
        />
        <CostBar
          label="Mão de obra"
          value={laborTotal}
          percent={result.shares.labor}
          color="bg-white/40"
          help={HELP.laborHours}
        />
        {result.failureLoss > 0 && (
          <CostBar
            label="Falhas"
            value={result.failureLoss}
            percent={result.shares.failure}
            color="bg-amber-400"
            help={HELP.failureRate}
          />
        )}
      </div>
    </>
  );
}

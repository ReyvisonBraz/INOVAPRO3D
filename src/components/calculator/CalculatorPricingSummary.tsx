import { Coins } from "lucide-react";
import { HELP, type PricingResult } from "../../lib/pricing";
import { HelpTip, NumberField, PriceBox, ProfitLine } from "./primitives";

interface CalculatorPricingSummaryProps {
  result: PricingResult;
  markupMode: "mult" | "pct";
  wholesaleDisplay: number;
  retailDisplay: number;
  wholesaleLabel: string;
  retailLabel: string;
  minPrice: number;
  onMarkupModeChange: (mode: "mult" | "pct") => void;
  onWholesaleMarkupChange: (value: number) => void;
  onRetailMarkupChange: (value: number) => void;
  onMinPriceChange: (value: number) => void;
}

export function CalculatorPricingSummary({
  result,
  markupMode,
  wholesaleDisplay,
  retailDisplay,
  wholesaleLabel,
  retailLabel,
  minPrice,
  onMarkupModeChange,
  onWholesaleMarkupChange,
  onRetailMarkupChange,
  onMinPriceChange,
}: CalculatorPricingSummaryProps) {
  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-cyan-300" />
          <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.22em] text-white/90">
            Preço de venda & lucro
            <HelpTip text={HELP.sellPrice} />
          </h3>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-white/15 bg-white/[0.04] p-0.5">
          <button
            onClick={() => onMarkupModeChange("mult")}
            className={`rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${markupMode === "mult" ? "bg-cyan-500/30 text-cyan-200" : "text-white/40 hover:text-white/70"}`}
          >
            ×
          </button>
          <button
            onClick={() => onMarkupModeChange("pct")}
            className={`rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${markupMode === "pct" ? "bg-cyan-500/30 text-cyan-200" : "text-white/40 hover:text-white/70"}`}
          >
            %
          </button>
        </div>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <NumberField
          label={markupMode === "pct" ? "Atacado %" : "Atacado ×"}
          value={wholesaleDisplay}
          onChange={onWholesaleMarkupChange}
          step={markupMode === "pct" ? 5 : 0.1}
          help={HELP.wholesale}
        />
        <NumberField
          label={markupMode === "pct" ? "Varejo %" : "Varejo ×"}
          value={retailDisplay}
          onChange={onRetailMarkupChange}
          step={markupMode === "pct" ? 5 : 0.1}
          help={HELP.retail}
        />
        <NumberField
          label="Preço mínimo"
          prefix="R$"
          value={minPrice}
          onChange={onMinPriceChange}
          step={1}
          help={HELP.minPrice}
        />
      </div>
      <div className="grid gap-4">
        <div>
          <PriceBox
            title={`Atacado (${wholesaleLabel})`}
            description="Ideal para cliente que revende ou fecha lote recorrente."
            total={result.wholesaleTotal}
            unit={result.wholesaleUnit}
            tone="wholesale"
          />
          <ProfitLine
            profit={result.profitWholesale}
            marginPct={result.profitWholesalePct}
            markupPct={result.profitWholesaleMarkupPct}
          />
          {result.isBelowMinWholesale && (
            <p className="mt-1 px-1 text-[10px] font-bold text-yellow-300">preço mínimo aplicado</p>
          )}
        </div>
        <div>
          <PriceBox
            title={`Varejo (${retailLabel})`}
            description="Ideal para venda direta ao cliente final, sob demanda."
            total={result.retailTotal}
            unit={result.retailUnit}
            tone="retail"
          />
          <ProfitLine
            profit={result.profitRetail}
            marginPct={result.profitRetailPct}
            markupPct={result.profitRetailMarkupPct}
          />
          {result.isBelowMinRetail && (
            <p className="mt-1 px-1 text-[10px] font-bold text-yellow-300">preço mínimo aplicado</p>
          )}
        </div>
      </div>
    </div>
  );
}

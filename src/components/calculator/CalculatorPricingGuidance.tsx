import { AlertTriangle } from "lucide-react";
import { formatBRL, formatHoursToHHMM, type PricingResult } from "../../lib/pricing";

interface CalculatorPricingGuidanceProps {
  result: PricingResult;
  priceTier: "RETAIL" | "WHOLESALE";
  comfortableDiscountPct: number;
  comfortableOffer: number;
  maximumSafeDiscountPct: number;
  negotiationFloor: number;
  selectedReprintProfit: number;
}

export function CalculatorPricingGuidance({
  result,
  priceTier,
  comfortableDiscountPct,
  comfortableOffer,
  maximumSafeDiscountPct,
  negotiationFloor,
  selectedReprintProfit,
}: CalculatorPricingGuidanceProps) {
  return (
    <>
      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] font-black uppercase tracking-wider text-white/60">
            Piso sustentável
          </p>
          <p className="mt-1 text-lg font-black text-white">
            {formatBRL(result.minimumSustainablePrice)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Menor valor recomendado: custo real de {formatBRL(result.totalCost)} mais{" "}
            {formatBRL(result.capacityContributionTarget)} pela ocupação da máquina
            {result.hours > 0 ? ` durante ${formatHoursToHHMM(result.hours)}` : ""}.
          </p>
        </div>
        <div className="rounded-xl border border-blue-400/25 bg-blue-400/[0.06] p-4">
          <p className="text-[11px] font-black uppercase tracking-wider text-blue-200/80">
            Faixa de negociação
          </p>
          <p className="mt-1 text-lg font-black text-blue-200">
            {comfortableDiscountPct > 0
              ? `Pode oferecer ${formatBRL(comfortableOffer)}`
              : priceTier === "WHOLESALE"
                ? "Atacado já negociado"
                : "Mantenha o preço sugerido"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {priceTier === "WHOLESALE"
              ? "Evite desconto adicional sem rever quantidade e custos."
              : `Desconto confortável de ${comfortableDiscountPct.toFixed(1)}%. Limite máximo seguro: ${maximumSafeDiscountPct.toFixed(1)}%, nunca abaixo de ${formatBRL(negotiationFloor)}.`}
          </p>
        </div>
        <div
          className={`rounded-xl border p-4 ${selectedReprintProfit >= 0 ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-red-400/25 bg-red-400/[0.06]"}`}
        >
          <p className="text-[11px] font-black uppercase tracking-wider text-white/60">
            Se houver uma reimpressão completa
          </p>
          <p
            className={`mt-1 text-lg font-black ${selectedReprintProfit >= 0 ? "text-emerald-300" : "text-red-300"}`}
          >
            {selectedReprintProfit >= 0 ? "Ainda sobra " : "Prejuízo de "}
            {formatBRL(Math.abs(selectedReprintProfit))}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {selectedReprintProfit >= 0
              ? "O preço escolhido suporta uma reimpressão completa."
              : "Não ofereça desconto; revise o preço ou a provisão de falha."}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-yellow-400/35 bg-yellow-400/10 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
          <p className="text-xs font-semibold leading-relaxed text-yellow-100/80">
            Cálculo transparente: depreciação real da máquina diluída na vida útil, fundo de
            reposição de bico, placa e correias, energia com pico de aquecimento e sua mão de obra.
            Passe o mouse nos &quot;?&quot; para entender cada campo.
          </p>
        </div>
      </div>
    </>
  );
}

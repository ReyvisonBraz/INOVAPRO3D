import { Calculator } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { formatBRL, type PricingResult } from "../../../lib/pricing";

interface AdminQuotePricingAssistantProps {
  isOpen: boolean;
  result: PricingResult;
  onToggle: () => void;
  onApplySuggestedPrice: (price: number) => void;
}

export function AdminQuotePricingAssistant({
  isOpen,
  result,
  onToggle,
  onApplySuggestedPrice,
}: AdminQuotePricingAssistantProps) {
  const handleApply = () => {
    const suggestedPrice = result.retailTotal;
    onApplySuggestedPrice(Number(suggestedPrice.toFixed(2)));
    toast.success(`${formatBRL(suggestedPrice)} aplicado pelo motor unificado!`);
  };

  return (
    <section className="quote-editor-assistant rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <span className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-widest text-primary">
          <Calculator className="w-4 h-4" /> Assistente de Precificação
        </span>
        <span className="text-[11px] text-white/35 font-mono whitespace-nowrap">
          {isOpen ? "Fechar ▲" : "Abrir ▼"}
        </span>
      </button>
      {isOpen && (
        <div className="mt-5 border-t border-white/10 pt-5 space-y-4">
          <p className="text-sm text-white/50 leading-relaxed">
            Preço calculado com os mesmos parâmetros centrais de material, energia, máquina, falhas,
            embalagem, contribuição por hora e piso mínimo.
          </p>
          <div className="rounded-2xl border border-white/10 bg-[#0C0E14] p-5 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2 flex justify-between items-center">
              <span>Demonstrativo do Cálculo</span>
              <span className="text-primary font-mono">{result.hours.toFixed(2)}h</span>
            </h4>
            {(
              [
                ["Material", result.materialCost],
                ["Energia", result.energyCost],
                ["Máquina", result.machineCost],
                ["Falhas + embalagem", result.failureLoss + result.packagingCost],
                ["Custo real", result.totalCost],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm text-white/70">
                <span>{label}</span>
                <span className="font-mono">{formatBRL(value)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-black uppercase text-white border-t border-white/10 pt-2.5">
              <span>Preço sugerido (varejo)</span>
              <span className="text-primary font-mono select-all">
                {formatBRL(result.retailTotal)}
              </span>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleApply}
            className="w-full h-11 rounded-xl bg-primary text-sm font-bold uppercase tracking-wider text-white"
          >
            Aplicar Preço Sugerido
          </Button>
        </div>
      )}
    </section>
  );
}

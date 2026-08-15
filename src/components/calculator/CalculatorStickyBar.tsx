import { useEffect, useState } from "react";
import { ChevronUp, X } from "lucide-react";
import { formatBRL, type PricingResult } from "../../lib/pricing";

interface CalculatorStickyBarProps {
  result: PricingResult;
  tier: "RETAIL" | "WHOLESALE";
  onReview: () => void;
}

export function CalculatorStickyBar({ result, tier, onReview }: CalculatorStickyBarProps) {
  const [open, setOpen] = useState(false);
  const sale = tier === "WHOLESALE" ? result.wholesaleTotal : result.retailTotal;
  const profit = tier === "WHOLESALE" ? result.profitWholesale : result.profitRetail;
  const margin = tier === "WHOLESALE" ? result.profitWholesalePct : result.profitRetailPct;

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-[8990] bg-black/70 backdrop-blur-sm xl:hidden"
          onClick={() => setOpen(false)}
          aria-label="Fechar resumo financeiro"
        />
      )}
      {open && (
        <section
          className="fixed inset-x-0 bottom-0 z-[9001] rounded-t-3xl border border-white/10 bg-[#10151f] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Resumo financeiro"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-white/40">
                Resumo do projeto
              </p>
              <h2 className="mt-1 text-lg font-black text-white">
                {tier === "WHOLESALE" ? "Preço de atacado" : "Preço de varejo"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/60"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <dt className="text-xs text-white/45">Custo previsto</dt>
              <dd className="mt-1 font-mono font-black text-white">
                {formatBRL(result.totalCost)}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <dt className="text-xs text-white/45">Venda</dt>
              <dd className="mt-1 font-mono font-black text-blue-200">{formatBRL(sale)}</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <dt className="text-xs text-white/45">Lucro</dt>
              <dd className="mt-1 font-mono font-black text-emerald-300">{formatBRL(profit)}</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <dt className="text-xs text-white/45">Margem</dt>
              <dd className="mt-1 font-mono font-black text-emerald-300">{margin.toFixed(1)}%</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onReview();
            }}
            className="mt-4 min-h-12 w-full rounded-xl bg-blue-600 px-4 text-sm font-black text-white"
          >
            Revisar e salvar
          </button>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-[8999] border-t border-white/10 bg-[#0c111b]/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-16px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl xl:hidden print:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mb-2 flex w-full items-center justify-between px-1 text-left"
          aria-expanded={open}
        >
          <span className="text-xs text-white/55">
            Custo <strong className="font-mono text-white">{formatBRL(result.totalCost)}</strong>
          </span>
          <span className="text-xs text-white/55">
            Venda <strong className="font-mono text-blue-200">{formatBRL(sale)}</strong>
          </span>
          <ChevronUp className="h-4 w-4 text-white/45" />
        </button>
        <button
          type="button"
          onClick={onReview}
          className="min-h-11 w-full rounded-xl bg-blue-600 px-4 text-xs font-black uppercase tracking-wider text-white"
        >
          Revisar e salvar
        </button>
      </div>
    </>
  );
}

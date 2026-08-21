import { Download, Factory } from "lucide-react";

interface CalculatorPrintActionsProps {
  onPrintClient: () => void;
  onPrintProduction: () => void;
}

export function CalculatorPrintActions({
  onPrintClient,
  onPrintProduction,
}: CalculatorPrintActionsProps) {
  return (
    <>
      <button
        type="button"
        onClick={onPrintClient}
        className="mt-5 inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary px-5 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-primary-dark hover:shadow-[0_0_30px_rgba(37,99,235,0.25)] active:scale-[0.99]"
      >
        <Download className="h-4 w-4" />
        Gerar proposta do cliente
      </button>
      <button
        type="button"
        onClick={onPrintProduction}
        className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-[0.14em] text-white/60 transition hover:border-white/30 hover:text-white"
      >
        <Factory className="h-4 w-4" /> Ficha interna de produção
      </button>
    </>
  );
}

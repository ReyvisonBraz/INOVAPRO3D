import type { ReactNode } from "react";
import { Save } from "lucide-react";
import { HelpTip } from "./primitives";

interface CalculatorSaveReviewSectionProps {
  children: ReactNode;
}

export function CalculatorSaveReviewSection({ children }: CalculatorSaveReviewSectionProps) {
  return (
    <div
      id="calculator-save-review"
      className="mt-4 scroll-mt-24 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Save className="h-4 w-4 text-emerald-300" />
        <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-white/90">
          Salvar orçamento
          <HelpTip text="Salva este orçamento na aba Orçamentos com o preço comercial escolhido (varejo ou atacado), o cliente vinculado e a ficha técnica interna. Requer login de admin." />
        </h3>
      </div>
      {children}
    </div>
  );
}

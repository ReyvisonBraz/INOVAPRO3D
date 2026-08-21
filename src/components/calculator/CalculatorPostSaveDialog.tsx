import { Save } from "lucide-react";

interface CalculatorPostSaveDialogProps {
  created: boolean;
  onContinueEditing: () => void;
  onDuplicate: () => void;
  onStartNew: () => void;
}

export function CalculatorPostSaveDialog({
  created,
  onContinueEditing,
  onDuplicate,
  onStartNew,
}: CalculatorPostSaveDialogProps) {
  return (
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div
        className="w-full max-w-lg rounded-3xl border border-emerald-300/20 bg-[#10151f] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calculator-post-save-title"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
          <Save className="h-5 w-5" />
        </div>
        <h2 id="calculator-post-save-title" className="mt-4 text-xl font-black text-white">
          {created ? "Orçamento criado" : "Alterações salvas"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          O cálculo continua disponível. Escolha como quer seguir sem perder as bandejas e os
          parâmetros usados nesta proposta.
        </p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={onContinueEditing}
            className="min-h-12 rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-500"
          >
            Continuar editando este
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="min-h-12 rounded-xl border border-white/15 px-4 text-sm font-bold text-white/75 hover:bg-white/[0.06]"
          >
            Duplicar como base
          </button>
          <button
            type="button"
            onClick={onStartNew}
            className="min-h-12 rounded-xl border border-white/10 px-4 text-sm font-bold text-white/50 hover:border-red-300/25 hover:text-red-200"
          >
            Limpar e começar outro
          </button>
        </div>
      </div>
    </div>
  );
}

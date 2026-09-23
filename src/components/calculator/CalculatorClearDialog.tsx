import { useEffect, useRef } from "react";
import { Eraser } from "lucide-react";

interface CalculatorClearDialogProps {
  /** `true` quando a limpeza desfaz o vínculo com um orçamento já salvo. */
  editingSavedQuote: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmação de "Limpar calculadora".
 *
 * Só aparece quando há dados a perder. O foco começa em Cancelar — a ação
 * destrutiva nunca é o alvo do primeiro Enter — e volta ao botão de origem
 * ao fechar, para quem navega por teclado não se perder na página.
 */
export function CalculatorClearDialog({
  editingSavedQuote,
  onConfirm,
  onCancel,
}: CalculatorClearDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel();
        return;
      }
      // Sem isto o Tab sai do diálogo e percorre o formulário atrás dele,
      // que continua na tela e ainda parece editável.
      if (event.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>("button");
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-3xl border border-amber-300/20 bg-[#10151f] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calculator-clear-title"
        aria-describedby="calculator-clear-description"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
          <Eraser className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 id="calculator-clear-title" className="mt-4 text-xl font-black text-white">
          Limpar a calculadora?
        </h2>
        <p id="calculator-clear-description" className="mt-2 text-sm leading-relaxed text-white/55">
          {editingSavedQuote
            ? "O cálculo em andamento e o rascunho salvo automaticamente serão apagados, e a edição deixará de estar vinculada a este orçamento. O orçamento já salvo continua intacto."
            : "O cálculo em andamento e o rascunho salvo automaticamente serão apagados."}{" "}
          Suas tarifas, custos configurados e orçamentos salvos não mudam.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-xl border border-white/15 px-4 text-sm font-bold text-white/75 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-12 rounded-xl bg-amber-500 px-4 text-sm font-black text-black hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
          >
            Limpar calculadora
          </button>
        </div>
      </div>
    </div>
  );
}

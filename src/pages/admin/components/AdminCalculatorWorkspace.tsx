import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Calculator, Clock3, ExternalLink, Loader2, Minus, Trash2, X } from "lucide-react";
import {
  CALCULATOR_DRAFT_EVENT,
  clearCalculatorDraftStorage,
  getCalculatorDraftSummary,
  type CalculatorDraftSummary,
} from "../../public/calculator/useCalculatorState";
import { ADMIN_CALCULATOR_OPEN_EVENT } from "../adminCalculatorEvents";

const FilamentCalculator = lazy(() => import("../../public/FilamentCalculator"));

export function AdminCalculatorWorkspace() {
  const [initialDraft] = useState(getCalculatorDraftSummary);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(Boolean(initialDraft));
  const [draftSummary, setDraftSummary] = useState<CalculatorDraftSummary | null>(initialDraft);
  const [instanceKey, setInstanceKey] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const openCalculator = () => {
    setMounted(true);
    setOpen(true);
  };

  useEffect(() => {
    const handleOpen = () => openCalculator();
    window.addEventListener(ADMIN_CALCULATOR_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(ADMIN_CALCULATOR_OPEN_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    const handleDraftSaved = (event: Event) => {
      setDraftSummary((event as CustomEvent<CalculatorDraftSummary | null>).detail);
    };
    window.addEventListener(CALCULATOR_DRAFT_EVENT, handleDraftSaved);
    return () => window.removeEventListener(CALCULATOR_DRAFT_EVENT, handleDraftSaved);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const discardCalculator = () => {
    clearCalculatorDraftStorage();
    setOpen(false);
    setMounted(false);
    setDraftSummary(null);
    setConfirmDiscard(false);
    setInstanceKey((current) => current + 1);
  };

  if (typeof document === "undefined") return null;

  return (
    <>
      {mounted &&
        createPortal(
          <div
            className={
              open
                ? "fixed inset-0 z-[9999] h-[100dvh] w-screen overflow-hidden bg-[#07080d]"
                : "hidden"
            }
            role="dialog"
            aria-modal="true"
            aria-label="Calculadora profissional de orçamento"
          >
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#07080d]">
              <header className="z-30 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0a0d15]/95 px-4 backdrop-blur-xl sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
                    <Calculator className="h-5 w-5 text-blue-200" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-black text-white sm:text-base">
                      Calculadora de orçamento
                    </h2>
                    <p className="hidden text-xs text-white/45 sm:block">
                      {draftSummary
                        ? `Rascunho protegido · ${draftSummary.projectName}`
                        : "Salvamento automático ativado"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href="/calculadora"
                    target="_blank"
                    rel="noreferrer"
                    className="hidden min-h-10 items-center justify-center rounded-xl border border-white/15 px-3 text-xs font-bold text-white/65 transition hover:text-white sm:inline-flex"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" /> Abrir em nova tela
                  </a>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] text-white/65 transition hover:border-blue-300/30 hover:bg-blue-400/10 hover:text-blue-100"
                    aria-label="Minimizar calculadora"
                    title="Minimizar e continuar navegando no painel"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDiscard(true)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] text-white/65 transition hover:border-red-300/30 hover:bg-red-400/10 hover:text-red-200"
                    aria-label="Fechar e descartar calculadora"
                    title="Fechar e descartar o rascunho"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <Suspense
                  fallback={
                    <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm font-bold text-white/60">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-300" />
                      Carregando calculadora...
                    </div>
                  }
                >
                  <FilamentCalculator key={instanceKey} embedded />
                </Suspense>
              </div>
              {confirmDiscard && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                  <div className="w-full max-w-md rounded-2xl border border-red-300/20 bg-[#11151f] p-6 shadow-2xl">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-400/10">
                      <Trash2 className="h-5 w-5 text-red-200" />
                    </div>
                    <h3 className="mt-4 text-lg font-black text-white">Descartar este cálculo?</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">
                      O rascunho salvo, todas as bandejas e os dados preenchidos serão apagados.
                      Para consultar outra área do painel, escolha minimizar.
                    </p>
                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDiscard(false)}
                        className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-bold text-white/75 hover:bg-white/[0.06]"
                      >
                        Continuar calculando
                      </button>
                      <button
                        type="button"
                        onClick={discardCalculator}
                        className="min-h-11 rounded-xl bg-red-500 px-4 text-sm font-black text-white hover:bg-red-400"
                      >
                        Descartar cálculo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        !open &&
        createPortal(
          <button
            type="button"
            onClick={openCalculator}
            className="fixed bottom-5 right-4 z-[9000] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-blue-300/25 bg-[#101725]/95 px-4 py-3 text-left shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-blue-200/40 sm:bottom-6 sm:right-6"
            aria-label="Retomar calculadora minimizada"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
              <Calculator className="h-5 w-5 text-blue-200" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black text-white">Retomar calculadora</span>
              <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-white/55">
                <Clock3 className="h-3 w-3 shrink-0 text-emerald-300" />
                {draftSummary?.projectName || "Rascunho protegido"}
              </span>
            </span>
          </button>,
          document.body,
        )}
    </>
  );
}

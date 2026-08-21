import { Calculator, Save } from "lucide-react";
import { BrandMark } from "../brand/BrandLogo";
import { cn } from "../../lib/utils";

interface CalculatorHeaderProps {
  draftSavedAt: string | null;
  printerName?: string;
  quoteId: string;
  mode: "QUICK" | "FULL";
  onModeChange: (mode: "QUICK" | "FULL") => void;
}

export function CalculatorHeader({
  draftSavedAt,
  printerName,
  quoteId,
  mode,
  onModeChange,
}: CalculatorHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-white/[0.08] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-3 flex items-center gap-3">
          <BrandMark className="h-8 w-8" />
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70">
            <Calculator className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            CÁLCULO <span className="text-white">MAKER</span>
            <span className="ml-2 align-middle text-[10px] font-bold tracking-widest text-white/25">
              v6.0
            </span>
          </h1>
        </div>
        <p className="text-sm text-white/40">
          Entenda cada centavo: material, energia, depreciação da máquina e seu lucro real
        </p>
      </div>

      <div className="flex flex-col items-start gap-3 lg:items-end">
        <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
          {draftSavedAt && (
            <span
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-200"
              title={new Date(draftSavedAt).toLocaleString("pt-BR")}
            >
              <Save className="h-3 w-3" />
              Rascunho salvo
            </span>
          )}
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-300">
            {printerName ?? "Máquina configurada em Ajustes"}
          </span>
          {quoteId && (
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-400/10 px-3 py-2 text-blue-200">
              Editando #{quoteId.slice(0, 8)}
            </span>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Modo de cálculo"
          className="inline-flex rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1 backdrop-blur"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "QUICK"}
            onClick={() => onModeChange("QUICK")}
            className={cn(
              "rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition",
              mode === "QUICK"
                ? "bg-cyan-500/25 text-cyan-200 shadow-[0_0_0_1px_rgba(103,232,249,0.3)]"
                : "text-white/40 hover:text-white/70",
            )}
          >
            Rápido
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "FULL"}
            onClick={() => onModeChange("FULL")}
            className={cn(
              "rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition",
              mode === "FULL"
                ? "bg-cyan-500/25 text-cyan-200 shadow-[0_0_0_1px_rgba(103,232,249,0.3)]"
                : "text-white/40 hover:text-white/70",
            )}
          >
            Completo
          </button>
        </div>
      </div>
    </header>
  );
}

import { useMemo, useState } from "react";
import { AlertTriangle, ClipboardPaste, Plus, Replace } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatHoursToHHMM } from "../../lib/pricing";
import { applyPasteToProject, parseBambuPaste, type ApplyPasteContext } from "../../lib/bambuPaste";
import type { CalculatorPlate } from "../../lib/calculatorProject";

interface SlicerPasteBoxProps {
  materials: ApplyPasteContext["materials"];
  fallbackPricePerKg: ApplyPasteContext["fallbackPricePerKg"];
  hasExistingPlates: boolean;
  onApply: (plates: CalculatorPlate[], mode: "REPLACE" | "APPEND") => void;
}

/**
 * Cola o resumo do fatiamento do Bambu Studio e transforma em bandejas.
 * Mostra uma prévia antes de aplicar — nada muda no projeto sem confirmação.
 */
export function SlicerPasteBox({
  materials,
  fallbackPricePerKg,
  hasExistingPlates,
  onApply,
}: SlicerPasteBoxProps) {
  const [text, setText] = useState("");

  const preview = useMemo(() => {
    if (!text.trim()) return null;
    const parsed = parseBambuPaste(text);
    if (!parsed.plates.length) return { parsed, applied: null };
    const applied = applyPasteToProject(parsed, { mode: "REPLACE", materials, fallbackPricePerKg });
    return { parsed, applied };
  }, [text, materials, fallbackPricePerKg]);

  const commit = (mode: "REPLACE" | "APPEND") => {
    if (!preview?.applied) return;
    onApply(preview.applied.plates, mode);
    setText("");
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/65">
          <ClipboardPaste className="h-3.5 w-3.5" />
          Cole aqui o resumo do fatiamento
        </span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder={"Plate 1\nPrint time: 2h 30m\nPLA Basic (Black): 45.20g"}
          className="w-full resize-y rounded-xl border border-white/15 bg-black/35 px-3 py-3 font-mono text-xs leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
        />
      </label>

      {preview && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          {preview.applied ? (
            <>
              <p className="text-xs font-bold text-white/80">
                {preview.parsed.plates.length}{" "}
                {preview.parsed.plates.length === 1 ? "bandeja" : "bandejas"} ·{" "}
                {formatHoursToHHMM(preview.parsed.totalHours)} ·{" "}
                {preview.parsed.totalGrams.toFixed(2)} g
              </p>
              {preview.applied.warnings.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {preview.applied.warnings.map((warning, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-200/80"
                    >
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              )}
              <div className={cn("mt-3 grid gap-2", hasExistingPlates ? "sm:grid-cols-2" : "")}>
                {hasExistingPlates && (
                  <button
                    type="button"
                    onClick={() => commit("APPEND")}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] text-[11px] font-black uppercase tracking-wider text-white/70 transition hover:border-white/30 hover:text-white"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar às existentes
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => commit("REPLACE")}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-cyan-500/90 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-cyan-400"
                >
                  <Replace className="h-3.5 w-3.5" />
                  {hasExistingPlates ? "Substituir bandejas" : "Aplicar"}
                </button>
              </div>
            </>
          ) : (
            <ul className="space-y-1">
              {preview.parsed.warnings.map((warning, index) => (
                <li
                  key={index}
                  className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-200/80"
                >
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  {warning}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

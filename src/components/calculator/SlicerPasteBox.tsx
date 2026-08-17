import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ClipboardPaste,
  ImagePlus,
  Loader2,
  Plus,
  Replace,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { formatHoursToHHMM } from "../../lib/pricing";
import { applyPasteToProject, parseBambuPaste, type ApplyPasteContext } from "../../lib/bambuPaste";
import type { CalculatorPlate } from "../../lib/calculatorProject";
import { extractSlicerImage } from "../../services/slicerImage";

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
  const [extracting, setExtracting] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageWarnings, setImageWarnings] = useState<string[]>([]);
  const [imageError, setImageError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );

  const readImage = async (file: File) => {
    setExtracting(true);
    setImageError("");
    setImageWarnings([]);
    const nextUrl = URL.createObjectURL(file);
    setImageUrl(nextUrl);
    try {
      const extracted = await extractSlicerImage(file);
      setText(extracted.text);
      setImageWarnings(extracted.warnings);
      if (!extracted.text) setImageError("Não consegui montar uma prévia com este recorte.");
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Não foi possível ler o recorte.");
    } finally {
      setExtracting(false);
    }
  };

  const readClipboardImage = async () => {
    if (!navigator.clipboard?.read) {
      setImageError("Use Ctrl/Cmd+V dentro da caixa ou selecione o arquivo do recorte.");
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((candidate) => candidate.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        await readImage(new File([blob], "recorte-bambu", { type }));
        return;
      }
      setImageError("A área de transferência não contém uma imagem.");
    } catch {
      setImageError("O navegador bloqueou a leitura. Clique na caixa e use Ctrl/Cmd+V.");
    }
  };

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
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/15">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left transition hover:bg-white/[0.035]"
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300">
            <ImagePlus className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-black uppercase tracking-[0.12em] text-white/80">
              Importar dados do fatiador
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-white/40">
              Cole o resumo ou anexe uma foto do Bambu Studio
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
          {text.trim() ? "Dados prontos" : "Opcional"}
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-white/10 p-4">
          <label className="block">
            <span className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/65">
              <ClipboardPaste className="h-3.5 w-3.5" />
              Cole aqui o resumo do fatiamento
            </span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onPaste={(event) => {
                const image = Array.from(event.clipboardData.files).find((file) =>
                  file.type.startsWith("image/"),
                );
                if (!image) return;
                event.preventDefault();
                void readImage(image);
              }}
              rows={3}
              placeholder={"Plate 1\nPrint time: 2h 30m\nPLA Basic (Black): 45.20g"}
              className="w-full resize-y rounded-xl border border-white/15 bg-black/35 px-3 py-3 font-mono text-xs leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void readClipboardImage()}
              disabled={extracting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 text-xs font-black text-cyan-100 transition hover:border-cyan-300/40 disabled:opacity-50"
            >
              {extracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardPaste className="h-4 w-4" />
              )}
              {extracting ? "Lendo recorte..." : "Colar recorte da tela"}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.035] px-4 text-xs font-bold text-white/65 transition hover:border-white/25 hover:text-white disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4" /> Selecionar imagem
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readImage(file);
                event.target.value = "";
              }}
            />
          </div>

          <p className="text-[11px] leading-relaxed text-white/35">
            Recorte somente o painel com tempo e consumo. A leitura preenche o texto acima para você
            revisar antes de aplicar.
          </p>

          {imageUrl && (
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30 p-2">
              <img
                src={imageUrl}
                alt="Recorte do resumo do Bambu Studio"
                className="max-h-44 w-full rounded-lg object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setImageUrl("");
                  setImageWarnings([]);
                  setImageError("");
                }}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-black/75 text-white/70"
                aria-label="Remover recorte"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {imageError && (
            <p className="flex items-start gap-2 rounded-xl border border-red-300/15 bg-red-300/[0.06] p-3 text-xs text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {imageError}
            </p>
          )}

          {imageWarnings.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-3">
              {imageWarnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2 text-[11px] text-amber-100/80">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {warning}
                </li>
              ))}
            </ul>
          )}

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
      )}
    </div>
  );
}

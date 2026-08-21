import { ChevronDown, ImagePlus, Loader2, X } from "lucide-react";

interface CalculatorQuoteImageSectionProps {
  imageUrl: string;
  open: boolean;
  uploading: boolean;
  showImageOnQuote: boolean;
  onToggle: () => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onShowImageOnQuoteChange: (value: boolean) => void;
}

export function CalculatorQuoteImageSection({
  imageUrl,
  open,
  uploading,
  showImageOnQuote,
  onToggle,
  onUpload,
  onRemove,
  onShowImageOnQuoteChange,
}: CalculatorQuoteImageSectionProps) {
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.025]">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-[11px] font-bold text-white/55 hover:text-white/80"
        aria-expanded={open}
      >
        <ImagePlus className="h-4 w-4 text-blue-300" />
        <span className="flex-1">
          Imagem da proposta
          <span className="ml-2 font-medium text-white/30">
            {imageUrl ? "anexada" : "opcional"}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-white/[0.07] p-2.5">
          {imageUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2">
              <img
                src={imageUrl}
                alt="Prévia do produto"
                className="h-12 w-12 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-white/60">
                Imagem anexada
              </span>
              <button
                type="button"
                onClick={onRemove}
                className="shrink-0 rounded-lg border border-white/10 p-2 text-white/40 transition hover:border-red-400/30 hover:text-red-300"
                aria-label="Remover imagem"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 text-[11px] font-bold text-white/50 transition hover:border-white/30 hover:text-white/70">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {uploading ? "Enviando..." : "Anexar imagem do produto (opcional)"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpload(file);
                  event.target.value = "";
                }}
              />
            </label>
          )}

          {imageUrl && (
            <label className="mt-2.5 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-white/65">
              <input
                type="checkbox"
                checked={showImageOnQuote}
                onChange={(event) => onShowImageOnQuoteChange(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/30 text-blue-500 focus:ring-blue-400"
              />
              Exibir esta imagem na proposta do cliente
            </label>
          )}
        </div>
      )}
    </div>
  );
}

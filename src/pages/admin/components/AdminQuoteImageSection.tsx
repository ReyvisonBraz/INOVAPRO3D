import { useRef } from "react";
import { ImageIcon, Upload } from "lucide-react";

interface AdminQuoteImageSectionProps {
  imageUrl: string;
  onChangeImageUrl: (imageUrl: string) => void;
  onUploadImage: (file: File) => void;
}

export function AdminQuoteImageSection({
  imageUrl,
  onChangeImageUrl,
  onUploadImage,
}: AdminQuoteImageSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="quote-editor-image rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
      <h3 className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-widest text-primary mb-6">
        <ImageIcon className="w-4 h-4" /> Imagem do Produto
      </h3>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5">
        <div className="w-full sm:w-32 h-32 shrink-0 rounded-2xl border border-white/10 bg-[#0C0E14] overflow-hidden flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt="Peça" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-7 h-7 text-white/20" />
          )}
        </div>
        <div className="flex-1 space-y-3">
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => onChangeImageUrl(e.target.value)}
            placeholder="Cole a URL da imagem aqui..."
            className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-mono"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadImage(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/20 hover:text-white transition-all"
          >
            <Upload className="w-4 h-4" /> Enviar imagem
          </button>
        </div>
      </div>
    </section>
  );
}

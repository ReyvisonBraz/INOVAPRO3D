import { ImageIcon } from "lucide-react";
import { formatBRL } from "../../../lib/pricing";

interface AdminQuoteEditorOverviewProps {
  imageUrl: string;
  customerName: string;
  total: number;
  fileName: string;
  onChangeFileName: (fileName: string) => void;
}

export function AdminQuoteEditorOverview({
  imageUrl,
  customerName,
  total,
  fileName,
  onChangeFileName,
}: AdminQuoteEditorOverviewProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-5 mb-8">
      <div className="h-48 w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0C0E14] flex items-center justify-center sm:h-44 sm:w-44">
        {imageUrl ? (
          <img src={imageUrl} alt="Peça" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/25">
            <ImageIcon className="w-8 h-8" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Sem imagem</span>
          </div>
        )}
      </div>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
            Cliente
          </p>
          <p className="text-base font-bold text-white/90">{customerName || "—"}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
            Preço Estimado
          </p>
          <p className="text-base font-black text-primary font-mono">{formatBRL(total)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 sm:col-span-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
            Peça / Arquivo
          </p>
          <input
            type="text"
            value={fileName}
            onChange={(e) => onChangeFileName(e.target.value)}
            placeholder="Ex: Suporte de celular v3"
            className="w-full bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/25"
          />
        </div>
      </div>
    </div>
  );
}

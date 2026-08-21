import { Sparkles } from "lucide-react";
import { formatBRL } from "../../../lib/pricing";

interface AdminQuoteEditorHeaderProps {
  quoteId: string;
  total: number;
}

export function AdminQuoteEditorHeader({ quoteId, total }: AdminQuoteEditorHeaderProps) {
  return (
    <div className="mb-6 border-b border-white/8 pb-6 pr-14">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
        <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1">
          Editor de orçamento
        </span>
        <span className="text-white/30">#{quoteId.slice(0, 8)}</span>
      </div>
      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Refinamento da proposta
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/45">
            Edite os dados, revise o preço e gere os documentos antes de enviar ao cliente.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.07] px-4 py-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/35">
              Total atual
            </p>
            <p className="font-mono text-xl font-black text-primary">{formatBRL(total)}</p>
          </div>
          <Sparkles className="h-5 w-5 text-cyan-300" />
        </div>
      </div>
    </div>
  );
}

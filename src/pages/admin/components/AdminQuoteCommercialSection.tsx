import { BadgeDollarSign, CalendarDays } from "lucide-react";
import { NumInput } from "../../../lib/adminHelpers";
import { formatBRL } from "../../../lib/pricing";

interface AdminQuoteCommercialSectionProps {
  total: number;
  quantity: number;
  unitPrice: number;
  validUntil: string;
  paymentTerms: string;
  showImage: boolean;
  onChangeTotal: (total: number) => void;
  onChangeValidUntil: (validUntil: string) => void;
  onChangePaymentTerms: (paymentTerms: string) => void;
  onChangeShowImage: (showImage: boolean) => void;
}

export function AdminQuoteCommercialSection({
  total,
  quantity,
  unitPrice,
  validUntil,
  paymentTerms,
  showImage,
  onChangeTotal,
  onChangeValidUntil,
  onChangePaymentTerms,
  onChangeShowImage,
}: AdminQuoteCommercialSectionProps) {
  return (
    <section className="quote-editor-commercial rounded-3xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-7">
      <h3 className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-widest text-primary mb-6">
        <BadgeDollarSign className="w-4 h-4" /> Valor da Proposta
      </h3>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-white/55 mb-1.5">
            Valor Final Aprovado (R$)
          </label>
          <NumInput
            min={0}
            step={0.01}
            value={total}
            onChange={onChangeTotal}
            className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-lg font-black text-primary outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-mono"
          />
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0C0E14] px-6 py-4 text-center shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1">
            Total do Lote
          </p>
          <p className="text-2xl font-black text-primary font-mono">{formatBRL(total)}</p>
          <p className="text-xs text-white/40 font-mono mt-1">
            {quantity}x {formatBRL(unitPrice)}
          </p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-white/55">
            <CalendarDays className="h-3.5 w-3.5" /> Validade da proposta
          </label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => onChangeValidUntil(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm font-semibold text-white [color-scheme:dark] outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white/55">
            Condição de pagamento
          </label>
          <input
            type="text"
            value={paymentTerms}
            onChange={(e) => onChangePaymentTerms(e.target.value)}
            placeholder="Ex.: 50% na aprovação e 50% na entrega"
            className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-xs font-semibold text-white/70 sm:col-span-2">
          <input
            type="checkbox"
            checked={showImage}
            onChange={(e) => onChangeShowImage(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Mostrar a imagem do produto na proposta do cliente
        </label>
      </div>
    </section>
  );
}

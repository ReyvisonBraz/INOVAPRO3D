import { Mail, User } from "lucide-react";

interface AdminQuoteCustomerSectionProps {
  name: string;
  phone: string;
  email: string;
  notes: string;
  onChangeName: (name: string) => void;
  onChangePhone: (phone: string) => void;
  onChangeEmail: (email: string) => void;
  onChangeNotes: (notes: string) => void;
}

export function AdminQuoteCustomerSection({
  name,
  phone,
  email,
  notes,
  onChangeName,
  onChangePhone,
  onChangeEmail,
  onChangeNotes,
}: AdminQuoteCustomerSectionProps) {
  return (
    <section className="quote-editor-customer rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
      <h3 className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-widest text-primary mb-6">
        <User className="w-4 h-4" /> Dados do Cliente
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-white/55 mb-1.5">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Nome completo ou empresa"
            className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm font-semibold text-white outline-none transition-all placeholder:text-white/25 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/55 mb-1.5">
            WhatsApp (apenas números)
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => onChangePhone(e.target.value)}
            placeholder="Ex: 11999998888"
            className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-mono"
          />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-white/55">
            <Mail className="h-3.5 w-3.5" /> E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => onChangeEmail(e.target.value)}
            placeholder="cliente@email.com"
            className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm font-semibold text-white outline-none transition-all placeholder:text-white/25 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/55 mb-1.5">
            Observações do Cliente
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="Anotações feitas pelo cliente na solicitação..."
            className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm text-white/85 placeholder:text-white/25 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>
      </div>
    </section>
  );
}

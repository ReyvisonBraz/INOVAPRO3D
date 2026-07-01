import { memo } from "react";
import { motion } from "framer-motion";
import { Eye, CheckCircle, Trash2, Smartphone, ImageIcon, Calculator } from "lucide-react";
import { formatBRL } from "../../../lib/pricing";
import type { FirestoreDate, Quote, Ticket } from "../../../types/domain";

interface AdminQuotesPanelProps {
  quotes: Quote[];
  onSelectQuote: (q: Quote | Ticket) => void;
  onApproveQuote: (q: Quote | Ticket) => void;
  onDeleteQuote: (type: string, id: string) => void;
  onWhatsApp?: (q: Quote) => void;
  isApprovingQuote?: boolean;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pendente", className: "border-amber-400/25 bg-amber-400/10 text-amber-300" },
  IN_REVIEW: { label: "Em análise", className: "border-sky-400/25 bg-sky-400/10 text-sky-300" },
  APPROVED: { label: "Aprovado", className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" },
  SENT_TO_CUSTOMER: { label: "Enviado", className: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300" },
  CONVERTED_TO_ORDER: { label: "Faturado", className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" },
  REJECTED: { label: "Recusado", className: "border-red-400/25 bg-red-400/10 text-red-300" },
  CANCELED: { label: "Cancelado", className: "border-white/15 bg-white/5 text-white/40" },
  DISCARDED: { label: "Descartado", className: "border-white/15 bg-white/5 text-white/40" },
};

function StatusBadge({ status }: { status?: string }) {
  const s = STATUS_STYLES[status || "PENDING"] || STATUS_STYLES.PENDING;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${s.className}`}>
      {s.label}
    </span>
  );
}

function formatDate(date?: FirestoreDate): string {
  if (!date || typeof date.seconds !== "number") return "—";
  return new Date(date.seconds * 1000).toLocaleDateString("pt-BR");
}

function formatPhone(phone?: string): string {
  const d = (phone || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone || "";
}

const AdminQuotesPanel = memo(function AdminQuotesPanel({
  quotes,
  onSelectQuote,
  onApproveQuote,
  onDeleteQuote,
  onWhatsApp,
  isApprovingQuote = false,
}: AdminQuotesPanelProps) {
  const pending = quotes.filter((q) => !q.status || q.status === "PENDING" || q.status === "IN_REVIEW").length;

  return (
    <motion.div
      key="quotes"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-dim">Total de orçamentos</p>
          <p className="text-lg font-black text-white">{quotes.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-300/70">Aguardando análise</p>
          <p className="text-lg font-black text-amber-300">{pending}</p>
        </div>
      </div>

      <div className="glass rounded-[32px] sm:rounded-[48px] p-4 sm:p-8 border border-white/5 overflow-x-auto no-scrollbar">
        <table className="w-full text-left min-w-[820px]">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-dim border-b border-white/5">
              <th className="pb-6">Peça</th>
              <th className="pb-6">Cliente</th>
              <th className="pb-6">Material</th>
              <th className="pb-6 text-right">Preço</th>
              <th className="pb-6 text-center">Status</th>
              <th className="pb-6 text-center">Data</th>
              <th className="pb-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => {
              const price = q.total || q.estimatedPrice || 0;
              const phoneClean = (q.phone || "").replace(/\D/g, "");
              return (
                <tr key={q.id} className="hover:bg-white/[0.01] transition-colors group border-b border-white/[0.03]">
                  {/* PEÇA + THUMBNAIL */}
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
                        {q.imageUrl ? (
                          <img src={q.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-white/20" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate max-w-[180px] text-sm font-bold text-white/90">{q.fileName}</p>
                        <p className="flex items-center gap-1 font-mono text-[10px] text-white/30">
                          #{q.id.slice(0, 8)}
                          {q.source === "calculator" && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px text-[8px] font-black uppercase tracking-wide text-primary">
                              <Calculator className="h-2 w-2" /> calc
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* CLIENTE + TELEFONE */}
                  <td className="py-4">
                    <p className="text-sm font-bold uppercase text-white/70">{q.userName || "—"}</p>
                    {q.phone && (
                      <p className="font-mono text-[11px] text-white/35">{formatPhone(q.phone)}</p>
                    )}
                  </td>

                  {/* MATERIAL */}
                  <td className="py-4 text-xs font-bold text-white/50">{q.materialId || "—"}</td>

                  {/* PREÇO */}
                  <td className="py-4 text-right">
                    <p className="font-mono text-sm font-black text-white">{formatBRL(price)}</p>
                    {q.quantity && q.quantity > 1 && q.unitPrice ? (
                      <p className="font-mono text-[10px] text-white/30">{formatBRL(q.unitPrice)} / un · {q.quantity}x</p>
                    ) : null}
                  </td>

                  {/* STATUS */}
                  <td className="py-4 text-center"><StatusBadge status={q.status} /></td>

                  {/* DATA */}
                  <td className="py-4 text-center font-mono text-[11px] text-white/40">{formatDate(q.createdAt)}</td>

                  {/* AÇÕES */}
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onWhatsApp && phoneClean && (
                        <button
                          onClick={() => onWhatsApp(q)}
                          title="Enviar orçamento por WhatsApp"
                          className="p-3 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-black rounded-xl transition-all"
                        >
                          <Smartphone className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onSelectQuote(q)}
                        title="Ver detalhes"
                        className="p-3 bg-white/5 hover:bg-white/10 text-dim hover:text-white rounded-xl transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {q.status !== "APPROVED" && q.status !== "CONVERTED_TO_ORDER" && (
                        <button
                          onClick={() => onApproveQuote(q)}
                          disabled={isApprovingQuote}
                          title="Aprovar e faturar"
                          className="p-3 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-xl transition-all shadow-lg shadow-green-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteQuote("quotes", q.id)}
                        title="Excluir orçamento"
                        className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={7} className="py-20 text-center text-subtle italic">
                  Nenhum orçamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
});

export default AdminQuotesPanel;

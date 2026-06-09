import { memo } from "react";
import { motion } from "framer-motion";
import { Eye, CheckCircle, Trash2 } from "lucide-react";
import type { Quote, Ticket } from "../../../types/domain";

interface AdminQuotesPanelProps {
  quotes: Quote[];
  onSelectQuote: (q: Quote | Ticket) => void;
  onApproveQuote: (q: Quote | Ticket) => void;
  onDeleteQuote: (type: string, id: string) => void;
}

const AdminQuotesPanel = memo(function AdminQuotesPanel({
  quotes,
  onSelectQuote,
  onApproveQuote,
  onDeleteQuote,
}: AdminQuotesPanelProps) {
  return (
    <motion.div
      key="quotes"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="space-y-6"
    >
      <div className="glass rounded-[32px] sm:rounded-[48px] p-4 sm:p-10 border border-white/5 overflow-x-auto no-scrollbar">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-dim border-b border-white/5">
              <th className="pb-6">Protocolo</th>
              <th className="pb-6">Arquivo</th>
              <th className="pb-6">Cliente</th>
              <th className="pb-6 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr
                key={q.id}
                className="hover:bg-white/[0.01] transition-colors group"
              >
                <td className="py-6 font-mono text-[10px] text-white/40">
                  #{q.id.slice(0, 8)}
                </td>
                <td className="py-6 font-bold truncate max-w-[200px]">
                  {q.fileName}
                </td>
                <td className="py-6 text-sm font-bold uppercase text-white/60">
                  {q.userName}
                </td>
                <td className="py-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onSelectQuote(q)}
                      className="p-3 bg-white/5 hover:bg-white/10 text-dim hover:text-white rounded-xl transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {q.status !== "APPROVED" && (
                      <button
                        onClick={() => onApproveQuote(q)}
                        className="p-3 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-xl transition-all shadow-lg shadow-green-500/10"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteQuote("quotes", q.id)}
                      className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-20 text-center text-subtle italic"
                >
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

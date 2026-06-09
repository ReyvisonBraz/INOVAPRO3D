import { memo } from "react";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/Button";
import { cn } from "../../../lib/utils";
import type { Ticket } from "../../../types/domain";

interface AdminSupportPanelProps {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  replyText: string;
  onSelectTicket: (t: Ticket) => void;
  onReplyChange: (text: string) => void;
  onSendReply: () => void;
  onMarkResolved: (id: string) => void;
  onDeleteTicket: (id: string) => void;
}

const AdminSupportPanel = memo(({
  tickets,
  selectedTicket,
  replyText,
  onSelectTicket,
  onReplyChange,
  onSendReply,
  onMarkResolved,
  onDeleteTicket,
}: AdminSupportPanelProps) => {
  return (
    <motion.div key="support" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TICKETS LIST */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest italic mb-6">Tickets de Entrada</h3>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto no-scrollbar pr-2">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTicket(t)}
                className={cn(
                  "w-full text-left p-5 rounded-[32px] border transition-all group",
                  selectedTicket?.id === t.id ? "bg-primary border-primary shadow-lg shadow-primary/20" : "bg-white/5 border-white/5 hover:bg-white/10",
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-[11px] font-black uppercase px-2 py-0.5 rounded-full",
                    selectedTicket?.id === t.id ? "bg-white/20 text-white" : t.status === 'RESOLVIDO' ? "bg-green-500/20 text-green-400" : "bg-blue-500/10 text-blue-400",
                  )}>{t.status || 'ABERTO'}</span>
                  <span className="text-[11px] text-secondary font-bold">{new Date((t.createdAt as { seconds: number })?.seconds * 1000).toLocaleDateString()}</span>
                </div>
                <p className={cn("text-xs font-bold uppercase truncate", selectedTicket?.id === t.id ? "text-white" : "text-white/80")}>{t.userName || 'Visitante'}</p>
                <p className={cn("text-[9px] line-clamp-1 mt-1", selectedTicket?.id === t.id ? "text-white/60" : "text-white/40")}>{t.message}</p>
              </button>
            ))}
            {tickets.length === 0 && <p className="text-xs text-subtle italic text-center py-10">Nenhuma mensagem no momento.</p>}
          </div>
        </div>

        {/* RESPONSE PANEL */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-surface-card rounded-[48px] p-6 sm:p-10 border border-white/5 h-full flex flex-col min-h-[500px]">
              <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                <div>
                  <h4 className="text-xl font-black italic">{selectedTicket.userName}</h4>
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest">{selectedTicket.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onMarkResolved(selectedTicket.id)}>Marcar Resolvido</Button>
                  <Button variant="outline" size="sm" className="rounded-xl border-red-500/20 text-red-500" onClick={() => onDeleteTicket(selectedTicket.id)}>Excluir</Button>
                </div>
              </div>
              <div className="flex-1 space-y-6">
                <div className="bg-white/5 p-6 rounded-[32px] border border-white/5">
                  <p className="text-[10px] text-dim uppercase font-black mb-2 italic">Mensagem do Cliente:</p>
                  <p className="text-sm leading-relaxed text-white/80">{selectedTicket.message}</p>
                </div>
                <div className="mt-auto space-y-4 pt-6">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">Resposta Rápida (Protocolo OS)</label>
                    <span className="text-[11px] font-bold text-dim uppercase italic">Logs serão registrados automaticamente</span>
                  </div>
                  <textarea
                    className="w-full bg-black border border-white/10 rounded-[32px] p-6 text-sm outline-none focus:border-primary/50 resize-none transition-all"
                    rows={4}
                    value={replyText}
                    onChange={(e) => onReplyChange(e.target.value)}
                    placeholder="Digite sua resposta oficial aqui..."
                  />
                  <Button className="w-full py-6 rounded-[24px] uppercase font-black italic tracking-widest gap-3" onClick={onSendReply}>
                    <Mail className="w-4 h-4" /> Enviar Resposta via Protocolo
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-[48px] border border-white/5 border-dashed h-full flex flex-col items-center justify-center text-subtle opacity-30 py-20 lg:py-0">
              <Mail className="w-16 h-16 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Selecione um ticket para processar</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default AdminSupportPanel;

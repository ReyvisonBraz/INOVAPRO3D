import { memo, type FC } from "react";
import { motion } from "framer-motion";
import { History } from "lucide-react";
import type { AuditLog } from "../../../types/domain";

interface AdminLogsPanelProps {
  logs: AuditLog[];
}

const AdminLogsPanel: FC<AdminLogsPanelProps> = memo(({ logs }) => {
  return (
    <motion.div key="logs" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="glass rounded-[48px] p-10 border border-white/10 overflow-hidden">
        <div className="flex items-center gap-3 mb-10">
          <History className="w-6 h-6 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest italic">Protocolos de Auditoria</h3>
        </div>
        <div className="space-y-4">
          {logs.map(log => (
            <div key={log.id} className="flex gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-[32px] hover:bg-white/[0.04] transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center font-mono text-[10px] font-bold text-white/20 group-hover:text-primary transition-colors">#{log.id.slice(0,4)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">{log.action}</span>
                  <span className="text-[8px] text-white/20 font-bold uppercase">{new Date((log.createdAt as any)?.seconds * 1000).toLocaleString()}</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{log.reply || log.details || 'Ação sistêmica registrada sob protocolo central.'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Operator</p>
                <p className="text-xs font-bold text-white/40">{log.adminId?.slice(0,8) || 'SYSTEM'}</p>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="py-20 text-center opacity-20 italic">Nenhum evento auditado nas últimas 48h.</div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default AdminLogsPanel;

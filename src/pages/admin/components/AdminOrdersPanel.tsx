import { memo, type FC } from "react";
import { motion } from "framer-motion";
import { Wallet, CheckCircle2, ListTodo, Zap, Layers, Truck, Shield, ArrowRight } from "lucide-react";
import type { Order, OrderItem } from "../../../types/domain";

interface AdminOrdersPanelProps {
  orders: Order[];
  searchTerm: string;
  onSelectOrder: (order: Order) => void;
}

const AdminOrdersPanel: FC<AdminOrdersPanelProps> = memo(({
  orders,
  searchTerm,
  onSelectOrder,
}) => {
  return (
    <motion.div key="orders" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex justify-between items-center bg-white/[0.02] p-6 rounded-[24px] border border-white/5">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest italic">Esteira de Produção (Kanban)</h3>
          <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Painel de controle logístico e manufatura</p>
        </div>
      </div>

      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 snap-x no-scrollbar">
        {[
          { id: 'PENDING_PAYMENT', label: 'AGUAR. PAGTO', icon: Wallet },
          { id: 'PAID', label: 'PAGO', icon: CheckCircle2 },
          { id: 'QUEUE', label: 'FILA IMPRESSÃO', icon: ListTodo },
          { id: 'PRINTING', label: 'IMPRIMINDO', icon: Zap },
          { id: 'FINISHING', label: 'ACABAMENTO', icon: Layers },
          { id: 'SHIPPED', label: 'ENVIADO', icon: Truck },
          { id: 'COMPLETED', label: 'FINALIZADO', icon: Shield },
        ].map(stage => {
          const stageOrders = orders.filter(o => o.status === stage.id &&
            (searchTerm === "" ||
             (o.userName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
             o.id.toLowerCase().includes(searchTerm.toLowerCase()))
          );
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="min-w-[260px] sm:min-w-[300px] flex-shrink-0 snap-start bg-[#0A0A0F] border border-white/5 rounded-[32px] flex flex-col h-[65vh] sm:h-[70vh]">
              {/* Column Header */}
              <div className="p-4 sm:p-5 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-black uppercase text-white/80">{stage.label}</h4>
                  </div>
                  <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded-full text-white/40">{stageOrders.length}</span>
                </div>
              </div>

              {/* Column Body / Cards */}
              <div className="flex-1 p-3 overflow-y-auto no-scrollbar space-y-3">
                {stageOrders.map(o => (
                  <div key={o.id} onClick={() => onSelectOrder(o)} className="glass p-4 sm:p-5 rounded-[24px] border border-white/5 hover:border-primary/50 cursor-pointer transition-all group hover:shadow-[0_0_20px_rgba(37,99,235,0.1)]">
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-[9px] font-mono text-white/30">#{o.id.slice(0,8)}</p>
                      <p className="text-[10px] font-display font-black text-primary italic bg-primary/10 px-2 py-0.5 rounded-md">R$ {(o.total || 0).toFixed(2)}</p>
                    </div>
                    <h5 className="text-sm font-black uppercase truncate group-hover:text-white text-white/80 transition-colors">{o.userName}</h5>
                    <p className="text-[10px] text-white/30 line-clamp-1 mb-4 mt-1 font-bold">{o.items?.map((i: OrderItem) => i.name || i.fileName).join(' • ')}</p>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <p className="text-[8px] font-mono text-white/20">{new Date((o.createdAt as any)?.seconds * 1000).toLocaleDateString()}</p>
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-primary group-hover:text-white transition-all">
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                ))}
                {stageOrders.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-[9px] font-black uppercase text-white/10 tracking-widest border border-white/5 border-dashed rounded-xl p-4 w-1/2 mx-auto">Vazio</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  );
});

export default AdminOrdersPanel;

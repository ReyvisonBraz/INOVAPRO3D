import { Edit, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/Button";
import type { Customer, Order } from "../../../types/domain";

interface AdminCustomerDetailModalProps {
  customer: Customer;
  orders: Order[];
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  onSelectOrder: (order: Order) => void;
  onEmail: (email: string) => void;
  onDelete: (id: string) => void;
}

export function AdminCustomerDetailModal({
  customer,
  orders,
  onClose,
  onEdit,
  onSelectOrder,
  onEmail,
  onDelete,
}: AdminCustomerDetailModalProps) {
  const customerOrders = orders.filter((order) => order.userEmail === customer.email);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface border border-white/10 rounded-[48px] w-full max-w-4xl relative my-auto overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-12 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center font-black text-2xl text-primary uppercase">
              {customer.photoURL ? (
                <img
                  src={customer.photoURL}
                  className="w-full h-full rounded-3xl object-cover"
                  alt=""
                />
              ) : (
                customer.name?.[0]
              )}
            </div>
            <div>
              <h2 className="text-3xl font-black italic tracking-tighter">{customer.name}</h2>
              <p className="text-xs text-white/40 font-bold uppercase tracking-widest">
                {customer.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-4 hover:bg-white/5 rounded-2xl transition-all text-dim hover:text-white"
          >
            <Plus className="w-8 h-8 rotate-45" />
          </button>
        </div>
        <div className="flex-1 p-12 overflow-y-auto no-scrollbar space-y-10">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-dim mb-6 italic">
              Fluxo de Protocolos (Pedidos)
            </h3>
            <div className="space-y-4">
              {customerOrders.map((order) => (
                <div
                  key={order.id}
                  className="glass p-6 rounded-[32px] border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all"
                >
                  <div>
                    <p className="text-[10px] font-mono text-dim mb-1">#{order.id.slice(0, 12)}</p>
                    <p className="text-xs font-bold uppercase">
                      {new Date((order.createdAt?.seconds ?? 0) * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-black uppercase text-dim mb-1">Status</p>
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-white/5 rounded-full border border-white/5">
                      {order.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-display font-black text-primary">
                      R$ {(order.total || 0).toFixed(2)}
                    </p>
                    <button
                      onClick={() => onSelectOrder(order)}
                      className="text-[11px] font-black uppercase text-dim hover:text-white mt-1 underline"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
              {customerOrders.length === 0 && (
                <div className="py-20 text-center opacity-10 italic">
                  Nenhum protocolo interceptado para este usuário.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-8 bg-black/40 border-t border-white/5 flex flex-wrap gap-4">
          <Button
            onClick={() => onEdit(customer)}
            className="rounded-2xl h-14 px-8 text-xs font-black uppercase tracking-widest"
          >
            <Edit className="w-4 h-4" /> Editar cliente
          </Button>
          <Button
            onClick={() => onEmail(customer.email || "")}
            className="flex-1 rounded-2xl h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-black uppercase italic tracking-widest text-white"
          >
            Enviar Notificação
          </Button>
          <Button
            onClick={() => onDelete(customer.id)}
            className="rounded-2xl h-14 px-8 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-black uppercase italic tracking-widest"
            variant="outline"
          >
            Banir / Excluir
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

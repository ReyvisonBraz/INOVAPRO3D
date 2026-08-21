import { Plus, Trash2, Truck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/Button";
import { NumberField } from "../../../components/ui/NumberField";
import type { Order, OrderItem } from "../../../types/domain";

interface AdminOrderDetailModalProps {
  order: Order;
  editingItems: boolean;
  editedItems: OrderItem[];
  onClose: () => void;
  onChangeStatus: (status: string) => void;
  onCancelOrder: () => void;
  onDeleteOrder: () => void;
  onUpdateTracking: (trackingCode: string) => void;
  onToggleItemEditing: () => void;
  onUpdateEditedItem: (index: number, patch: Partial<OrderItem>) => void;
}

export function AdminOrderDetailModal({
  order,
  editingItems,
  editedItems,
  onClose,
  onChangeStatus,
  onCancelOrder,
  onDeleteOrder,
  onUpdateTracking,
  onToggleItemEditing,
  onUpdateEditedItem,
}: AdminOrderDetailModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-surface border border-white/10 rounded-[32px] sm:rounded-[56px] w-full max-w-5xl relative my-auto overflow-hidden flex flex-col lg:flex-row max-h-[90vh]"
      >
        {/* Left: Core data */}
        <div className="lg:w-1/3 bg-white/[0.02] border-b lg:border-b-0 lg:border-r border-white/5 p-6 sm:p-12 flex flex-col">
          <button
            onClick={onClose}
            className="mb-6 lg:mb-12 self-start p-3 hover:bg-white/5 rounded-2xl transition-all group"
          >
            <Plus className="w-6 h-6 rotate-45 text-dim group-hover:text-red-500" />
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2 italic">
            Protocol Ledger
          </p>
          <h2 className="text-4xl font-display font-black italic tracking-tighter mb-8 leading-none">
            #{order.id.slice(0, 12)}
          </h2>
          <div className="space-y-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-dim mb-4 italic">
                Status de Operação
              </p>
              <select
                value={order.status}
                onChange={(e) => onChangeStatus(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-[20px] p-4 text-xs font-black uppercase tracking-widest text-primary outline-none focus:border-primary transition-all appearance-none"
              >
                <option value="PENDING_PAYMENT">AGUARDANDO PAGAMENTO</option>
                <option value="PAID">PAGAMENTO APROVADO</option>
                <option value="QUEUE">FILA DE PRODUÇÃO</option>
                <option value="PRINTING">EM IMPRESSÃO 3D</option>
                <option value="FINISHING">ACABAMENTO POST-OP</option>
                <option value="SHIPPED">ENVIADO / LOGÍSTICA</option>
                <option value="COMPLETED">ENTREGA FINALIZADA</option>
                <option value="CANCELED">CANCELADO</option>
              </select>
              <div className="flex gap-3 mt-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-2xl h-10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                  onClick={onCancelOrder}
                >
                  Cancelar Pedido
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-2xl h-10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                  onClick={onDeleteOrder}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Pedido
                </Button>
              </div>
            </div>
            <div className="p-6 bg-white/5 rounded-[28px] border border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-dim mb-3 italic">
                Identidade do Cliente
              </p>
              <p className="text-sm font-bold uppercase mb-1">{order.userName}</p>
              <p className="text-xs text-white/40">{order.userEmail}</p>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-dim italic">
                Rastreamento de Logística
              </p>
              <div className="flex gap-2">
                <input
                  placeholder="Código de Rastreio"
                  defaultValue={order.trackingCode}
                  onBlur={(e) => onUpdateTracking(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none focus:border-primary/50"
                />
                <Button size="sm" variant="outline" className="rounded-xl h-10 w-10 p-0">
                  <Truck className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-8 lg:mt-auto pt-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-subtle mb-2">
              Total Transacionado
            </p>
            <p className="text-3xl lg:text-4xl font-display font-black text-primary italic">
              R$ {(order.total || 0).toFixed(2)}
            </p>
          </div>
        </div>
        {/* Right: Items */}
        <div className="flex-1 p-6 sm:p-12 overflow-y-auto no-scrollbar bg-[#050508]/40">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <h3 className="text-sm font-black uppercase tracking-widest italic">
              Manifesto de Produção
            </h3>
            <button
              onClick={onToggleItemEditing}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                editingItems
                  ? "bg-primary text-white"
                  : "text-primary hover:bg-primary/10 border border-primary/20"
              }`}
            >
              {editingItems ? "Salvar Alterações" : "Editar Itens"}
            </button>
          </div>
          <div className="space-y-4">
            {order.items?.map((item: OrderItem, idx: number) => {
              const editItem = editingItems ? editedItems[idx] : item;
              return (
                <div
                  key={idx}
                  className="bg-surface-card p-6 rounded-[32px] border border-white/5 flex items-center gap-5"
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingItems ? (
                      <input
                        value={editItem.name}
                        onChange={(e) => onUpdateEditedItem(idx, { name: e.target.value })}
                        className="w-full bg-black border border-white/10 rounded-xl p-2 text-xs font-black uppercase outline-none focus:border-primary/50 mb-2"
                      />
                    ) : (
                      <p className="text-xs font-black uppercase">{item.name}</p>
                    )}
                    <p className="text-[11px] text-white/40">
                      {item.options?.material} / Infill {item.options?.infill}%
                    </p>
                    {item.options?.adminNotes && (
                      <p className="text-[11px] text-primary/70 italic mt-1">
                        {item.options.adminNotes}
                      </p>
                    )}
                    {editingItems ? (
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-[10px] text-dim">Qtd:</label>
                        <NumberField
                          min={1}
                          value={editItem.quantity}
                          onChange={(quantity) => onUpdateEditedItem(idx, { quantity })}
                          className="w-16 bg-black border border-white/10 rounded-lg p-1.5 text-xs font-bold text-center outline-none focus:border-primary/50"
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-secondary mt-0.5">Qtd: {item.quantity}</p>
                    )}
                  </div>
                  {editingItems ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-dim">R$</span>
                      <NumberField
                        min={0}
                        step={0.01}
                        value={editItem.price}
                        onChange={(price) => onUpdateEditedItem(idx, { price })}
                        className="w-24 bg-black border border-white/10 rounded-lg p-1.5 text-xs font-bold text-right outline-none focus:border-primary/50 font-mono"
                      />
                    </div>
                  ) : (
                    <p className="text-sm font-display font-black text-primary shrink-0">
                      R$ {(item.price || 0).toFixed(2)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import { memo, type FC, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../lib/utils";
import {
  Wallet, CheckCircle2, ListTodo, Zap, Layers, Truck, Shield,
  ArrowRight, XCircle, Trash2, Search, ChevronDown, ChevronUp,
  CheckSquare, Square, Columns, Table, SlidersHorizontal
} from "lucide-react";
import type { Order, OrderItem, OrderStatus } from "../../../types/domain";

const KANBAN_STAGES = [
  { id: "PENDING_PAYMENT" as OrderStatus, label: "AGUAR. PAGTO", icon: Wallet, color: "text-amber-400" },
  { id: "PAID" as OrderStatus, label: "PAGO", icon: CheckCircle2, color: "text-green-400" },
  { id: "QUEUE" as OrderStatus, label: "FILA IMPRESSÃO", icon: ListTodo, color: "text-blue-400" },
  { id: "PRINTING" as OrderStatus, label: "IMPRIMINDO", icon: Zap, color: "text-purple-400" },
  { id: "FINISHING" as OrderStatus, label: "ACABAMENTO", icon: Layers, color: "text-cyan-400" },
  { id: "SHIPPED" as OrderStatus, label: "ENVIADO", icon: Truck, color: "text-blue-500" },
  { id: "COMPLETED" as OrderStatus, label: "FINALIZADO", icon: Shield, color: "text-green-500" },
] as const;

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Aguard. Pagamento",
  PAID: "Pago",
  QUEUE: "Fila Produção",
  SLICING: "Fatiamento",
  PRINTING: "Imprimindo",
  FINISHING: "Acabamento",
  READY: "Pronto",
  SHIPPED: "Enviado",
  COMPLETED: "Finalizado",
  CANCELED: "Cancelado",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  PAID: "bg-green-500/10 text-green-400 border-green-500/20",
  QUEUE: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  SLICING: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  PRINTING: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  FINISHING: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  READY: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  SHIPPED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  COMPLETED: "bg-green-500/10 text-green-400 border-green-500/20",
  CANCELED: "bg-red-500/10 text-red-400 border-red-500/20",
};

type SortField = "createdAt" | "total" | "userName" | "status";
type SortDir = "asc" | "desc";

interface AdminOrdersPanelProps {
  orders: Order[];
  searchTerm: string;
  onSelectOrder: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
  onDeleteOrder: (order: Order) => void;
  onUpdateStatus: (orderId: string, newStatus: string) => void;
}

const AdminOrdersPanel: FC<AdminOrdersPanelProps> = memo(({
  orders,
  searchTerm,
  onSelectOrder,
  onCancelOrder,
  onDeleteOrder,
  onUpdateStatus,
}) => {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("table");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [localSearch, setLocalSearch] = useState("");
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const filterStatuses: (OrderStatus | "ALL")[] = ["ALL", "PENDING_PAYMENT", "PAID", "QUEUE", "PRINTING", "FINISHING", "SHIPPED", "COMPLETED", "CANCELED"];

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (statusFilter !== "ALL") {
      result = result.filter(o => o.status === statusFilter);
    }

    const term = (localSearch || searchTerm).toLowerCase();
    if (term) {
      result = result.filter(o =>
        o.id.toLowerCase().includes(term) ||
        (o.userName ?? "").toLowerCase().includes(term) ||
        (o.userEmail ?? "").toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "createdAt") {
        cmp = (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      } else if (sortField === "total") {
        cmp = (a.total || 0) - (b.total || 0);
      } else if (sortField === "userName") {
        cmp = (a.userName ?? "").localeCompare(b.userName ?? "");
      } else if (sortField === "status") {
        cmp = (a.status ?? "").localeCompare(b.status ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [orders, statusFilter, localSearch, searchTerm, sortField, sortDir]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const formatDate = (ts: any) => {
    if (!ts) return "—";
    const d = new Date((ts.seconds || 0) * 1000);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  return (
    <motion.div key="orders" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white/[0.02] p-4 sm:p-6 rounded-[24px] border border-white/5">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black uppercase tracking-widest italic">Gestão de Pedidos</h3>
          <p className="text-[11px] text-dim uppercase font-bold tracking-widest">
            {filteredOrders.length} pedido{filteredOrders.length !== 1 ? "s" : ""}
            {statusFilter !== "ALL" && ` • ${STATUS_LABELS[statusFilter]}`}
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === "table" ? "bg-primary text-white" : "text-dim hover:text-white"
              }`}
            >
              <Table className="w-3.5 h-3.5" /> Tabela
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === "kanban" ? "bg-primary text-white" : "text-dim hover:text-white"
              }`}
            >
              <Columns className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dim" />
          <input
            type="text"
            placeholder="Buscar por ID, cliente ou email..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:border-primary/50 transition-all placeholder:text-dim text-white font-bold"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <SlidersHorizontal className="w-3.5 h-3.5 text-dim shrink-0" />
          {filterStatuses.map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setSelectedIds(new Set()); }}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                statusFilter === s
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-white/[0.03] border-white/[0.06] text-dim hover:border-white/10 hover:text-white"
              }`}
            >
              {s === "ALL" ? "Todos" : s === "CANCELED" ? "Cancelados" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {viewMode === "table" && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between gap-3 bg-red-500/5 border border-red-500/20 rounded-2xl px-4 py-3 overflow-hidden"
          >
            <p className="text-[11px] font-black uppercase tracking-widest text-red-400">
              {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-dim hover:text-white transition-colors"
              >
                Limpar
              </button>
              <button
                onClick={() => {
                  selectedIds.forEach(id => {
                    const o = orders.find(x => x.id === id);
                    if (o) onCancelOrder(o);
                  });
                  setSelectedIds(new Set());
                }}
                className="px-4 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/30"
              >
                Cancelar Selecionados
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && (
        <div className="bg-surface-card rounded-[28px] sm:rounded-[40px] border border-white/5 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-dim border-b border-white/5">
                  <th className="p-4 sm:p-5 w-10">
                    <button onClick={toggleSelectAll} className="hover:text-white transition-colors">
                      {selectedIds.size === filteredOrders.length && filteredOrders.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-4 sm:p-5">Protocolo</th>
                  <th className="p-4 sm:p-5">
                    <button onClick={() => handleSort("userName")} className="flex items-center gap-1 hover:text-white transition-colors">
                      Cliente <SortIcon field="userName" />
                    </button>
                  </th>
                  <th className="p-4 sm:p-5 hidden xl:table-cell">Itens</th>
                  <th className="p-4 sm:p-5">
                    <button onClick={() => handleSort("total")} className="flex items-center gap-1 hover:text-white transition-colors">
                      Total <SortIcon field="total" />
                    </button>
                  </th>
                  <th className="p-4 sm:p-5">
                    <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-white transition-colors">
                      Status <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="p-4 sm:p-5">
                    <button onClick={() => handleSort("createdAt")} className="flex items-center gap-1 hover:text-white transition-colors">
                      Data <SortIcon field="createdAt" />
                    </button>
                  </th>
                  <th className="p-4 sm:p-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => (
                  <tr
                    key={o.id}
                    className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group ${
                      o.status === "CANCELED" ? "opacity-50" : ""
                    }`}
                  >
                    <td className="p-4 sm:p-5">
                      <button onClick={() => toggleSelect(o.id)} className="hover:text-white transition-colors">
                        {selectedIds.has(o.id) ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-dim hover:text-white" />
                        )}
                      </button>
                    </td>
                    <td className="p-4 sm:p-5">
                      <button
                        onClick={() => onSelectOrder(o)}
                        className="font-mono text-xs font-bold text-primary hover:text-white transition-colors"
                      >
                        #{o.id.slice(0, 8)}
                      </button>
                    </td>
                    <td className="p-4 sm:p-5">
                      <p className="text-xs font-bold uppercase text-white/80 truncate max-w-[140px]">{o.userName || "—"}</p>
                      {o.userEmail && <p className="text-[11px] text-dim truncate max-w-[140px]">{o.userEmail}</p>}
                    </td>
                    <td className="p-4 sm:p-5 hidden xl:table-cell">
                      <p className="text-[11px] text-secondary truncate max-w-[200px]">
                        {o.items?.map(i => i.name || i.fileName).join(" • ") || "—"}
                      </p>
                    </td>
                    <td className="p-4 sm:p-5">
                      <p className="text-xs font-display font-black text-primary italic">R$ {(o.total || 0).toFixed(2)}</p>
                    </td>
                    <td className="p-4 sm:p-5">
                      <select
                        value={o.status}
                        onChange={(e) => onUpdateStatus(o.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border outline-none appearance-none cursor-pointer transition-all ${STATUS_COLORS[o.status]}`}
                      >
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k} className="bg-[#0A0A0F] text-white">{v}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 sm:p-5">
                      <p className="text-[11px] font-mono text-dim whitespace-nowrap">{formatDate(o.createdAt)}</p>
                    </td>
                    <td className="p-4 sm:p-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectOrder(o)}
                          className="p-2 rounded-lg text-dim hover:text-white hover:bg-white/5 transition-all"
                          title="Ver detalhes"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        {o.status !== "CANCELED" && o.status !== "COMPLETED" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onCancelOrder(o); }}
                            className="p-2 rounded-lg text-dim hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Cancelar pedido"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteOrder(o); }}
                          className="p-2 rounded-lg text-dim hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Excluir pedido"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-20 text-center">
                      <p className="text-sm font-black uppercase text-subtle tracking-widest">
                        {statusFilter !== "ALL"
                          ? `Nenhum pedido com status "${STATUS_LABELS[statusFilter]}"`
                          : "Nenhum pedido encontrado"}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── KANBAN VIEW ── */}
      {viewMode === "kanban" && (
        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 snap-x no-scrollbar">
          {KANBAN_STAGES.map(stage => {
            const stageOrders = filteredOrders.filter(o => o.status === stage.id);
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                className={cn(
                  "min-w-[260px] sm:min-w-[300px] flex-shrink-0 snap-start bg-[#0A0A0F] border rounded-[32px] flex flex-col h-[60vh] sm:h-[65vh] transition-all",
                  dragOverStage === stage.id ? "border-primary/50 bg-primary/[0.02]" : "border-white/5"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const orderId = e.dataTransfer.getData("text/plain");
                  if (orderId && stage.id !== orders.find(o => o.id === orderId)?.status) {
                    onUpdateStatus(orderId, stage.id);
                  }
                }}
              >
                <div className="p-4 sm:p-5 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${stage.color}`} />
                      <h4 className="text-xs font-black uppercase text-white/80">{stage.label}</h4>
                    </div>
                    <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded-full text-white/40">{stageOrders.length}</span>
                  </div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto no-scrollbar space-y-3">
                  {stageOrders.map(o => (
                    <div
                      key={o.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData("text/plain", o.id); }}
                      className="bg-surface-card p-3 rounded-[20px] border border-white/5 hover:border-primary/50 cursor-grab active:cursor-grabbing transition-all group relative select-none"
                    >
                      {/* Quick actions — below price, right side */}
                      <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {o.status !== "CANCELED" && o.status !== "COMPLETED" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onCancelOrder(o); }}
                            className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all"
                            title="Cancelar"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteOrder(o); }}
                          className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div onClick={() => onSelectOrder(o)} className="cursor-pointer">
                        {/* Product image + header row */}
                        <div className="flex items-start gap-2.5 mb-2">
                          {o.items?.[0]?.image && (
                            <img
                              src={o.items[0].image}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover border border-white/5 shrink-0 bg-black/20"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-[11px] font-mono text-secondary">#{o.id.slice(0, 8)}</p>
                              <p className="text-[11px] font-display font-black text-primary italic bg-primary/10 px-1.5 py-0.5 rounded-md shrink-0">
                                R$ {(o.total || 0).toFixed(2)}
                              </p>
                            </div>
                            <h5 className="text-xs font-black uppercase truncate text-white/80 mt-0.5">{o.userName}</h5>
                          </div>
                        </div>
                        <p className="text-[11px] text-secondary line-clamp-1 mb-2 font-bold">
                          {o.items?.map((i: OrderItem) => i.name || i.fileName).join(" • ")}
                        </p>
                        <div className="flex items-center justify-between border-t border-white/5 pt-2">
                          <p className="text-[11px] font-mono text-dim">{formatDate(o.createdAt)}</p>
                          <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-dim group-hover:bg-primary group-hover:text-white transition-all">
                            <ArrowRight className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {stageOrders.length === 0 && (
                    <div className="py-10 text-center">
                      <p className="text-[10px] font-black uppercase text-subtle tracking-widest border border-white/5 border-dashed rounded-xl p-3 w-2/3 mx-auto">
                        Arraste pedidos aqui
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
});

export default AdminOrdersPanel;

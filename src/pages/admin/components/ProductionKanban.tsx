import { ArrowRight, Layers } from "lucide-react";
import { PRODUCTION_STAGES } from "../adminConfig";
import type { Order, OrderItem } from "../../../types/domain";

type KanbanVariant = "compact" | "full";

interface ProductionKanbanProps {
  orders: Order[];
  searchTerm: string;
  variant?: KanbanVariant;
  onSelectOrder: (order: Order) => void;
}

export function ProductionKanban({
  orders,
  searchTerm,
  variant = "full",
  onSelectOrder,
}: ProductionKanbanProps) {
  const isCompact = variant === "compact";
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return (
    <div className="space-y-4">
      <div className={isCompact ? "flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center bg-white/[0.02] p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-white/5" : "flex justify-between items-center bg-white/[0.02] p-6 rounded-[24px] border border-white/5"}>
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2">
            {isCompact && <Layers className="w-4 h-4 shrink-0 text-primary" />}
            {isCompact ? "Esteira de Produção" : "Esteira de Produção (Kanban)"}
          </h3>
          <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">
            {isCompact
              ? "Controle logístico e manufatura diretamente no dashboard inicial"
              : "Painel de controle logístico e manufatura"}
          </p>
        </div>
        {isCompact && (
          <span className="w-fit text-[8px] font-black uppercase tracking-widest text-white/30 bg-white/5 border border-white/5 rounded-full px-3 py-1">
            Arraste para ver etapas
          </span>
        )}
      </div>

      <div className={isCompact ? "flex gap-3 sm:gap-5 lg:gap-6 overflow-x-auto pb-4 snap-x no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0" : "flex gap-4 sm:gap-6 overflow-x-auto pb-8 snap-x no-scrollbar"}>
        {PRODUCTION_STAGES.map((stage) => {
          const stageOrders = orders.filter((order) => {
            const matchesStage = order.status === stage.id;
            const matchesSearch =
              normalizedSearch === "" ||
              order.userName?.toLowerCase().includes(normalizedSearch) ||
              order.id.toLowerCase().includes(normalizedSearch);

            return matchesStage && matchesSearch;
          });
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className={
                isCompact
                  ? "min-w-[245px] sm:min-w-[300px] flex-shrink-0 snap-start bg-[#0A0A0F] border border-white/5 rounded-[26px] sm:rounded-[32px] flex flex-col h-[390px] sm:h-[420px]"
                  : "min-w-[260px] sm:min-w-[300px] flex-shrink-0 snap-start bg-[#0A0A0F] border border-white/5 rounded-[32px] flex flex-col h-[65vh] sm:h-[70vh]"
              }
            >
              <div className={isCompact ? "p-4 border-b border-white/5 bg-white/[0.01]" : "p-4 sm:p-5 border-b border-white/5 bg-white/[0.02]"}>
                <div className={isCompact ? "flex items-center justify-between" : "flex items-center justify-between mb-1"}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={isCompact ? "w-3.5 h-3.5 shrink-0 text-primary" : "w-4 h-4 text-primary"} />
                    <h4 className={isCompact ? "text-[10px] font-black uppercase text-white/70 truncate" : "text-xs font-black uppercase text-white/80"}>
                      {stage.label}
                    </h4>
                  </div>
                  <span className={isCompact ? "text-[9px] font-black bg-white/5 px-2 py-0.5 rounded-full text-white/40" : "text-[10px] font-black bg-white/5 px-2 py-0.5 rounded-full text-white/40"}>
                    {stageOrders.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 p-3 overflow-y-auto no-scrollbar space-y-3">
                {stageOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => onSelectOrder(order)}
                    className={
                      isCompact
                        ? "w-full text-left glass p-3 sm:p-4 rounded-[20px] border border-white/5 hover:border-primary/50 cursor-pointer transition-all group hover:shadow-[0_0_15px_rgba(37,99,235,0.08)]"
                        : "w-full text-left glass p-4 sm:p-5 rounded-[24px] border border-white/5 hover:border-primary/50 cursor-pointer transition-all group hover:shadow-[0_0_20px_rgba(37,99,235,0.1)]"
                    }
                  >
                    <div className={isCompact ? "flex justify-between items-start mb-2" : "flex justify-between items-start mb-3"}>
                      <p className={isCompact ? "text-[8px] font-mono text-white/30" : "text-[9px] font-mono text-white/30"}>#{order.id.slice(0, 8)}</p>
                      <p className={isCompact ? "text-[9px] font-display font-black text-primary italic bg-primary/10 px-1.5 py-0.5 rounded-md" : "text-[10px] font-display font-black text-primary italic bg-primary/10 px-2 py-0.5 rounded-md"}>
                        R$ {(order.total || 0).toFixed(2)}
                      </p>
                    </div>
                    <h5 className={isCompact ? "text-xs font-black uppercase truncate group-hover:text-white text-white/80 transition-colors" : "text-sm font-black uppercase truncate group-hover:text-white text-white/80 transition-colors"}>
                      {order.userName}
                    </h5>
                    <p className={isCompact ? "text-[9px] text-white/30 line-clamp-1 mb-3 mt-1 font-bold" : "text-[10px] text-white/30 line-clamp-1 mb-4 mt-1 font-bold"}>
                      {order.items?.map((item: OrderItem) => item.name || item.fileName).join(" • ")}
                    </p>

                    <div className={isCompact ? "flex items-center justify-between border-t border-white/5 pt-2" : "flex items-center justify-between border-t border-white/5 pt-3"}>
                      <p className="text-[8px] font-mono text-white/20">{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                      <div className={isCompact ? "w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-primary group-hover:text-white transition-all" : "w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-primary group-hover:text-white transition-all"}>
                        <ArrowRight className={isCompact ? "w-2.5 h-2.5" : "w-3 h-3"} />
                      </div>
                    </div>
                  </button>
                ))}

                {stageOrders.length === 0 && (
                  <div className={isCompact ? "py-12 text-center" : "py-10 text-center"}>
                    <p className={isCompact ? "text-[8px] font-black uppercase text-white/10 tracking-widest border border-white/5 border-dashed rounded-xl p-3 w-3/4 mx-auto" : "text-[9px] font-black uppercase text-white/10 tracking-widest border border-white/5 border-dashed rounded-xl p-4 w-1/2 mx-auto"}>
                      {isCompact ? "Sem Pedidos" : "Vazio"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

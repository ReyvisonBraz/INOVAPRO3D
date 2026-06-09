import { FileText, Package, TrendingUp } from "lucide-react";
import type { AdminTabId } from "../adminConfig";
import type { Order, Quote } from "../../../types/domain";

interface AdminOverviewSummaryProps {
  orders: Order[];
  quotes: Quote[];
  onSelectTab: (tab: AdminTabId) => void;
}

export function AdminOverviewSummary({ orders, quotes, onSelectTab }: AdminOverviewSummaryProps) {
  const revenue = orders.reduce((acc, order) => acc + (order.total || 0), 0);
  const activeOrders = orders.filter((order) => order.status !== "COMPLETED").length;
  const pendingQuotes = quotes.filter((quote) => quote.status === "PENDING").length;

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
        <div className="col-span-2 glass rounded-[28px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-white/5 relative overflow-hidden group min-h-[150px] sm:min-h-[190px]">
          <TrendingUp className="absolute top-6 right-6 sm:top-10 sm:right-10 w-16 h-16 sm:w-24 sm:h-24 text-primary opacity-10" />
          <p className="text-[10px] text-dim uppercase font-black tracking-widest mb-2 italic">Receita Acumulada</p>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black italic tracking-tighter break-words">
            R$ {revenue.toFixed(2)}
          </h2>
        </div>
        <div className="glass rounded-[28px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-white/5 flex flex-col justify-center min-h-[130px] sm:min-h-[190px]">
          <p className="text-[10px] text-dim uppercase font-black tracking-widest mb-1 italic">Em Produção</p>
          <h3 className="text-3xl sm:text-4xl font-display font-black italic text-primary">{activeOrders}</h3>
        </div>
        <div className="glass rounded-[28px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-white/5 flex flex-col justify-center min-h-[130px] sm:min-h-[190px]">
          <p className="text-[10px] text-dim uppercase font-black tracking-widest mb-1 italic">Orçamentos</p>
          <h3 className="text-3xl sm:text-4xl font-display font-black italic">{pendingQuotes}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="glass rounded-[28px] sm:rounded-[40px] p-4 sm:p-6 lg:p-8 border border-white/5 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-primary" /> Últimos Pedidos
            </h3>
            <button onClick={() => onSelectTab("orders")} className="shrink-0 text-[9px] font-black uppercase text-dim hover:text-white transition-colors">
              Ver Todos
            </button>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 4).map((order) => (
              <div key={order.id} className="flex justify-between items-center gap-3 p-3 sm:p-4 bg-white/[0.01] hover:bg-white/[0.02] rounded-2xl border border-white/5 transition-colors min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center font-mono text-[9px] font-bold text-white/40">#{order.id.slice(0, 4)}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase truncate max-w-[120px]">{order.userName}</p>
                    <p className="text-[11px] text-dim uppercase font-black tracking-widest">{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-display font-black text-primary italic">R$ {(order.total || 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-[28px] sm:rounded-[40px] p-4 sm:p-6 lg:p-8 border border-white/5 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-blue-400" /> Consultas de Preço
            </h3>
            <button onClick={() => onSelectTab("quotes")} className="shrink-0 text-[9px] font-black uppercase text-dim hover:text-white transition-colors">
              Ver Todos
            </button>
          </div>
          <div className="space-y-3">
            {quotes.slice(0, 4).map((quote) => (
              <div key={quote.id} className="flex justify-between items-center gap-3 p-3 sm:p-4 bg-white/[0.01] hover:bg-white/[0.02] rounded-2xl border border-white/5 transition-colors min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase truncate max-w-[120px]">{quote.userName}</p>
                    <p className="text-[11px] text-dim uppercase font-black tracking-widest truncate max-w-[150px]">{quote.fileName}</p>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">PENDENTE</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

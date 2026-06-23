import { ArrowUpRight, FileText, Package, Wallet, Factory } from "lucide-react";
import type { AdminTabId } from "../adminConfig";
import type { Order, Quote } from "../../../types/domain";
import { formatBRL } from "../../../lib/pricing";

interface AdminOverviewSummaryProps {
  orders: Order[];
  quotes: Quote[];
  onSelectTab: (tab: AdminTabId) => void;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  wide,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${
        wide ? "col-span-2" : ""
      } ${
        accent
          ? "border-primary/20 bg-gradient-to-br from-primary/[0.12] to-transparent"
          : "border-white/[0.07] bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
            accent ? "border-primary/25 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.04] text-white/60"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{label}</p>
      <p
        className={`mt-1.5 font-display font-bold tracking-tight tabular-nums ${
          wide ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
        } ${accent ? "text-white" : "text-white"}`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] font-medium text-white/30">{sub}</p>}
    </div>
  );
}

export function AdminOverviewSummary({ orders, quotes, onSelectTab }: AdminOverviewSummaryProps) {
  const validOrders = orders.filter((order) => order.status !== "CANCELED");
  const revenue = validOrders.reduce((acc, order) => acc + (order.total || 0), 0);
  const activeOrders = validOrders.filter((order) => order.status !== "COMPLETED").length;
  const pendingQuotes = quotes.filter((quote) => quote.status === "PENDING").length;
  const ticketMedio = validOrders.length ? revenue / validOrders.length : 0;

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Wallet}
          label="Receita acumulada"
          value={formatBRL(revenue)}
          sub={`${validOrders.length} pedido${validOrders.length === 1 ? "" : "s"} · ticket médio ${formatBRL(ticketMedio)}`}
          accent
          wide
        />
        <StatCard icon={Factory} label="Em produção" value={String(activeOrders)} sub="pedidos ativos" />
        <StatCard icon={FileText} label="Orçamentos" value={String(pendingQuotes)} sub="aguardando análise" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/80">
              <Package className="w-4 h-4 text-primary" /> Últimos pedidos
            </h3>
            <button
              onClick={() => onSelectTab("orders")}
              className="group flex shrink-0 items-center gap-1 text-[11px] font-semibold text-white/40 transition-colors hover:text-white"
            >
              Ver todos
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {validOrders.length === 0 && (
              <p className="py-8 text-center text-xs text-white/25">Nenhum pedido ainda.</p>
            )}
            {validOrders.slice(0, 5).map((order) => (
              <button
                key={order.id}
                onClick={() => onSelectTab("orders")}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent p-3 text-left transition-colors hover:border-white/[0.07] hover:bg-white/[0.03] min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] font-mono text-[10px] font-semibold text-white/40">
                    #{order.id.slice(0, 4)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white/90">{order.userName}</p>
                    <p className="text-[11px] font-medium text-white/30 tabular-nums">
                      {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString("pt-BR") : "—"}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 font-display text-sm font-bold tabular-nums text-white">
                  {formatBRL(order.total || 0)}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/80">
              <FileText className="w-4 h-4 text-cyan" /> Consultas de preço
            </h3>
            <button
              onClick={() => onSelectTab("quotes")}
              className="group flex shrink-0 items-center gap-1 text-[11px] font-semibold text-white/40 transition-colors hover:text-white"
            >
              Ver todos
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {quotes.length === 0 && (
              <p className="py-8 text-center text-xs text-white/25">Nenhuma consulta ainda.</p>
            )}
            {quotes.slice(0, 5).map((quote) => (
              <button
                key={quote.id}
                onClick={() => onSelectTab("quotes")}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent p-3 text-left transition-colors hover:border-white/[0.07] hover:bg-white/[0.03] min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan/15 bg-cyan/10">
                    <FileText className="h-4 w-4 text-cyan" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white/90">{quote.userName}</p>
                    <p className="truncate text-[11px] font-medium text-white/30">{quote.fileName}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-cyan/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan">
                  Pendente
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

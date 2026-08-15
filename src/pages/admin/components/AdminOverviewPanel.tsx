import { memo, useMemo } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  ExternalLink,
  Layers,
  ListTodo,
  Maximize2,
  Shield,
  Trash2,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "../../../components/ui/Button";
import type { Order, OrderItem, Quote } from "../../../types/domain";
import { openAdminCalculator } from "../adminCalculatorEvents";
import { AdminOverviewSummary } from "./AdminOverviewSummary";

interface AdminOverviewPanelProps {
  orders: Order[];
  quotes: Quote[];
  searchTerm: string;
  onSelectOrder: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
  onDeleteOrder: (order: Order) => void;
  onTabChange: (tab: string) => void;
}

const KANBAN_STAGES = [
  { id: "PENDING_PAYMENT", label: "AGUAR. PAGTO", icon: Wallet },
  { id: "PAID", label: "PAGO", icon: CheckCircle2 },
  { id: "QUEUE", label: "FILA IMPRESSÃO", icon: ListTodo },
  { id: "PRINTING", label: "IMPRIMINDO", icon: Zap },
  { id: "FINISHING", label: "ACABAMENTO", icon: Layers },
  { id: "SHIPPED", label: "ENVIADO", icon: Truck },
  { id: "COMPLETED", label: "FINALIZADO", icon: Shield },
] as const;

const CHART_COLORS = ["#2563EB", "#22C55E", "#3B82F6", "#EAB308"];

const AdminOverviewPanel = memo(function AdminOverviewPanel({
  orders,
  quotes,
  searchTerm,
  onSelectOrder,
  onCancelOrder,
  onDeleteOrder,
  onTabChange,
}: AdminOverviewPanelProps) {
  const chartData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const order of orders) {
      const label = new Date((order.createdAt?.seconds ?? 0) * 1000).toLocaleDateString("pt-BR");
      totals.set(label, (totals.get(label) ?? 0) + (order.total || 0));
    }
    return [...totals].map(([name, total]) => ({ name, total })).reverse();
  }, [orders]);

  const pieData = useMemo(() => {
    let pending = 0;
    let paid = 0;
    let production = 0;
    let completed = 0;
    for (const order of orders) {
      if (order.status === "PENDING_PAYMENT") pending++;
      else if (order.status === "PAID") paid++;
      else if (["QUEUE", "SLICING", "PRINTING", "FINISHING"].includes(order.status)) production++;
      else if (order.status === "COMPLETED") completed++;
    }
    return [
      { name: "Pendente", value: pending },
      { name: "Pago", value: paid },
      { name: "Produção", value: production },
      { name: "Concluído", value: completed },
    ];
  }, [orders]);

  const ordersByStatus = useMemo(() => {
    const grouped = new Map<string, Order[]>();
    const search = searchTerm.toLocaleLowerCase("pt-BR");
    for (const order of orders) {
      if (
        search &&
        !order.userName?.toLocaleLowerCase("pt-BR").includes(search) &&
        !order.id.toLocaleLowerCase("pt-BR").includes(search)
      ) {
        continue;
      }
      grouped.set(order.status, [...(grouped.get(order.status) ?? []), order]);
    }
    return grouped;
  }, [orders, searchTerm]);

  return (
    <motion.div
      role="region"
      aria-label="Visão geral do painel administrativo"
      key="overview"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <AdminOverviewSummary orders={orders} quotes={quotes} onSelectTab={onTabChange} />

      <section className="overflow-hidden rounded-3xl border border-blue-400/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.14),rgba(6,182,212,0.05)_52%,rgba(255,255,255,0.025))] shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-300/25 bg-blue-400/15">
              <Calculator className="h-7 w-7 text-blue-200" />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Motor sincronizado
              </span>
              <h2 className="mt-3 font-display text-xl font-black tracking-tight text-white sm:text-2xl">
                Calculadora profissional de orçamento
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
                Calcule projetos da Bambu, bandejas multicolor, filamentos, hora-máquina, atacado e
                varejo sem ocupar permanentemente o painel.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <Button
              type="button"
              onClick={() => openAdminCalculator({ mode: "NEW" })}
              className="min-h-12 rounded-xl bg-blue-500 px-5 text-sm font-black text-white hover:bg-blue-400"
            >
              <Maximize2 className="mr-2 h-4 w-4" /> Abrir calculadora
            </Button>
            <a
              href="/calculadora"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] px-5 text-sm font-bold text-white/75"
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Nova tela
            </a>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 rounded-[24px] border border-white/5 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest italic">
              <Layers className="h-4 w-4 text-primary" /> Esteira de Produção
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-dim">
              Controle logístico e manufatura diretamente no dashboard inicial
            </p>
          </div>
          <span className="w-fit rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-secondary">
            Arraste para ver etapas
          </span>
        </div>

        <div
          className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-4 no-scrollbar sm:mx-0 sm:gap-5 sm:px-0 lg:gap-6"
          role="list"
          aria-label="Esteira de produção - Kanban"
        >
          {KANBAN_STAGES.map((stage) => {
            const stageOrders = ordersByStatus.get(stage.id) || [];
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                role="listitem"
                aria-label={`${stage.label}: ${stageOrders.length} pedidos`}
                className="flex h-[390px] min-w-[245px] flex-shrink-0 snap-start flex-col rounded-[26px] border border-white/5 bg-[#0A0A0F] sm:h-[420px] sm:min-w-[300px]"
              >
                <div className="border-b border-white/5 bg-white/[0.01] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <h4 className="truncate text-[10px] font-black uppercase text-white/70">
                        {stage.label}
                      </h4>
                    </div>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-black text-white/40">
                      {stageOrders.length}
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-3 no-scrollbar">
                  {stageOrders.map((order) => (
                    <article
                      key={order.id}
                      className="group relative min-h-[44px] rounded-[20px] border border-white/5 bg-surface-card p-3 sm:p-4"
                    >
                      <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                        {order.status !== "CANCELED" && order.status !== "COMPLETED" && (
                          <button
                            onClick={() => onCancelOrder(order)}
                            className="rounded-lg bg-red-500/10 p-1 text-red-400 hover:bg-red-500 hover:text-white"
                            title="Cancelar pedido"
                          >
                            <AlertCircle className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteOrder(order)}
                          className="rounded-lg bg-red-500/10 p-1 text-red-400 hover:bg-red-500 hover:text-white"
                          title="Excluir pedido"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <button className="w-full text-left" onClick={() => onSelectOrder(order)}>
                        <div className="mb-2 flex items-start justify-between">
                          <span className="font-mono text-[11px] text-secondary">
                            #{order.id.slice(0, 8)}
                          </span>
                          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black italic text-primary">
                            R$ {(order.total || 0).toFixed(2)}
                          </span>
                        </div>
                        <h5 className="truncate text-xs font-black uppercase text-white/80">
                          {order.userName}
                        </h5>
                        <p className="mb-3 mt-1 line-clamp-1 text-[9px] font-bold text-secondary">
                          {order.items
                            ?.map((item: OrderItem) => item.name || item.fileName)
                            .join(" • ")}
                        </p>
                        <div className="flex items-center justify-between border-t border-white/5 pt-2">
                          <span className="font-mono text-[11px] text-dim">
                            {new Date((order.createdAt?.seconds ?? 0) * 1000).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                          <ArrowRight className="h-3 w-3 text-dim" />
                        </div>
                      </button>
                    </article>
                  ))}
                  {!stageOrders.length && (
                    <div className="py-12 text-center">
                      <p className="mx-auto w-3/4 rounded-xl border border-dashed border-white/5 p-3 text-[11px] font-black uppercase text-subtle">
                        Sem pedidos
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-4">
        <div className="glass h-[280px] rounded-[28px] border border-white/5 p-4 sm:h-[360px] sm:p-8 xl:col-span-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="name" stroke="#ffffff10" fontSize={9} tick={{ fill: "#ffffff20" }} />
              <YAxis stroke="#ffffff10" fontSize={9} tick={{ fill: "#ffffff20" }} />
              <Tooltip contentStyle={{ backgroundColor: "#0A0A0F", borderRadius: "16px" }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#2563EB"
                strokeWidth={3}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass relative flex min-h-[260px] items-center justify-center rounded-[28px] border border-white/5 p-4">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={60}
                outerRadius={85}
                paddingAngle={10}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-4">
            <span className="text-2xl font-black italic">{orders.length}</span>
            <span className="text-[11px] font-black uppercase text-dim">Pedidos</span>
          </div>
        </div>
      </section>
    </motion.div>
  );
});

export default AdminOverviewPanel;

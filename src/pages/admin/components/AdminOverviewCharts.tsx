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
import type { Order } from "../../../types/domain";

const CHART_COLORS = ["#2563EB", "#22C55E", "#3B82F6", "#EAB308"];

interface AdminOverviewChartsProps {
  orders: Order[];
}

export function AdminOverviewCharts({ orders }: AdminOverviewChartsProps) {
  const chartData = orders
    .map((order) => ({
      name: new Date(order.createdAt?.seconds * 1000).toLocaleDateString() || "N/A",
      total: order.total || 0,
    }))
    .reverse();

  const pieData = [
    { name: "Pendente", value: orders.filter((order) => order.status === "PENDING_PAYMENT").length },
    { name: "Pago", value: orders.filter((order) => order.status === "PAID").length },
    { name: "Produção", value: orders.filter((order) => ["QUEUE", "SLICING", "PRINTING", "FINISHING"].includes(order.status)).length },
    { name: "Concluído", value: orders.filter((order) => order.status === "COMPLETED").length },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
      <div className="xl:col-span-3 glass rounded-[28px] sm:rounded-[48px] p-4 sm:p-8 lg:p-10 border border-white/5 h-[280px] sm:h-[360px] lg:h-[400px]">
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
            <Tooltip contentStyle={{ backgroundColor: "#0A0A0F", border: "1px solid rgba(37,99,235,0.1)", borderRadius: "24px" }} />
            <Area type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="glass rounded-[28px] sm:rounded-[48px] p-4 sm:p-8 lg:p-10 border border-white/5 flex flex-col items-center justify-center relative min-h-[260px]">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={pieData} innerRadius={60} outerRadius={85} paddingAngle={10} dataKey="value">
              {pieData.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
          <span className="text-2xl font-black italic">{orders.length}</span>
          <span className="text-[11px] font-black uppercase text-dim">Pedidos</span>
        </div>
      </div>
    </div>
  );
}

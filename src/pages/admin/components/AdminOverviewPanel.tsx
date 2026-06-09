import { useMemo, memo } from "react";
import {
  Package,
  FileText,
  TrendingUp,
  Truck,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Zap,
  Smartphone,
  AlertCircle,
  Layers,
  Wallet,
  Calculator,
  ListTodo,
  Shield,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "../../../components/ui/Button";
import { NumInput } from "../../../lib/adminHelpers";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  MATERIAL_PRESETS,
  DEFAULT_ENERGY,
  formatBRL,
  HELP,
  type MaterialKey,
  type MachineConfig,
  type MachineHourBreakdown,
} from "../../../lib/pricing";
import type { Order, OrderItem, Quote } from "../../../types/domain";

interface AdminOverviewPanelProps {
  orders: Order[];
  quotes: Quote[];
  searchTerm: string;
  quickCalcWeight: number;
  quickCalcTime: string;
  quickCalcPhone: string;
  quickCalcCustomerName: string;
  quickCalcPieceName: string;
  quickCalcBatchQty: number;
  quickCalcMaterial: MaterialKey;
  quickCalcMaterialReserve: number;
  quickCalcFailureRate: number;
  quickCalcMinPrice: number;
  quickCalcWholesaleMarkup: number;
  quickCalcRetailMarkup: number;
  setQuickCalcWeight: (v: number) => void;
  setQuickCalcTime: (v: string) => void;
  setQuickCalcPhone: (v: string) => void;
  setQuickCalcCustomerName: (v: string) => void;
  setQuickCalcPieceName: (v: string) => void;
  setQuickCalcBatchQty: (v: number) => void;
  setQuickCalcMaterial: (v: MaterialKey) => void;
  setQuickCalcMaterialReserve: (v: number) => void;
  setQuickCalcFailureRate: (v: number) => void;
  setQuickCalcMinPrice: (v: number) => void;
  setQuickCalcWholesaleMarkup: (v: number) => void;
  setQuickCalcRetailMarkup: (v: number) => void;
  quickCalcResult: ReturnType<typeof import("../../../lib/pricing").computePricing>;
  quickMachineBreak: MachineHourBreakdown;
  onSelectOrder: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
  onDeleteOrder: (order: Order) => void;
  onTabChange: (tab: string) => void;
  onSendWhatsAppQuote: () => void;
  machineConfig: MachineConfig;
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
  quickCalcWeight,
  quickCalcTime,
  quickCalcPhone,
  quickCalcCustomerName,
  quickCalcPieceName,
  quickCalcBatchQty,
  quickCalcMaterial,
  quickCalcMaterialReserve,
  quickCalcFailureRate,
  quickCalcMinPrice,
  quickCalcWholesaleMarkup,
  quickCalcRetailMarkup,
  setQuickCalcWeight,
  setQuickCalcTime,
  setQuickCalcPhone,
  setQuickCalcCustomerName,
  setQuickCalcPieceName,
  setQuickCalcBatchQty,
  setQuickCalcMaterial,
  setQuickCalcMaterialReserve,
  setQuickCalcFailureRate,
  setQuickCalcMinPrice,
  setQuickCalcWholesaleMarkup,
  setQuickCalcRetailMarkup,
  quickCalcResult,
  quickMachineBreak,
  onSelectOrder,
  onCancelOrder,
  onDeleteOrder,
  onTabChange,
  onSendWhatsAppQuote,
  machineConfig,
}: AdminOverviewPanelProps) {
  const chartData = useMemo(
    () =>
      [...orders]
        .map((o) => ({
          name:
            new Date(o.createdAt?.seconds * 1000).toLocaleDateString() || "N/A",
          total: o.total || 0,
        }))
        .reverse(),
    [orders]
  );

  const pieData = useMemo(() => {
    let pending = 0, paid = 0, production = 0, completed = 0;
    for (const o of orders) {
      if (o.status === "PENDING_PAYMENT") pending++;
      else if (o.status === "PAID") paid++;
      else if (["QUEUE", "SLICING", "PRINTING", "FINISHING"].includes(o.status)) production++;
      else if (o.status === "COMPLETED") completed++;
    }
    return [
      { name: "Pendente", value: pending },
      { name: "Pago", value: paid },
      { name: "Produção", value: production },
      { name: "Concluído", value: completed },
    ];
  }, [orders]);

  const ordersByStatus = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      if (searchTerm && !(o.userName?.toLowerCase().includes(searchTerm.toLowerCase())) && !(o.id.toLowerCase().includes(searchTerm.toLowerCase()))) continue;
      const arr = map.get(o.status) || [];
      arr.push(o);
      map.set(o.status, arr);
    }
    return map;
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
      {/* TOP STATS */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
        <div className="col-span-2 glass rounded-[28px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-white/5 relative overflow-hidden group min-h-[150px] sm:min-h-[190px]" role="status" aria-live="polite">
          <TrendingUp className="absolute top-6 right-6 sm:top-10 sm:right-10 w-16 h-16 sm:w-24 sm:h-24 text-primary opacity-10" aria-hidden="true" />
          <p className="text-[10px] text-dim uppercase font-black tracking-widest mb-2 italic">
            Receita Acumulada
          </p>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black italic tracking-tighter break-words" aria-label={`Receita acumulada: R$ ${orders.filter(o => o.status !== "CANCELED").reduce((acc, o) => acc + (o.total || 0), 0).toFixed(2)}`}>
            R${" "}
            {orders
              .filter(o => o.status !== "CANCELED")
              .reduce((acc, o) => acc + (o.total || 0), 0)
              .toFixed(2)}
          </h2>
        </div>
        <div className="bg-surface-card rounded-[28px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-white/5 flex flex-col justify-center min-h-[130px] sm:min-h-[190px]">
          <p className="text-[10px] text-dim uppercase font-black tracking-widest mb-1 italic">
            Em Produção
          </p>
          <h3 className="text-3xl sm:text-4xl font-display font-black italic text-primary" aria-label={`${orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELED").length} pedidos em produção`}>
            {orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELED").length}
          </h3>
        </div>
        <div className="bg-surface-card rounded-[28px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 border border-white/5 flex flex-col justify-center min-h-[130px] sm:min-h-[190px]">
          <p className="text-[10px] text-dim uppercase font-black tracking-widest mb-1 italic">
            Orçamentos
          </p>
          <h3 className="text-3xl sm:text-4xl font-display font-black italic" aria-label={`${quotes.filter((q) => q.status === "PENDING").length} orçamentos pendentes`}>
            {quotes.filter((q) => q.status === "PENDING").length}
          </h3>
        </div>
      </div>

      {/* RECENT ACTIVITY BENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Orders */}
        <div className="bg-surface-card rounded-[28px] sm:rounded-[40px] p-4 sm:p-6 lg:p-8 border border-white/5 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2" id="recent-orders-title">
              <Package className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> Últimos Pedidos
            </h3>
            <button
              onClick={() => onTabChange("orders")}
              className="shrink-0 text-[9px] font-black uppercase text-dim hover:text-white transition-colors rounded-xl px-3 py-2 hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Ver todos os pedidos"
            >
              Ver Todos
            </button>
          </div>
          <ul className="space-y-3" aria-labelledby="recent-orders-title">
            {orders.filter(o => o.status !== "CANCELED").slice(0, 4).map((o) => (
              <li
                key={o.id}
                className="flex justify-between items-center gap-3 p-3 sm:p-4 bg-white/[0.01] hover:bg-white/[0.02] rounded-2xl border border-white/5 transition-colors min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center font-mono text-[9px] font-bold text-white/40">
                    #{o.id.slice(0, 4)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase truncate max-w-[120px]">
                      {o.userName}
                    </p>
                    <p className="text-[11px] text-dim uppercase font-black tracking-widest">
                      {new Date(
                        o.createdAt?.seconds * 1000
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-display font-black text-primary italic">
                  R$ {(o.total || 0).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent Quotes */}
        <div className="bg-surface-card rounded-[28px] sm:rounded-[40px] p-4 sm:p-6 lg:p-8 border border-white/5 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2" id="recent-quotes-title">
              <FileText className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" /> Consultas de
              Preço
            </h3>
            <button
              onClick={() => onTabChange("quotes")}
              className="shrink-0 text-[9px] font-black uppercase text-dim hover:text-white transition-colors rounded-xl px-3 py-2 hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Ver todos os orçamentos pendentes"
            >
              Ver Todos
            </button>
          </div>
          <ul className="space-y-3" aria-labelledby="recent-quotes-title">
            {quotes.slice(0, 4).map((q) => (
              <li
                key={q.id}
                className="flex justify-between items-center gap-3 p-3 sm:p-4 bg-white/[0.01] hover:bg-white/[0.02] rounded-2xl border border-white/5 transition-colors min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase truncate max-w-[120px]">
                      {q.userName}
                    </p>
                    <p className="text-[11px] text-dim uppercase font-black tracking-widest truncate max-w-[150px]">
                      {q.fileName}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                  PENDENTE
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CENTRAL INTELLIGENT PRICING ASSISTANT & QUICK WHATSAPP SENDER */}
      <div className="glass rounded-[28px] sm:rounded-[40px] p-4 sm:p-6 lg:p-8 border border-white/5 bg-gradient-to-b from-white/[0.01] to-black/40 space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black uppercase tracking-widest italic text-white">
                Assistente Cálculo Maker Rápido
              </h3>
              <p className="text-[9px] text-secondary uppercase font-black tracking-widest">
                P2S + AMS | Equatorial Pará | custo real com atacado e varejo
              </p>
            </div>
          </div>
          <span className="w-fit text-[9px] font-black tracking-wider uppercase text-white/50 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
            Maker V6.0
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
          {/* COLUNA 1: DADOS DO CLIENTE */}
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-white/40 border-b border-white/5 pb-2">
              1. Dados do Cliente e Peça
            </h4>
            <div>
              <label className="text-[9px] text-white/40 uppercase font-bold flex items-center gap-1 mb-1">
                Nome do Cliente
                <span title="Nome para personalizar a mensagem de orçamento no WhatsApp">
                  <HelpCircle className="w-3 h-3 text-dim cursor-help" />
                </span>
              </label>
              <input
                type="text"
                value={quickCalcCustomerName}
                onChange={(e) => setQuickCalcCustomerName(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-white/30 text-white font-bold"
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <label className="text-[9px] text-white/40 uppercase font-bold flex items-center gap-1 mb-1">
                WhatsApp (DDD + Número)
                <span title="Número usado para abrir o WhatsApp Web com o orçamento já preenchido">
                  <HelpCircle className="w-3 h-3 text-dim cursor-help" />
                </span>
              </label>
              <input
                type="text"
                value={quickCalcPhone}
                onChange={(e) => setQuickCalcPhone(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-white/30 text-white font-mono font-bold"
                placeholder="Ex: 11999998888"
              />
            </div>
            <div>
              <label className="text-[9px] text-white/40 uppercase font-bold flex items-center gap-1 mb-1">
                Nome do Modelo 3D
                <span title="Nome da peça ou projeto para identificação no orçamento">
                  <HelpCircle className="w-3 h-3 text-dim cursor-help" />
                </span>
              </label>
              <input
                type="text"
                value={quickCalcPieceName}
                onChange={(e) => setQuickCalcPieceName(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-white/30 text-white font-bold"
                placeholder="Ex: Suporte de Headset"
              />
            </div>
          </div>

          {/* COLUNA 2: ESPECIFICAÇÕES TÉCNICAS */}
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-white/40 border-b border-white/5 pb-2">
              2. Especificações da Impressão
            </h4>

            {/* SELETOR DE MATERIAL */}
            <div>
              <label className="text-[9px] text-white/40 uppercase font-bold flex items-center gap-1 mb-2">
                Material
                <span title={HELP.material}>
                  <HelpCircle className="w-3 h-3 text-dim cursor-help" />
                </span>
              </label>
              <div className="flex gap-2">
                {(
                  Object.keys(MATERIAL_PRESETS) as Array<
                    keyof typeof MATERIAL_PRESETS
                  >
                ).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setQuickCalcMaterial(key)}
                    className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                      quickCalcMaterial === key
                        ? "bg-white text-[#07080d] border-white"
                        : "bg-white/[0.03] border-white/10 text-white/40 hover:border-white/20"
                    }`}
                  >
                    {MATERIAL_PRESETS[key].label}
                    <span className="block text-[11px] font-bold mt-0.5 opacity-70">
                      R$
                      {(MATERIAL_PRESETS[key].spoolPrice / 10).toFixed(0)}
                      /100g
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 min-[430px]:grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-white/40 uppercase font-bold flex items-center gap-1 mb-1">
                  Peso Job/Lote (g)
                  <span title={HELP.weight}>
                    <HelpCircle className="w-3 h-3 text-dim cursor-help" />
                  </span>
                </label>
                <NumInput
                  min={0}
                  value={quickCalcWeight}
                  onChange={setQuickCalcWeight}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-white/30 text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/40 uppercase font-bold flex items-center gap-1 mb-1">
                  Peças no Lote
                  <span title={HELP.quantity}>
                    <HelpCircle className="w-3 h-3 text-dim cursor-help" />
                  </span>
                </label>
                <NumInput
                  min={1}
                  value={quickCalcBatchQty}
                  onChange={setQuickCalcBatchQty}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-white/30 text-white font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] text-white/40 uppercase font-bold flex items-center gap-1 mb-1">
                Tempo Total
                <span title={HELP.time}>
                  <HelpCircle className="w-3 h-3 text-dim cursor-help" />
                </span>
              </label>
              <input
                type="text"
                value={quickCalcTime}
                onChange={(e) => setQuickCalcTime(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-white/30 text-white font-mono font-bold"
                placeholder="Ex: 2h 30m"
              />
            </div>

            {/* PREMISSAS CONFIGURÁVEIS */}
            <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 space-y-3">
              <p className="text-[11px] uppercase font-black text-white/40 tracking-wider">
                Premissas P2S — Equatorial Pará
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-black/50 border border-white/5 p-2">
                  <span className="flex items-center gap-1 text-[10px] text-secondary uppercase font-black">
                    Energia P2S
                    <span
                      title={`${HELP.steadyPower} ${HELP.startupPower}`}
                    >
                      <HelpCircle className="w-2.5 h-2.5 text-dim cursor-help" />
                    </span>
                  </span>
                  <strong className="text-[10px] text-white font-mono">
                    {MATERIAL_PRESETS[quickCalcMaterial].steadyPowerWatts}W +
                    pico 1kW
                  </strong>
                </div>
                <div className="rounded-xl bg-black/50 border border-white/5 p-2">
                  <span className="flex items-center gap-1 text-[10px] text-secondary uppercase font-black">
                    Tarifa Pará
                    <span title={HELP.kwh}>
                      <HelpCircle className="w-2.5 h-2.5 text-dim cursor-help" />
                    </span>
                  </span>
                  <strong className="text-[10px] text-white font-mono">
                    {formatBRL(DEFAULT_ENERGY.kwhCost)}/kWh
                  </strong>
                </div>
                <div className="rounded-xl bg-black/50 border border-white/5 p-2">
                  <span className="flex items-center gap-1 text-[10px] text-secondary uppercase font-black">
                    Hora-Máquina
                    <span
                      title={`${HELP.depreciation} ${HELP.replacement}`}
                    >
                      <HelpCircle className="w-2.5 h-2.5 text-dim cursor-help" />
                    </span>
                  </span>
                  <strong className="text-[10px] text-white font-mono">
                    {formatBRL(quickCalcResult.machineHourCost)}/h
                  </strong>
                  <span className="block text-[10px] text-white/40 font-mono leading-tight mt-0.5">
                    Deprec. {formatBRL(quickMachineBreak.depreciation)}/h ·
                    Reposição {formatBRL(quickMachineBreak.replacement)}/h
                  </span>
                </div>
                <div className="rounded-xl bg-black/50 border border-white/5 p-2">
                  <span className="flex items-center gap-1 text-[10px] text-secondary uppercase font-black">
                    Material
                    <span
                      title={`${MATERIAL_PRESETS[quickCalcMaterial].label}: R$${MATERIAL_PRESETS[quickCalcMaterial].spoolPrice}/kg`}
                    >
                      <HelpCircle className="w-2.5 h-2.5 text-dim cursor-help" />
                    </span>
                  </span>
                  <strong className="text-[10px] text-white font-mono">
                    R${MATERIAL_PRESETS[quickCalcMaterial].spoolPrice}/kg
                  </strong>
                </div>
              </div>
              <div className="grid grid-cols-1 min-[430px]:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-secondary uppercase flex items-center gap-1 font-black">
                    Reserva Material %
                    <span title={HELP.reserve}>
                      <HelpCircle className="w-2.5 h-2.5 text-dim cursor-help" />
                    </span>
                  </label>
                  <NumInput
                    min={0}
                    max={100}
                    step={5}
                    value={quickCalcMaterialReserve}
                    onChange={setQuickCalcMaterialReserve}
                    className="w-full bg-black/50 border border-white/5 rounded-lg p-1 text-[9px] font-mono text-white text-center mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-secondary uppercase flex items-center gap-1 font-black">
                    Taxa de Falha %
                    <span title={HELP.failureRate}>
                      <HelpCircle className="w-2.5 h-2.5 text-dim cursor-help" />
                    </span>
                  </label>
                  <NumInput
                    min={0}
                    max={100}
                    step={1}
                    value={quickCalcFailureRate}
                    onChange={setQuickCalcFailureRate}
                    className="w-full bg-black/50 border border-white/5 rounded-lg p-1 text-[9px] font-mono text-white text-center mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-secondary uppercase flex items-center gap-1 font-black">
                    Preço Mínimo R$
                    <span title={HELP.minPrice}>
                      <HelpCircle className="w-2.5 h-2.5 text-dim cursor-help" />
                    </span>
                  </label>
                  <NumInput
                    min={0}
                    step={5}
                    value={quickCalcMinPrice}
                    onChange={setQuickCalcMinPrice}
                    className="w-full bg-black/50 border border-white/5 rounded-lg p-1 text-[9px] font-mono text-white text-center mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-secondary uppercase flex items-center gap-1 font-black">
                    Atacado ×
                    <span title={HELP.wholesale}>
                      <HelpCircle className="w-2.5 h-2.5 text-dim cursor-help" />
                    </span>
                  </label>
                  <NumInput
                    min={0}
                    step={0.1}
                    value={quickCalcWholesaleMarkup}
                    onChange={setQuickCalcWholesaleMarkup}
                    className="w-full bg-black/50 border border-white/5 rounded-lg p-1 text-[9px] font-mono text-white text-center mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-secondary uppercase flex items-center gap-1 font-black">
                    Varejo ×
                    <span title={HELP.retail}>
                      <HelpCircle className="w-2.5 h-2.5 text-dim cursor-help" />
                    </span>
                  </label>
                  <NumInput
                    min={0}
                    step={0.1}
                    value={quickCalcRetailMarkup}
                    onChange={setQuickCalcRetailMarkup}
                    className="w-full bg-black/50 border border-white/5 rounded-lg p-1 text-[9px] font-mono text-white text-center mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA 3: RESULTADO */}
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-white/40 border-b border-white/5 pb-2">
              3. Custo Real e Lucro
            </h4>

            <div className="card-glow bg-white/[0.02] border border-white/10 rounded-[24px] p-4 sm:p-5 space-y-3 shadow-[0_0_24px_rgba(37,99,235,0.08)]">
              {/* CUSTO REAL */}
              <div className="flex justify-between gap-3 text-xs text-white/70">
                <span className="min-w-0">
                  Material ({quickCalcResult.weightGrams.toFixed(1)}g +{" "}
                  {quickCalcMaterialReserve}% reserva):
                </span>
                <span className="shrink-0 font-mono text-white">
                  {formatBRL(quickCalcResult.materialCost)}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-xs text-white/70">
                <span className="min-w-0">
                  Energia ({quickCalcResult.energyKwh.toFixed(3)} kWh):
                </span>
                <span className="shrink-0 font-mono text-white">
                  {formatBRL(quickCalcResult.energyCost)}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-xs text-white/70">
                <span className="min-w-0">
                  Hora-máquina ({quickCalcResult.hours.toFixed(2)}h ×{" "}
                  {formatBRL(quickCalcResult.machineHourCost)}):
                </span>
                <span className="shrink-0 font-mono text-white">
                  {formatBRL(quickCalcResult.machineCost)}
                </span>
              </div>
              {quickCalcResult.failureLoss > 0 && (
                <div className="flex justify-between gap-3 text-xs text-white/70">
                  <span className="min-w-0">
                    Falhas ({quickCalcFailureRate}% de retrabalho):
                  </span>
                  <span className="shrink-0 font-mono text-white">
                    {formatBRL(quickCalcResult.failureLoss)}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-3 text-xs font-bold text-white/40 border-t border-white/5 pt-2">
                <span>Custo real do lote:</span>
                <span className="shrink-0 font-mono text-white/80">
                  {formatBRL(quickCalcResult.totalCost)}
                </span>
              </div>

              {/* BARRA DE DISTRIBUIÇÃO */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between text-[9px] uppercase font-black tracking-wider text-white/35">
                  <span>Custo unitário interno</span>
                  <span className="font-mono text-white/70">
                    {formatBRL(quickCalcResult.unitCost)}
                  </span>
                </div>
                <div className="mt-2 flex h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400"
                    style={{
                      width: `${quickCalcResult.shares.material}%`,
                    }}
                  />
                  <div
                    className="h-full bg-amber-400"
                    style={{
                      width: `${quickCalcResult.shares.energy}%`,
                    }}
                  />
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${quickCalcResult.shares.machine}%`,
                    }}
                  />
                  <div
                    className="h-full bg-orange-500"
                    style={{
                      width: `${quickCalcResult.shares.failure}%`,
                    }}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 min-[430px]:grid-cols-4 gap-1 text-[10px] uppercase font-black text-white/35">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-1.5 rounded-sm bg-cyan-400" />
                    Mat. {quickCalcResult.shares.material.toFixed(0)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-1.5 rounded-sm bg-amber-400" />
                    Ener. {quickCalcResult.shares.energy.toFixed(0)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-1.5 rounded-sm bg-primary" />
                    Maq. {quickCalcResult.shares.machine.toFixed(0)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-1.5 rounded-sm bg-orange-500" />
                    Falha {quickCalcResult.shares.failure.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* PREÇOS ATACADO / VAREJO */}
              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 border-t border-white/10 pt-3">
                <div
                  className={`rounded-2xl border p-3 ${
                    quickCalcResult.isBelowMinWholesale
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : "border-amber-400/20 bg-amber-400/[0.06]"
                  }`}
                >
                  <span className="flex items-center gap-1 text-[11px] uppercase font-black text-amber-300 tracking-wider">
                    Atacado ×{quickCalcWholesaleMarkup}
                    {quickCalcResult.isBelowMinWholesale && (
                      <span title="Preço calculado estava abaixo do mínimo. Aplicando preço mínimo.">
                        <AlertCircle className="w-3 h-3 text-yellow-400" />
                      </span>
                    )}
                  </span>
                  <strong className="block text-sm font-mono text-white mt-1 break-words">
                    {formatBRL(quickCalcResult.wholesaleTotal)}
                  </strong>
                  <span className="block text-[9px] text-white/50 mt-0.5">
                    {formatBRL(quickCalcResult.wholesaleUnit)} / un.
                  </span>
                  <span className="block text-[11px] text-emerald-400 font-black mt-1">
                    Lucro: {formatBRL(quickCalcResult.profitWholesale)} (
                    {quickCalcResult.profitWholesalePct.toFixed(0)}
                    %)
                  </span>
                </div>
                <div
                  className={`rounded-2xl border p-3 ${
                    quickCalcResult.isBelowMinRetail
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : "border-primary/30 bg-primary/10"
                  }`}
                >
                  <span className="flex items-center gap-1 text-[11px] uppercase font-black text-primary tracking-wider">
                    Varejo ×{quickCalcRetailMarkup}
                    {quickCalcResult.isBelowMinRetail && (
                      <span title="Preço calculado estava abaixo do mínimo. Aplicando preço mínimo.">
                        <AlertCircle className="w-3 h-3 text-yellow-400" />
                      </span>
                    )}
                  </span>
                  <strong className="block text-sm font-mono text-white mt-1 break-words">
                    {formatBRL(quickCalcResult.retailTotal)}
                  </strong>
                  <span className="block text-[9px] text-white/50 mt-0.5">
                    {formatBRL(quickCalcResult.retailUnit)} / un.
                  </span>
                  <span className="block text-[11px] text-emerald-400 font-black mt-1">
                    Lucro: {formatBRL(quickCalcResult.profitRetail)} (
                    {quickCalcResult.profitRetailPct.toFixed(0)}
                    %)
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              disabled={!quickCalcPhone.replace(/\D/g, "")}
              onClick={onSendWhatsAppQuote}
              className="w-full min-h-11 h-auto rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-[10px] sm:text-xs font-black uppercase tracking-wider text-black flex items-center justify-center gap-2 px-3 py-3 text-center shadow-lg shadow-[#25D366]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Smartphone className="w-4 h-4" /> Enviar Orçamento por WhatsApp
            </Button>
          </div>
        </div>
      </div>

      {/* ESTEIRA DE PRODUÇÃO (KANBAN) DIRETA NA TELA INICIAL */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center bg-white/[0.02] p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-white/5">
          <div className="min-w-0">
            <h3 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2">
              <Layers className="w-4 h-4 shrink-0 text-primary" /> Esteira de
              Produção
            </h3>
            <p className="text-[10px] text-dim uppercase font-bold tracking-widest">
              Controle logístico e manufatura diretamente no dashboard inicial
            </p>
          </div>
          <span className="w-fit text-[11px] font-black uppercase tracking-widest text-secondary bg-white/5 border border-white/5 rounded-full px-3 py-1">
            Arraste para ver etapas
          </span>
        </div>

        <div className="flex gap-3 sm:gap-5 lg:gap-6 overflow-x-auto pb-4 snap-x no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0" role="list" aria-label="Esteira de produção - Kanban">
          {KANBAN_STAGES.map((stage) => {
            const stageOrders = ordersByStatus.get(stage.id) || [];
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                role="listitem"
                aria-label={`${stage.label}: ${stageOrders.length} pedidos`}
                className="min-w-[245px] sm:min-w-[300px] flex-shrink-0 snap-start bg-[#0A0A0F] border border-white/5 rounded-[26px] sm:rounded-[32px] flex flex-col h-[390px] sm:h-[420px]"
              >
                <div className="p-4 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <h4 className="text-[10px] font-black uppercase text-white/70 truncate">
                        {stage.label}
                      </h4>
                    </div>
                    <span className="text-[9px] font-black bg-white/5 px-2 py-0.5 rounded-full text-white/40">
                      {stageOrders.length}
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto no-scrollbar space-y-3">
                  {stageOrders.map((o) => (
                    <div
                      key={o.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Pedido ${o.id.slice(0, 8)} de ${o.userName}, R$ ${(o.total || 0).toFixed(2)}, status ${stage.label}`}
                      className="bg-surface-card p-3 sm:p-4 rounded-[20px] border border-white/5 hover:border-primary/50 cursor-pointer transition-all group hover:shadow-[0_0_15px_rgba(37,99,235,0.08)] min-h-[44px] relative"
                    >
                      {/* Quick actions on hover */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {o.status !== "CANCELED" && o.status !== "COMPLETED" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onCancelOrder(o); }}
                            className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all"
                            title="Cancelar pedido"
                          >
                            <AlertCircle className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteOrder(o); }}
                          className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all"
                          title="Excluir pedido"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div onClick={() => onSelectOrder(o)}>
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[11px] font-mono text-secondary">
                          #{o.id.slice(0, 8)}
                        </p>
                        <p className="text-[9px] font-display font-black text-primary italic bg-primary/10 px-1.5 py-0.5 rounded-md">
                          R$ {(o.total || 0).toFixed(2)}
                        </p>
                      </div>
                      <h5 className="text-xs font-black uppercase truncate group-hover:text-white text-white/80 transition-colors">
                        {o.userName}
                      </h5>
                      <p className="text-[9px] text-secondary line-clamp-1 mb-3 mt-1 font-bold">
                        {o.items
                          ?.map((i: OrderItem) => i.name || i.fileName)
                          .join(" • ")}
                      </p>
                      <div className="flex items-center justify-between border-t border-white/5 pt-2">
                        <p className="text-[11px] font-mono text-dim">
                          {new Date(
                            o.createdAt?.seconds * 1000
                          ).toLocaleDateString()}
                        </p>
                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-dim group-hover:bg-primary group-hover:text-white transition-all">
                          <ArrowRight className="w-2.5 h-2.5" />
                        </div>
                      </div>
                      </div>
                    </div>
                  ))}
                  {stageOrders.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-[11px] font-black uppercase text-subtle tracking-widest border border-white/5 border-dashed rounded-xl p-3 w-3/4 mx-auto">
                        Sem Pedidos
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
        <div className="xl:col-span-3 glass rounded-[28px] sm:rounded-[48px] p-4 sm:p-8 lg:p-10 border border-white/5 h-[280px] sm:h-[360px] lg:h-[400px]" role="img" aria-label="Gráfico de receita acumulada por data">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#ffffff05"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="#ffffff10"
                fontSize={9}
                tick={{ fill: "#ffffff20" }}
              />
              <YAxis
                stroke="#ffffff10"
                fontSize={9}
                tick={{ fill: "#ffffff20" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0A0A0F",
                  border: "1px solid rgba(37,99,235,0.1)",
                  borderRadius: "24px",
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#2563EB"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-[28px] sm:rounded-[48px] p-4 sm:p-8 lg:p-10 border border-white/5 flex flex-col items-center justify-center relative min-h-[260px]" role="img" aria-label={`Gráfico de distribuição de pedidos: ${orders.length} no total`}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={60}
                outerRadius={85}
                paddingAngle={10}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
            <span className="text-2xl font-black italic">{orders.length}</span>
            <span className="text-[11px] font-black uppercase text-dim">
              Pedidos
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default AdminOverviewPanel;

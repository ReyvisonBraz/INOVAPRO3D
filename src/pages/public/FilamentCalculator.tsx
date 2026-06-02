import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  Download,
  Factory,
  Gauge,
  Hash,
  Layers3,
  Paintbrush,
  Package,
  Settings2,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function getMachineRate(hours: number) {
  if (hours <= 3) return 8;
  if (hours <= 6) return 6;
  return 5;
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  hint?: string;
};

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  prefix,
  suffix,
  disabled,
  hint,
}: NumberFieldProps) {
  return (
    <label className={cn("block space-y-2", disabled && "opacity-45")}>
      <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <span className="relative block">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(safeNumber(Number(event.target.value)))}
          className={cn(
            "h-12 w-full rounded-xl border border-slate-700/70 bg-[#0b1020] px-3 text-sm font-black text-white outline-none transition",
            "focus:border-cyan-400/70 focus:bg-[#0d1428] focus:ring-2 focus:ring-cyan-400/10",
            prefix && "pl-9",
            suffix && "pr-11",
            disabled && "cursor-not-allowed",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">
            {suffix}
          </span>
        )}
      </span>
      {hint && (
        <span className="block text-[9px] text-slate-600 leading-snug">{hint}</span>
      )}
    </label>
  );
}


function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-700/70 bg-[#121829] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.25)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.22em] text-slate-100">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 rounded-full border transition",
        checked ? "border-cyan-300/60 bg-cyan-400/25" : "border-slate-700 bg-[#0b1020]",
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.65)] transition",
          checked ? "left-6" : "left-1",
        )}
      />
    </button>
  );
}

function CostBar({
  label,
  value,
  percent,
  color,
}: {
  label: string;
  value: number;
  percent: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            {label}
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs font-black text-slate-200">{currency.format(value)}</span>
          <span className="ml-2 font-mono text-[10px] font-bold text-slate-600">{percent.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function ImpactBadge({
  label,
  percent,
  color,
}: {
  label: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-[#0b1020] p-3 text-center">
      <div className={cn("mx-auto mb-2 h-2 w-8 rounded-full", color)} />
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-sm font-black text-white">{percent.toFixed(0)}%</p>
    </div>
  );
}

function PriceBox({
  title,
  description,
  total,
  unit,
  tone,
}: {
  title: string;
  description: string;
  total: number;
  unit: number;
  tone: "cyan" | "violet";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        tone === "cyan"
          ? "border-cyan-400/20 bg-cyan-400/10"
          : "border-violet-400/20 bg-violet-400/10",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-black uppercase tracking-[0.2em]",
          tone === "cyan" ? "text-cyan-200" : "text-violet-200",
        )}
      >
        {title}
      </p>
      <p className="mt-1 min-h-8 text-xs leading-relaxed text-slate-500">{description}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Total do lote</p>
          <p className="mt-1 text-lg font-black text-white">{currency.format(total)}</p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Unitário</p>
          <p className="mt-1 text-lg font-black text-white">{currency.format(unit)}</p>
        </div>
      </div>
    </div>
  );
}

function ReportLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="maker-report-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function FilamentCalculator() {
  const [spoolPrice, setSpoolPrice] = useState(100);
  const [spoolWeight, setSpoolWeight] = useState(1000);
  const [slicerWeight, setSlicerWeight] = useState(120);
  const [materialReservePercent, setMaterialReservePercent] = useState(50);
  const [batchQuantity, setBatchQuantity] = useState(1);

  const [printTime, setPrintTime] = useState(3.47);
  const [kwhCost, setKwhCost] = useState(1.15);
  const [machinePower, setMachinePower] = useState(200);
  const [startupPower, setStartupPower] = useState(1000);
  const [startupMinutes, setStartupMinutes] = useState(5);

  const [requiresPostProcessing, setRequiresPostProcessing] = useState(false);
  const [manualWorkHours, setManualWorkHours] = useState(0);
  const [manualHourlyRate, setManualHourlyRate] = useState(15);
  const [extraSuppliesCost, setExtraSuppliesCost] = useState(0);
  const [wholesaleMarkup, setWholesaleMarkup] = useState(1.6);
  const [retailMarkup, setRetailMarkup] = useState(2.5);

  const result = useMemo(() => {
    const quantity = Math.max(1, safeNumber(batchQuantity, 1));
    const nominalWeight = Math.max(1, safeNumber(spoolWeight, 1000));
    const hours = Math.max(0, safeNumber(printTime));
    const realWeight = Math.max(0, safeNumber(slicerWeight));
    const reserveMultiplier = 1 + Math.max(0, materialReservePercent) / 100;
    const materialCost = realWeight * (Math.max(0, spoolPrice) / nominalWeight) * reserveMultiplier;
    const startupHours = Math.min(hours, Math.max(0, startupMinutes) / 60);
    const steadyHours = Math.max(0, hours - startupHours);
    const energyKwh =
      (startupHours * Math.max(0, startupPower) + steadyHours * Math.max(0, machinePower)) / 1000;
    const energyCost = energyKwh * Math.max(0, kwhCost);
    const machineRate = getMachineRate(hours);
    const machineCost = hours * machineRate;
    const laborCost = requiresPostProcessing ? Math.max(0, manualWorkHours) * Math.max(0, manualHourlyRate) : 0;
    const postProcessingCost = requiresPostProcessing ? laborCost + Math.max(0, extraSuppliesCost) : 0;
    const totalCost = materialCost + energyCost + machineCost + postProcessingCost;
    const unitCost = totalCost / quantity;
    const wholesaleTotal = totalCost * Math.max(0, wholesaleMarkup);
    const retailTotal = totalCost * Math.max(0, retailMarkup);
    const costPerGram = realWeight > 0 ? totalCost / realWeight : 0;
    const percent = (value: number) => (totalCost > 0 ? (value / totalCost) * 100 : 0);

    return {
      realWeight,
      reserveMultiplier,
      materialCost,
      energyCost,
      machineRate,
      machineCost,
      energyKwh,
      startupHours,
      steadyHours,
      postProcessingCost,
      totalCost,
      unitCost,
      costPerGram,
      wholesaleTotal,
      wholesaleUnit: wholesaleTotal / quantity,
      retailTotal,
      retailUnit: retailTotal / quantity,
      percents: {
        material: percent(materialCost),
        energy: percent(energyCost),
        machine: percent(machineCost),
        postProcessing: percent(postProcessingCost),
      },
    };
  }, [
    batchQuantity,
    extraSuppliesCost,
    kwhCost,
    machinePower,
    manualHourlyRate,
    manualWorkHours,
    materialReservePercent,
    printTime,
    requiresPostProcessing,
    retailMarkup,
    slicerWeight,
    spoolPrice,
    spoolWeight,
    startupMinutes,
    startupPower,
    wholesaleMarkup,
  ]);

  const generatedAt = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <>
    <div className="maker-screen min-h-screen bg-[#0a0f1d] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                <Calculator className="h-5 w-5" />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
                CÁLCULO <span className="text-cyan-300">MAKER</span>
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              Projetado para precisão — custo real da manufatura aditiva
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-[#121829] px-3 py-2">
              <Settings2 className="h-3 w-3" />
              NIST-SPEC V4.2
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-[#121829] px-3 py-2">
              <Hash className="h-3 w-3" /># MOTOR DE PRECISÃO
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/5 px-3 py-2 text-cyan-300/70">
              Bambu Lab P2S + AMS
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)]">
          <div className="space-y-5">
            <SectionCard
              icon={Package}
              title="Parâmetros de Material"
              subtitle="Use os dados exibidos pelo Bambu Studio após o fatiamento"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Preço do carretel"
                  prefix="R$"
                  value={spoolPrice}
                  onChange={setSpoolPrice}
                  step={0.01}
                  hint="Valor pago pelo carretel. Verifique a nota fiscal."
                />
                <NumberField
                  label="Peso nominal do carretel"
                  suffix="g"
                  value={spoolWeight}
                  onChange={setSpoolWeight}
                  hint="Normalmente 1000g (1kg). Verifique o rótulo da embalagem."
                />
              </div>

              <div className="mt-5">
                <NumberField
                  label="Peso total do job/lote no slicer"
                  suffix="g"
                  value={slicerWeight}
                  onChange={setSlicerWeight}
                  min={1}
                  step={1}
                  hint="Copie o campo 'Filamento utilizado' do Bambu Studio. Esse valor já inclui purga e suportes."
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Quantidade de peças no lote"
                  value={batchQuantity}
                  onChange={setBatchQuantity}
                  min={1}
                  hint="Quantas peças individuais há nesta impressão. Divide o custo total pelo número de unidades."
                />
                <NumberField
                  label="Fundo de reposição de estoque"
                  suffix="%"
                  value={materialReservePercent}
                  onChange={setMaterialReservePercent}
                  step={5}
                  hint="Margem para cobrir falhas de impressão. PLA experiente: 10–15%. Material difícil: 25–30%."
                />
              </div>

              <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-xs text-slate-500">
                Peso técnico usado no cálculo:{" "}
                <span className="font-mono font-black text-cyan-300">{decimal.format(result.realWeight)}g</span>
                {" "}— valor direto do Bambu Studio. A purga já está incluída nesse peso.
              </div>
            </SectionCard>

            <SectionCard
              icon={Zap}
              title="Eficiência Energética"
              subtitle="Configure com os dados da sua P2S e da sua conta de luz"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <NumberField
                  label="Tempo total do job/lote"
                  suffix="h"
                  value={printTime}
                  onChange={setPrintTime}
                  step={0.01}
                  hint="Tempo de impressão mostrado pelo Bambu Studio. Ex: 3h 28min = 3.47"
                />
                <NumberField
                  label="Custo kWh"
                  prefix="R$"
                  value={kwhCost}
                  onChange={setKwhCost}
                  step={0.01}
                  hint="Equatorial Pará 2025: ~R$1,20/kWh. Verifique sua conta de luz."
                />
                <NumberField
                  label="Potência média da impressora"
                  suffix="W"
                  value={machinePower}
                  onChange={setMachinePower}
                  hint="P2S em regime: 200W (PLA) ou 230W (PETG)."
                />
                <NumberField
                  label="Pico aquecimento inicial"
                  suffix="W"
                  value={startupPower}
                  onChange={setStartupPower}
                  hint="Consumo máximo nos primeiros minutos. P2S: ~1000W."
                />
                <NumberField
                  label="Duração do pico"
                  suffix="min"
                  value={startupMinutes}
                  onChange={setStartupMinutes}
                  step={0.5}
                  hint="Tempo que a P2S fica no pico de consumo ao aquecer a câmara. ~8 min."
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-orange-400/15 bg-orange-400/5 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Taxa aplicada</p>
                  <p className="mt-1 font-mono text-lg font-black text-orange-300">
                    {currency.format(result.machineRate)}/h
                  </p>
                </div>
                <div className="rounded-xl border border-violet-400/15 bg-violet-400/5 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                    Depreciação
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-violet-300">
                    {currency.format(result.machineCost)}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                    Energia estimada
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-cyan-300">
                    {decimal.format(result.energyKwh)} kWh
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-700/70 bg-[#0b1020] px-4 py-3 text-xs leading-relaxed text-slate-500">
                Padrão Bambu Lab P2S em rede 110 V: <span className="font-black text-slate-200">200 W</span> em
                PLA estável, com pico de <span className="font-black text-slate-200">1000 W</span> por cerca de 3 a
                5 min no aquecimento da mesa. Em rede 220 V, use 1200 W no pico.
              </div>
            </SectionCard>

            <SectionCard
              icon={Paintbrush}
              title="Pós-processamento & Acessórios"
              subtitle="Mão de obra técnica, pintura e insumos extras"
            >
              <div className="flex flex-col gap-4 rounded-xl border border-slate-700/70 bg-[#0b1020] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-100">
                    Requer Acabamento Manual / Pintura Básica?
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ative para computar lixamento, pintura, ferragens, chaveiros ou sprays.
                  </p>
                </div>
                <Toggle checked={requiresPostProcessing} onChange={setRequiresPostProcessing} />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <NumberField
                  label="Tempo de trabalho manual"
                  suffix="h"
                  value={manualWorkHours}
                  onChange={setManualWorkHours}
                  step={0.25}
                  disabled={!requiresPostProcessing}
                />
                <NumberField
                  label="Valor da hora técnica"
                  prefix="R$"
                  value={manualHourlyRate}
                  onChange={setManualHourlyRate}
                  step={1}
                />
                <NumberField
                  label="Custo de insumos extras"
                  prefix="R$"
                  value={extraSuppliesCost}
                  onChange={setExtraSuppliesCost}
                  step={0.01}
                  disabled={!requiresPostProcessing}
                />
              </div>
            </SectionCard>
          </div>

          <aside className="rounded-xl border border-cyan-400/15 bg-[#121829] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] lg:p-6 xl:sticky xl:top-24">
            <div className="flex flex-col gap-5 border-b border-slate-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Custo real de produção
                </p>
                <div className="mt-3 flex items-start gap-2">
                  <span className="mt-2 text-xl font-black text-slate-500">R$</span>
                  <span className="text-5xl font-black tracking-tight text-white sm:text-6xl">
                    {result.totalCost.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Por grama</p>
                <p className="mt-1 font-mono text-xl font-black text-cyan-300">
                  R$ {decimal.format(result.costPerGram)}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <CostBar
                label="Material"
                value={result.materialCost}
                percent={result.percents.material}
                color="bg-cyan-400"
              />
              <CostBar
                label="Energia"
                value={result.energyCost}
                percent={result.percents.energy}
                color="bg-orange-400"
              />
              <CostBar
                label="Taxa de máquina / Depreciação"
                value={result.machineCost}
                percent={result.percents.machine}
                color="bg-violet-400"
              />
              <CostBar
                label="Pós-processamento"
                value={result.postProcessingCost}
                percent={result.percents.postProcessing}
                color="bg-rose-400"
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ImpactBadge label="Material" percent={result.percents.material} color="bg-cyan-400" />
              <ImpactBadge label="Energia" percent={result.percents.energy} color="bg-orange-400" />
              <ImpactBadge label="Máquina" percent={result.percents.machine} color="bg-violet-400" />
              <ImpactBadge label="Pós" percent={result.percents.postProcessing} color="bg-rose-400" />
            </div>

            <div className="mt-6 rounded-xl border border-slate-700/70 bg-[#0b1020] p-4">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-slate-100">
                  Sugestão de venda comercial
                </h3>
              </div>
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <NumberField
                  label="Multiplicador atacado"
                  value={wholesaleMarkup}
                  onChange={setWholesaleMarkup}
                  step={0.1}
                />
                <NumberField
                  label="Multiplicador varejo"
                  value={retailMarkup}
                  onChange={setRetailMarkup}
                  step={0.1}
                />
              </div>
              <div className="grid gap-4">
                <PriceBox
                  title={`Preço Sugerido Atacado (${wholesaleMarkup.toFixed(1)}x)`}
                  description="Ideal para cliente que vai revender ou fechar lote recorrente."
                  total={result.wholesaleTotal}
                  unit={result.wholesaleUnit}
                  tone="cyan"
                />
                <PriceBox
                  title={`Preço Sugerido Varejo (${retailMarkup.toFixed(1)}x)`}
                  description="Ideal para venda normal direta no site ou pedido sob demanda."
                  total={result.retailTotal}
                  unit={result.retailUnit}
                  tone="violet"
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-yellow-400/35 bg-yellow-400/10 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
                <p className="text-xs font-semibold leading-relaxed text-yellow-100/80">
                  Cálculo técnico comercial avançado. Computa depreciação de máquina em faixas regressivas,
                  fundo de reposição de estoque ajustável, purga de filamento AMS e custo de insumos manuais.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="mt-5 inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-cyan-400/30 bg-cyan-300 px-5 text-xs font-black uppercase tracking-[0.18em] text-[#07111f] transition hover:bg-white hover:shadow-[0_0_30px_rgba(34,211,238,0.18)] active:scale-[0.99]"
            >
              <Download className="h-4 w-4" />
              Gerar relatório PDF
            </button>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-slate-800 bg-[#0b1020] p-3">
                <Factory className="mx-auto mb-2 h-4 w-4 text-violet-300" />
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">Lote</p>
                <p className="font-mono text-sm font-black text-white">{Math.max(1, batchQuantity)} un.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#0b1020] p-3">
                <Layers3 className="mx-auto mb-2 h-4 w-4 text-cyan-300" />
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">Unitário</p>
                <p className="font-mono text-sm font-black text-white">{currency.format(result.unitCost)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#0b1020] p-3">
                <Gauge className="mx-auto mb-2 h-4 w-4 text-orange-300" />
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">Horas</p>
                <p className="font-mono text-sm font-black text-white">{decimal.format(printTime)}h</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
    <section className="maker-print-report" aria-label="Relatório Cálculo Maker">
      <article className="maker-report-page">
      <header className="maker-report-header">
        <div>
          <p className="maker-report-kicker">INOVAPRO3D</p>
          <h1>Via do Cliente</h1>
          <p>Proposta comercial para manufatura aditiva</p>
        </div>
        <div className="maker-report-meta">
          <span>Bambu Lab P2S + AMS</span>
          <span>Gerado em {generatedAt}</span>
        </div>
      </header>

      <div className="maker-report-highlight maker-report-highlight-client">
        <div>
          <span>Preço varejo total</span>
          <strong>{currency.format(result.retailTotal)}</strong>
        </div>
        <div>
          <span>Preço unitário</span>
          <strong>{currency.format(result.retailUnit)}</strong>
        </div>
        <div>
          <span>Quantidade</span>
          <strong>{Math.max(1, batchQuantity)} un.</strong>
        </div>
      </div>

      <div className="maker-report-grid">
        <section className="maker-report-card">
          <h2>Resumo do Projeto</h2>
          <ReportLine label="Processo" value="Impressão 3D FDM" />
          <ReportLine label="Equipamento" value="Bambu Lab P2S + AMS" />
          <ReportLine label="Quantidade no lote" value={`${Math.max(1, batchQuantity)} un.`} />
          <ReportLine label="Tempo estimado de produção" value={`${decimal.format(printTime)}h`} />
        </section>

        <section className="maker-report-card">
          <h2>Especificações Técnicas</h2>
          <ReportLine label="Peso técnico estimado" value={`${decimal.format(result.realWeight)}g`} />
          <ReportLine label="Pós-processamento" value={requiresPostProcessing ? "Incluso" : "Não incluso"} />
          <ReportLine label="Validade da proposta" value="7 dias corridos" />
        </section>

        <section className="maker-report-card maker-report-wide-card">
          <h2>Condições Comerciais</h2>
          <ReportLine label="Preço sugerido para venda direta" value={currency.format(result.retailTotal)} />
          <ReportLine label="Preço por unidade" value={currency.format(result.retailUnit)} />
          <ReportLine label="Preço para lote/revenda" value={currency.format(result.wholesaleTotal)} />
          <ReportLine label="Unitário lote/revenda" value={currency.format(result.wholesaleUnit)} />
        </section>
      </div>

      <footer className="maker-report-footer">
        <strong>Observação:</strong> esta via apresenta valores comerciais finais e estimativas técnicas do serviço.
        Custos internos de produção, margens e composição operacional são reservados à INOVAPRO3D.
      </footer>
      </article>

      <article className="maker-report-page maker-report-page-production">
      <header className="maker-report-header">
        <div>
          <p className="maker-report-kicker">INOVAPRO3D</p>
          <h1>Via da Produção</h1>
          <p>Ficha técnica interna de custos e execução</p>
        </div>
        <div className="maker-report-meta">
          <span>Bambu Lab P2S + AMS</span>
          <span>Gerado em {generatedAt}</span>
        </div>
      </header>

      <div className="maker-report-highlight">
        <div>
          <span>Custo real de produção</span>
          <strong>{currency.format(result.totalCost)}</strong>
        </div>
        <div>
          <span>Custo unitário</span>
          <strong>{currency.format(result.unitCost)}</strong>
        </div>
        <div>
          <span>Custo por grama</span>
          <strong>R$ {decimal.format(result.costPerGram)}</strong>
        </div>
      </div>

      <div className="maker-report-grid maker-report-compact-grid">
        <section className="maker-report-card">
          <h2>Parâmetros do Job</h2>
          <ReportLine label="Peso slicer" value={`${decimal.format(slicerWeight)}g`} />
          <ReportLine label="Peso técnico" value={`${decimal.format(result.realWeight)}g`} />
          <ReportLine label="Peças no lote" value={`${Math.max(1, batchQuantity)} un.`} />
          <ReportLine label="Tempo total" value={`${decimal.format(printTime)}h`} />
        </section>

        <section className="maker-report-card">
          <h2>Material e Energia</h2>
          <ReportLine label="Carretel" value={currency.format(spoolPrice)} />
          <ReportLine label="Peso nominal" value={`${decimal.format(spoolWeight)}g`} />
          <ReportLine label="Fundo reposição" value={`${materialReservePercent}%`} />
          <ReportLine label="Consumo" value={`${decimal.format(result.energyKwh)} kWh`} />
          <ReportLine label="Tarifa kWh" value={currency.format(kwhCost)} />
        </section>

        <section className="maker-report-card">
          <h2>Máquina e Pós</h2>
          <ReportLine label="Potência PLA" value={`${machinePower} W`} />
          <ReportLine label="Pico inicial" value={`${startupPower} W / ${startupMinutes} min`} />
          <ReportLine label="Taxa máquina" value={`${currency.format(result.machineRate)}/h`} />
          <ReportLine label="Hora técnica" value={`${currency.format(manualHourlyRate)}/h`} />
          <ReportLine
            label="Pós-processamento"
            value={requiresPostProcessing ? currency.format(result.postProcessingCost) : "Não aplicado"}
          />
        </section>

        <section className="maker-report-card">
          <h2>Comercial Interno</h2>
          <ReportLine label={`Atacado ${wholesaleMarkup.toFixed(1)}x total`} value={currency.format(result.wholesaleTotal)} />
          <ReportLine label="Atacado unitário" value={currency.format(result.wholesaleUnit)} />
          <ReportLine label={`Varejo ${retailMarkup.toFixed(1)}x total`} value={currency.format(result.retailTotal)} />
          <ReportLine label="Varejo unitário" value={currency.format(result.retailUnit)} />
        </section>
      </div>

      <section className="maker-report-table">
        <h2>Distribuição de Custos</h2>
        <table>
          <thead>
            <tr>
              <th>Componente</th>
              <th>Valor</th>
              <th>Impacto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Material</td>
              <td>{currency.format(result.materialCost)}</td>
              <td>{result.percents.material.toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Energia</td>
              <td>{currency.format(result.energyCost)}</td>
              <td>{result.percents.energy.toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Taxa de máquina / depreciação</td>
              <td>{currency.format(result.machineCost)}</td>
              <td>{result.percents.machine.toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Pós-processamento</td>
              <td>{currency.format(result.postProcessingCost)}</td>
              <td>{result.percents.postProcessing.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="maker-report-footer">
        <strong>Nota interna:</strong> cálculo com potência da P2S em 110 V, pico de aquecimento, purga AMS,
        fundo de reposição, hora-máquina regressiva e custos manuais quando aplicáveis.
      </footer>
      </article>
    </section>
    </>
  );
}

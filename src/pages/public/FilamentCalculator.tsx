import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  Coins,
  Cpu,
  Download,
  Factory,
  Gauge,
  Hash,
  HelpCircle,
  Layers3,
  Package,
  Settings2,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  computePricing,
  DEFAULT_ENERGY,
  DEFAULT_MACHINE,
  formatBRL,
  HELP,
  machineHourBreakdown,
  MATERIAL_PRESETS,
  type MaterialKey,
} from "../../lib/pricing";
import { BrandMark } from "../../components/brand/BrandLogo";
import { FloatingBackground } from "../../components/ui/FloatingBackground";
import { Reveal } from "../../components/ui/Reveal";

const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

const CONFIG_KEY = "inovapro3d:calc-config";

function HelpTip({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex">
      <HelpCircle className="h-3 w-3 cursor-help text-slate-600 transition-colors hover:text-cyan-300" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-slate-700 bg-[#0b1020] px-3 py-2 text-[10px] font-medium leading-snug text-slate-300 opacity-0 shadow-xl transition-opacity duration-150 group-hover/tip:opacity-100">
        {text}
      </span>
    </span>
  );
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
  help?: string;
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
  help,
}: NumberFieldProps) {
  return (
    <label className={cn("block space-y-2", disabled && "opacity-45")}>
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
        {help && <HelpTip text={help} />}
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
    <section className="bg-white/[0.03] border border-white/8 rounded-[28px] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.25)]">
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
          <span className="font-mono text-xs font-black text-slate-200">{formatBRL(value)}</span>
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

function MachineStat({
  label,
  value,
  help,
  highlight,
}: {
  label: string;
  value: string;
  help?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 text-center",
        highlight
          ? "border-cyan-400/30 bg-cyan-400/10"
          : "border-slate-700/70 bg-[#0b1020]",
      )}
    >
      <p className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
        {help && <HelpTip text={help} />}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-sm font-black",
          highlight ? "text-cyan-300" : "text-white",
        )}
      >
        {value}
      </p>
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
        "card-glow rounded-xl border p-4",
        tone === "cyan"
          ? "border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_18px_rgba(37,99,235,0.15)]"
          : "border-violet-400/30 bg-violet-400/10 shadow-[0_0_18px_rgba(139,92,246,0.15)]",
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
          <p className="mt-1 text-lg font-black text-white">{formatBRL(total)}</p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Unitário</p>
          <p className="mt-1 text-lg font-black text-white">{formatBRL(unit)}</p>
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
  // --- Material / job ---
  const [material, setMaterial] = useState<MaterialKey>("pla");
  const [spoolPrice, setSpoolPrice] = useState(MATERIAL_PRESETS.pla.spoolPrice);
  const [spoolWeight, setSpoolWeight] = useState(1000);
  const [slicerWeight, setSlicerWeight] = useState(120);
  const [reservePct, setReservePct] = useState(MATERIAL_PRESETS.pla.defaultReservePct);
  const [batchQuantity, setBatchQuantity] = useState(1);

  // --- Machine ---
  const [machinePrice, setMachinePrice] = useState(DEFAULT_MACHINE.price);
  const [lifespanHours, setLifespanHours] = useState(DEFAULT_MACHINE.lifespanHours);
  const [nozzlePrice, setNozzlePrice] = useState(DEFAULT_MACHINE.nozzlePrice);
  const [nozzleLifeHours, setNozzleLifeHours] = useState(DEFAULT_MACHINE.nozzleLifeHours);
  const [platePrice, setPlatePrice] = useState(DEFAULT_MACHINE.platePrice);
  const [plateLifeHours, setPlateLifeHours] = useState(DEFAULT_MACHINE.plateLifeHours);
  const [beltsPrice, setBeltsPrice] = useState(DEFAULT_MACHINE.beltsPrice);
  const [beltsLifeHours, setBeltsLifeHours] = useState(DEFAULT_MACHINE.beltsLifeHours);
  const [maintPerHour, setMaintPerHour] = useState(DEFAULT_MACHINE.maintPerHour);

  // --- Energy ---
  const [printTime, setPrintTime] = useState(3.47);
  const [kwhCost, setKwhCost] = useState(DEFAULT_ENERGY.kwhCost);
  const [steadyPower, setSteadyPower] = useState(MATERIAL_PRESETS.pla.steadyPowerWatts);
  const [startupPower, setStartupPower] = useState(1000);
  const [startupMinutes, setStartupMinutes] = useState(8);

  // --- Labor ---
  const [requiresLabor, setRequiresLabor] = useState(false);
  const [laborHours, setLaborHours] = useState(0);
  const [laborRate, setLaborRate] = useState(25);
  const [extraSupplies, setExtraSupplies] = useState(0);

  // --- Pricing ---
  const [wholesaleMarkup, setWholesaleMarkup] = useState(1.6);
  const [retailMarkup, setRetailMarkup] = useState(2.5);
  const [minPrice, setMinPrice] = useState(35);

  function selectMaterial(key: MaterialKey) {
    const preset = MATERIAL_PRESETS[key];
    setMaterial(key);
    setSpoolPrice(preset.spoolPrice);
    setSpoolWeight(preset.spoolWeight);
    setSteadyPower(preset.steadyPowerWatts);
    setReservePct(preset.defaultReservePct);
  }

  // --- Load persisted business config on mount ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return;
      const cfg = JSON.parse(raw);
      if (typeof cfg !== "object" || cfg === null) return;
      if (cfg.material === "pla" || cfg.material === "petg") setMaterial(cfg.material);
      if (Number.isFinite(cfg.spoolPrice)) setSpoolPrice(cfg.spoolPrice);
      if (Number.isFinite(cfg.spoolWeight)) setSpoolWeight(cfg.spoolWeight);
      if (Number.isFinite(cfg.reservePct)) setReservePct(cfg.reservePct);
      if (Number.isFinite(cfg.machinePrice)) setMachinePrice(cfg.machinePrice);
      if (Number.isFinite(cfg.lifespanHours)) setLifespanHours(cfg.lifespanHours);
      if (Number.isFinite(cfg.nozzlePrice)) setNozzlePrice(cfg.nozzlePrice);
      if (Number.isFinite(cfg.nozzleLifeHours)) setNozzleLifeHours(cfg.nozzleLifeHours);
      if (Number.isFinite(cfg.platePrice)) setPlatePrice(cfg.platePrice);
      if (Number.isFinite(cfg.plateLifeHours)) setPlateLifeHours(cfg.plateLifeHours);
      if (Number.isFinite(cfg.beltsPrice)) setBeltsPrice(cfg.beltsPrice);
      if (Number.isFinite(cfg.beltsLifeHours)) setBeltsLifeHours(cfg.beltsLifeHours);
      if (Number.isFinite(cfg.maintPerHour)) setMaintPerHour(cfg.maintPerHour);
      if (Number.isFinite(cfg.kwhCost)) setKwhCost(cfg.kwhCost);
      if (Number.isFinite(cfg.steadyPower)) setSteadyPower(cfg.steadyPower);
      if (Number.isFinite(cfg.startupPower)) setStartupPower(cfg.startupPower);
      if (Number.isFinite(cfg.startupMinutes)) setStartupMinutes(cfg.startupMinutes);
      if (Number.isFinite(cfg.laborRate)) setLaborRate(cfg.laborRate);
      if (Number.isFinite(cfg.wholesaleMarkup)) setWholesaleMarkup(cfg.wholesaleMarkup);
      if (Number.isFinite(cfg.retailMarkup)) setRetailMarkup(cfg.retailMarkup);
      if (Number.isFinite(cfg.minPrice)) setMinPrice(cfg.minPrice);
    } catch {
      // ignore corrupt config
    }
  }, []);

  // --- Persist business config (NOT per-job fields) ---
  useEffect(() => {
    try {
      const cfg = {
        material,
        spoolPrice,
        spoolWeight,
        reservePct,
        machinePrice,
        lifespanHours,
        nozzlePrice,
        nozzleLifeHours,
        platePrice,
        plateLifeHours,
        beltsPrice,
        beltsLifeHours,
        maintPerHour,
        kwhCost,
        steadyPower,
        startupPower,
        startupMinutes,
        laborRate,
        wholesaleMarkup,
        retailMarkup,
        minPrice,
      };
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    } catch {
      // ignore storage failures (private mode, quota)
    }
  }, [
    material,
    spoolPrice,
    spoolWeight,
    reservePct,
    machinePrice,
    lifespanHours,
    nozzlePrice,
    nozzleLifeHours,
    platePrice,
    plateLifeHours,
    beltsPrice,
    beltsLifeHours,
    maintPerHour,
    kwhCost,
    steadyPower,
    startupPower,
    startupMinutes,
    laborRate,
    wholesaleMarkup,
    retailMarkup,
    minPrice,
  ]);

  const machineBreak = machineHourBreakdown({
    price: machinePrice,
    lifespanHours,
    nozzlePrice,
    nozzleLifeHours,
    platePrice,
    plateLifeHours,
    beltsPrice,
    beltsLifeHours,
    maintPerHour,
  });

  const result = useMemo(
    () =>
      computePricing({
        material,
        spoolPrice,
        spoolWeight,
        steadyPowerWatts: steadyPower,
        weightGrams: slicerWeight,
        hours: printTime,
        quantity: batchQuantity,
        reservePct,
        kwhCost,
        startupPowerWatts: startupPower,
        startupMinutes,
        machine: {
          price: machinePrice,
          lifespanHours,
          nozzlePrice,
          nozzleLifeHours,
          platePrice,
          plateLifeHours,
          beltsPrice,
          beltsLifeHours,
          maintPerHour,
        },
        laborHours: requiresLabor ? laborHours : 0,
        laborRate,
        extraSupplies: requiresLabor ? extraSupplies : 0,
        wholesaleMarkup,
        retailMarkup,
        minPrice,
      }),
    [
      material,
      spoolPrice,
      spoolWeight,
      steadyPower,
      slicerWeight,
      printTime,
      batchQuantity,
      reservePct,
      kwhCost,
      startupPower,
      startupMinutes,
      machinePrice,
      lifespanHours,
      nozzlePrice,
      nozzleLifeHours,
      platePrice,
      plateLifeHours,
      beltsPrice,
      beltsLifeHours,
      maintPerHour,
      requiresLabor,
      laborHours,
      laborRate,
      extraSupplies,
      wholesaleMarkup,
      retailMarkup,
      minPrice,
    ],
  );

  const reserveMultiplier = 1 + Math.max(0, reservePct) / 100;
  const laborTotal = result.laborCost + result.extraSupplies;

  const generatedAt = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <>
    <div className="maker-screen relative overflow-hidden min-h-screen bg-[#0a0f1d] px-4 py-8 text-white sm:px-6 lg:px-8">
      <FloatingBackground subtle variant="grid" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <BrandMark className="h-8 w-8" />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                <Calculator className="h-5 w-5" />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
                CÁLCULO <span className="text-cyan-300">MAKER</span>
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              Entenda cada centavo: material, energia, depreciação da máquina e seu lucro real
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-[#121829] px-3 py-2">
              <Settings2 className="h-3 w-3" />
              MOTOR V6.0
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
            {/* 1. MÁQUINA & DEPRECIAÇÃO — centerpiece */}
            <Reveal delay={0}>
            <SectionCard
              icon={Cpu}
              title="Máquina & Depreciação"
              subtitle="Entenda quanto a sua P2S custa por hora de uso"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Preço da máquina (P2S + AMS)"
                  prefix="R$"
                  value={machinePrice}
                  onChange={setMachinePrice}
                  step={1}
                  help={HELP.machinePrice}
                />
                <NumberField
                  label="Vida útil da máquina"
                  suffix="h"
                  value={lifespanHours}
                  onChange={setLifespanHours}
                  min={1}
                  step={100}
                  help={HELP.lifespan}
                />
              </div>

              <p className="mt-5 mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                <Wrench className="h-3 w-3" /> Fundo de reposição de peças
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Bico — preço"
                  prefix="R$"
                  value={nozzlePrice}
                  onChange={setNozzlePrice}
                  step={1}
                  help={HELP.nozzle}
                />
                <NumberField
                  label="Bico — vida útil"
                  suffix="h"
                  value={nozzleLifeHours}
                  onChange={setNozzleLifeHours}
                  min={1}
                  step={50}
                  help={HELP.nozzle}
                />
                <NumberField
                  label="Placa / PEI — preço"
                  prefix="R$"
                  value={platePrice}
                  onChange={setPlatePrice}
                  step={1}
                  help={HELP.plate}
                />
                <NumberField
                  label="Placa / PEI — vida útil"
                  suffix="h"
                  value={plateLifeHours}
                  onChange={setPlateLifeHours}
                  min={1}
                  step={50}
                  help={HELP.plate}
                />
                <NumberField
                  label="Correias (par) — preço"
                  prefix="R$"
                  value={beltsPrice}
                  onChange={setBeltsPrice}
                  step={1}
                  help={HELP.belts}
                />
                <NumberField
                  label="Correias — vida útil"
                  suffix="h"
                  value={beltsLifeHours}
                  onChange={setBeltsLifeHours}
                  min={1}
                  step={50}
                  help={HELP.belts}
                />
              </div>

              <div className="mt-4">
                <NumberField
                  label="Manutenção geral"
                  prefix="R$"
                  suffix="/h"
                  value={maintPerHour}
                  onChange={setMaintPerHour}
                  step={0.01}
                  help={HELP.maint}
                />
              </div>

              {/* Live readout */}
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MachineStat
                  label="Depreciação"
                  value={`${formatBRL(machineBreak.depreciation)}/h`}
                  help={HELP.depreciation}
                />
                <MachineStat
                  label="Reposição de peças"
                  value={`${formatBRL(machineBreak.replacement)}/h`}
                  help={HELP.replacement}
                />
                <MachineStat
                  label="Custo-máquina total"
                  value={`${formatBRL(machineBreak.total)}/h`}
                  highlight
                />
              </div>

              <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-xs leading-relaxed text-slate-400">
                Cada hora de impressão consome{" "}
                <span className="font-black text-cyan-300">{formatBRL(machineBreak.total)}/h</span> da sua máquina —{" "}
                <span className="font-black text-slate-200">{formatBRL(machineBreak.depreciation)}</span> de desgaste do
                equipamento +{" "}
                <span className="font-black text-slate-200">{formatBRL(machineBreak.replacement)}</span> reservado para
                repor peças.
              </div>
            </SectionCard>
            </Reveal>

            {/* 2. MATERIAL */}
            <Reveal delay={0.1}>
            <SectionCard
              icon={Package}
              title="Material (Filamento)"
              subtitle="Escolha o filamento e ajuste com os dados do Bambu Studio"
            >
              <div className="mb-5 grid grid-cols-2 gap-3">
                {(Object.keys(MATERIAL_PRESETS) as MaterialKey[]).map((key) => {
                  const preset = MATERIAL_PRESETS[key];
                  const active = material === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectMaterial(key)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left transition",
                        active
                          ? "border-cyan-300/60 bg-cyan-400/15 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                          : "border-slate-700/70 bg-[#0b1020] hover:border-slate-600",
                      )}
                    >
                      <p
                        className={cn(
                          "text-sm font-black uppercase tracking-[0.18em]",
                          active ? "text-cyan-200" : "text-slate-200",
                        )}
                      >
                        {preset.label}
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-slate-500">
                        R${preset.spoolPrice}/kg
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Preço do carretel"
                  prefix="R$"
                  value={spoolPrice}
                  onChange={setSpoolPrice}
                  step={0.01}
                  help={HELP.spoolPrice}
                />
                <NumberField
                  label="Peso do carretel"
                  suffix="g"
                  value={spoolWeight}
                  onChange={setSpoolWeight}
                  min={1}
                  help={HELP.spoolWeight}
                />
              </div>

              <div className="mt-5">
                <NumberField
                  label="Filamento utilizado (slicer)"
                  suffix="g"
                  value={slicerWeight}
                  onChange={setSlicerWeight}
                  min={1}
                  step={1}
                  help={HELP.weight}
                  hint="Campo 'Filamento utilizado' do Bambu Studio"
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Reserva para falhas"
                  suffix="%"
                  value={reservePct}
                  onChange={setReservePct}
                  step={5}
                  help={HELP.reserve}
                />
                <NumberField
                  label="Peças no lote"
                  value={batchQuantity}
                  onChange={setBatchQuantity}
                  min={1}
                  help={HELP.quantity}
                />
              </div>

              <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-xs text-slate-500">
                Custo por grama (com reserva de {reservePct}%):{" "}
                <span className="font-mono font-black text-cyan-300">
                  R$ {decimal.format(result.gramCost * reserveMultiplier)}
                </span>
                {" "}/g
              </div>
            </SectionCard>
            </Reveal>

            {/* 3. ENERGIA */}
            <Reveal delay={0.2}>
            <SectionCard
              icon={Zap}
              title="Energia"
              subtitle="Tarifa da sua conta de luz e consumo real da P2S"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <NumberField
                  label="Tempo de impressão"
                  suffix="h"
                  value={printTime}
                  onChange={setPrintTime}
                  step={0.01}
                  help={HELP.time}
                />
                <NumberField
                  label="Custo do kWh"
                  prefix="R$"
                  value={kwhCost}
                  onChange={setKwhCost}
                  step={0.01}
                  help={HELP.kwh}
                />
                <NumberField
                  label="Potência média"
                  suffix="W"
                  value={steadyPower}
                  onChange={setSteadyPower}
                  help={HELP.steadyPower}
                />
                <NumberField
                  label="Pico de aquecimento"
                  suffix="W"
                  value={startupPower}
                  onChange={setStartupPower}
                  help={HELP.startupPower}
                />
                <NumberField
                  label="Duração do pico"
                  suffix="min"
                  value={startupMinutes}
                  onChange={setStartupMinutes}
                  step={0.5}
                  help={HELP.startupMinutes}
                />
                <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
                    Consumo estimado
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-cyan-300">
                    {decimal.format(result.energyKwh)} kWh
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    = {formatBRL(result.energyCost)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-700/70 bg-[#0b1020] px-4 py-3 text-xs leading-relaxed text-slate-500">
                A energia soma o <span className="font-black text-slate-200">pico de aquecimento</span> nos primeiros
                minutos com o <span className="font-black text-slate-200">regime estável</span> pelo resto da
                impressão — por isso jobs curtos pesam proporcionalmente mais na conta.
              </div>
            </SectionCard>
            </Reveal>

            {/* 4. MÃO DE OBRA & INSUMOS */}
            <Reveal delay={0.3}>
            <SectionCard
              icon={Wrench}
              title="Mão de Obra & Insumos"
              subtitle="Seu tempo de trabalho e materiais extras do job"
            >
              <div className="flex flex-col gap-4 rounded-xl border border-slate-700/70 bg-[#0b1020] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-100">
                    Tem trabalho manual / pós-processamento?
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ative para computar fatiar, tirar suportes, lixar, pintar, montar e embalar.
                  </p>
                </div>
                <Toggle checked={requiresLabor} onChange={setRequiresLabor} />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <NumberField
                  label="Horas de trabalho"
                  suffix="h"
                  value={laborHours}
                  onChange={setLaborHours}
                  step={0.25}
                  disabled={!requiresLabor}
                  help={HELP.laborHours}
                />
                <NumberField
                  label="Valor da sua hora"
                  prefix="R$"
                  value={laborRate}
                  onChange={setLaborRate}
                  step={1}
                  help={HELP.laborRate}
                />
                <NumberField
                  label="Insumos extras"
                  prefix="R$"
                  value={extraSupplies}
                  onChange={setExtraSupplies}
                  step={0.01}
                  disabled={!requiresLabor}
                  help={HELP.extraSupplies}
                />
              </div>
            </SectionCard>
            </Reveal>
          </div>

          <aside className="bg-white/[0.03] border border-white/8 rounded-[28px] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] lg:p-6 xl:sticky xl:top-24">
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
                percent={result.shares.material}
                color="bg-cyan-400"
              />
              <CostBar
                label="Energia"
                value={result.energyCost}
                percent={result.shares.energy}
                color="bg-orange-400"
              />
              <CostBar
                label="Máquina"
                value={result.machineCost}
                percent={result.shares.machine}
                color="bg-violet-400"
              />
              <CostBar
                label="Mão de obra"
                value={laborTotal}
                percent={result.shares.labor}
                color="bg-rose-400"
              />
            </div>

            <div className="mt-6 rounded-xl border border-slate-700/70 bg-[#0b1020] p-4">
              <div className="mb-4 flex items-center gap-2">
                <Coins className="h-4 w-4 text-cyan-300" />
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-slate-100">
                  Preço de venda & lucro
                </h3>
              </div>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <NumberField
                  label="Atacado ×"
                  value={wholesaleMarkup}
                  onChange={setWholesaleMarkup}
                  step={0.1}
                  help={HELP.wholesale}
                />
                <NumberField
                  label="Varejo ×"
                  value={retailMarkup}
                  onChange={setRetailMarkup}
                  step={0.1}
                  help={HELP.retail}
                />
                <NumberField
                  label="Preço mínimo"
                  prefix="R$"
                  value={minPrice}
                  onChange={setMinPrice}
                  step={1}
                  help={HELP.minPrice}
                />
              </div>
              <div className="grid gap-4">
                <div>
                  <PriceBox
                    title={`Atacado (${wholesaleMarkup.toFixed(1)}x)`}
                    description="Ideal para cliente que revende ou fecha lote recorrente."
                    total={result.wholesaleTotal}
                    unit={result.wholesaleUnit}
                    tone="cyan"
                  />
                  <p className="mt-2 px-1 text-xs font-black text-emerald-400">
                    Lucro: {formatBRL(result.profitWholesale)} ({result.profitWholesalePct.toFixed(0)}%)
                  </p>
                  {result.isBelowMinWholesale && (
                    <p className="mt-1 px-1 text-[10px] font-bold text-yellow-300">
                      preço mínimo aplicado
                    </p>
                  )}
                </div>
                <div>
                  <PriceBox
                    title={`Varejo (${retailMarkup.toFixed(1)}x)`}
                    description="Ideal para venda direta ao cliente final, sob demanda."
                    total={result.retailTotal}
                    unit={result.retailUnit}
                    tone="violet"
                  />
                  <p className="mt-2 px-1 text-xs font-black text-emerald-400">
                    Lucro: {formatBRL(result.profitRetail)} ({result.profitRetailPct.toFixed(0)}%)
                  </p>
                  {result.isBelowMinRetail && (
                    <p className="mt-1 px-1 text-[10px] font-bold text-yellow-300">
                      preço mínimo aplicado
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-yellow-400/35 bg-yellow-400/10 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
                <p className="text-xs font-semibold leading-relaxed text-yellow-100/80">
                  Cálculo transparente: depreciação real da máquina diluída na vida útil, fundo de reposição de bico,
                  placa e correias, energia com pico de aquecimento e sua mão de obra. Passe o mouse nos "?" para
                  entender cada campo.
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
                <p className="font-mono text-sm font-black text-white">{formatBRL(result.unitCost)}</p>
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
          <strong>{formatBRL(result.retailTotal)}</strong>
        </div>
        <div>
          <span>Preço unitário</span>
          <strong>{formatBRL(result.retailUnit)}</strong>
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
          <ReportLine label="Peso técnico estimado" value={`${decimal.format(result.weightGrams)}g`} />
          <ReportLine label="Material" value={MATERIAL_PRESETS[material].label} />
          <ReportLine label="Pós-processamento" value={requiresLabor ? "Incluso" : "Não incluso"} />
          <ReportLine label="Validade da proposta" value="7 dias corridos" />
        </section>

        <section className="maker-report-card maker-report-wide-card">
          <h2>Condições Comerciais</h2>
          <ReportLine label="Preço sugerido para venda direta" value={formatBRL(result.retailTotal)} />
          <ReportLine label="Preço por unidade" value={formatBRL(result.retailUnit)} />
          <ReportLine label="Preço para lote/revenda" value={formatBRL(result.wholesaleTotal)} />
          <ReportLine label="Unitário lote/revenda" value={formatBRL(result.wholesaleUnit)} />
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
          <strong>{formatBRL(result.totalCost)}</strong>
        </div>
        <div>
          <span>Custo unitário</span>
          <strong>{formatBRL(result.unitCost)}</strong>
        </div>
        <div>
          <span>Custo por grama</span>
          <strong>R$ {decimal.format(result.costPerGram)}</strong>
        </div>
      </div>

      <div className="maker-report-grid maker-report-compact-grid">
        <section className="maker-report-card">
          <h2>Parâmetros do Job</h2>
          <ReportLine label="Filamento utilizado" value={`${decimal.format(slicerWeight)}g`} />
          <ReportLine label="Peso técnico" value={`${decimal.format(result.weightGrams)}g`} />
          <ReportLine label="Peças no lote" value={`${Math.max(1, batchQuantity)} un.`} />
          <ReportLine label="Tempo total" value={`${decimal.format(printTime)}h`} />
        </section>

        <section className="maker-report-card">
          <h2>Material e Energia</h2>
          <ReportLine label="Material" value={MATERIAL_PRESETS[material].label} />
          <ReportLine label="Carretel" value={formatBRL(spoolPrice)} />
          <ReportLine label="Peso nominal" value={`${decimal.format(spoolWeight)}g`} />
          <ReportLine label="Reserva falhas" value={`${reservePct}%`} />
          <ReportLine label="Consumo" value={`${decimal.format(result.energyKwh)} kWh`} />
          <ReportLine label="Tarifa kWh" value={formatBRL(kwhCost)} />
        </section>

        <section className="maker-report-card">
          <h2>Máquina e Mão de Obra</h2>
          <ReportLine label="Potência média" value={`${steadyPower} W`} />
          <ReportLine label="Pico inicial" value={`${startupPower} W / ${startupMinutes} min`} />
          <ReportLine label="Custo-máquina/h" value={`${formatBRL(result.machineHourCost)}/h`} />
          <ReportLine label="Depreciação/h" value={`${formatBRL(machineBreak.depreciation)}/h`} />
          <ReportLine label="Reposição/h" value={`${formatBRL(machineBreak.replacement)}/h`} />
          <ReportLine label="Hora de trabalho" value={`${formatBRL(laborRate)}/h`} />
          <ReportLine
            label="Mão de obra + insumos"
            value={requiresLabor ? formatBRL(laborTotal) : "Não aplicado"}
          />
        </section>

        <section className="maker-report-card">
          <h2>Comercial Interno</h2>
          <ReportLine label={`Atacado ${wholesaleMarkup.toFixed(1)}x total`} value={formatBRL(result.wholesaleTotal)} />
          <ReportLine label="Lucro atacado" value={`${formatBRL(result.profitWholesale)} (${result.profitWholesalePct.toFixed(0)}%)`} />
          <ReportLine label={`Varejo ${retailMarkup.toFixed(1)}x total`} value={formatBRL(result.retailTotal)} />
          <ReportLine label="Lucro varejo" value={`${formatBRL(result.profitRetail)} (${result.profitRetailPct.toFixed(0)}%)`} />
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
              <td>{formatBRL(result.materialCost)}</td>
              <td>{result.shares.material.toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Energia</td>
              <td>{formatBRL(result.energyCost)}</td>
              <td>{result.shares.energy.toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Máquina (depreciação + reposição)</td>
              <td>{formatBRL(result.machineCost)}</td>
              <td>{result.shares.machine.toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Mão de obra + insumos</td>
              <td>{formatBRL(laborTotal)}</td>
              <td>{result.shares.labor.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="maker-report-footer">
        <strong>Nota interna:</strong> cálculo pelo motor unificado INOVAPRO3D — depreciação da máquina diluída na
        vida útil, fundo de reposição de peças, energia com pico de aquecimento da P2S e mão de obra quando aplicável.
      </footer>
      </article>
    </section>
    </>
  );
}

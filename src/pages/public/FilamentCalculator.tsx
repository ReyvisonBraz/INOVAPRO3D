import React, { useEffect, useState } from "react";
import { PageSEO } from "../../components/seo/PageSEO";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Calculator,
  ChevronDown,
  Coins,
  Cpu,
  Download,
  Factory,
  Gauge,
  Hash,
  HelpCircle,
  ImagePlus,
  Layers3,
  Loader2,
  Package,
  Save,
  Search,
  Settings2,
  UserCheck,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatBRL, formatHoursToHHMM, HELP } from "../../lib/pricing";
import { BrandMark } from "../../components/brand/BrandLogo";
import { Reveal } from "../../components/ui/Reveal";
import { useCalculatorState, safeNumber } from "./calculator/useCalculatorState";
import { CalculatorProjectEditor } from "../../components/calculator/CalculatorProjectEditor";

const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function HelpTip({ text }: { text: string }) {
  return (
    <span
      className="group/tip relative inline-flex shrink-0 cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
      tabIndex={0}
      aria-label="Mostrar explicação deste campo"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.focus();
      }}
    >
      <HelpCircle className="h-4 w-4 text-cyan-200/70 transition-colors group-hover/tip:text-cyan-100" />
      <span
        role="tooltip"
        className="pointer-events-auto absolute bottom-full left-1/2 z-50 mb-2 hidden w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 cursor-text select-text rounded-xl border border-cyan-300/25 bg-[#080c15] px-4 py-3 text-[13px] font-medium leading-relaxed text-white/90 shadow-2xl group-hover/tip:block group-focus/tip:block"
      >
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
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <label className={cn("block space-y-2", disabled && "opacity-45")}>
      <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/65">
        {label}
        {help && <HelpTip text={help} />}
      </span>
      <span className="relative block">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={min}
          step={step}
          value={draft}
          disabled={disabled}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n)) {
              onChange(safeNumber(n));
            }
          }}
          onBlur={() => {
            const n = Number(draft);
            if (draft === "" || !Number.isFinite(n)) {
              const fallback = min ?? 0;
              setDraft(String(fallback));
              onChange(fallback);
            }
          }}
          className={cn(
            "h-12 w-full rounded-xl border border-white/15 bg-white/[0.055] px-3 text-base font-bold text-white outline-none transition",
            "focus:border-white/30 focus:ring-2 focus:ring-white/5",
            prefix && "pl-9",
            suffix && "pr-11",
            disabled && "cursor-not-allowed",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">
            {suffix}
          </span>
        )}
      </span>
      {hint && <span className="block text-xs leading-relaxed text-white/55">{hint}</span>}
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
    <section className="bg-white/[0.03] border border-white/[0.08] rounded-[28px] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.25)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.22em] text-white/90">{title}</h2>
          <p className="mt-1 text-xs text-white/40">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function CollapsibleSection({
  icon: Icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.03] shadow-[0_18px_70px_rgba(0,0,0,0.25)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.22em] text-white/90">
              {title}
            </h2>
            {!open && summary && (
              <p className="mt-0.5 text-[11px] font-bold text-cyan-300/80">{summary}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}

function AdvancedPanel({
  open,
  onToggle,
  label,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
      >
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/75">
          <Settings2 className="h-3.5 w-3.5" />
          {label}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-white/40 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 rounded-full border transition",
        checked ? "border-white/40 bg-white/25" : "border-white/10 bg-white/[0.04]",
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.55)] transition",
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
  help,
}: {
  label: string;
  value: number;
  percent: number;
  color: string;
  help?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
          <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-white/65">
            {label}
            {help && <HelpTip text={help} />}
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs font-black text-white/80">{formatBRL(value)}</span>
          <span className="ml-2 font-mono text-[10px] font-bold text-white/30">
            {percent.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
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
        highlight ? "border-cyan-400/30 bg-cyan-400/10" : "border-white/10 bg-white/[0.04]",
      )}
    >
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/60">
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
  tone: "wholesale" | "retail";
}) {
  return (
    <div
      className={cn(
        "card-glow rounded-xl border p-4",
        tone === "retail"
          ? "border-primary/30 bg-primary/10 shadow-[0_0_18px_rgba(37,99,235,0.15)]"
          : "border-amber-400/30 bg-amber-400/10 shadow-[0_0_18px_rgba(245,158,11,0.12)]",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-black uppercase tracking-[0.2em]",
          tone === "retail" ? "text-primary" : "text-amber-200",
        )}
      >
        {title}
      </p>
      <p className="mt-1 min-h-8 text-xs leading-relaxed text-white/40">{description}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
            Total do lote
          </p>
          <p className="mt-1 text-lg font-black text-white">{formatBRL(total)}</p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
            Unitário
          </p>
          <p className="mt-1 text-lg font-black text-white">{formatBRL(unit)}</p>
        </div>
      </div>
    </div>
  );
}

function ProfitLine({
  profit,
  marginPct,
  markupPct,
}: {
  profit: number;
  marginPct: number;
  markupPct: number;
}) {
  return (
    <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1.5">
      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300/70">
        Lucro
        <HelpTip text={HELP.profit} />
      </span>
      <span className="text-sm font-black text-emerald-300">{formatBRL(profit)}</span>
      <span className="ml-auto font-mono text-[10px] font-bold text-white/45">
        margem {marginPct.toFixed(0)}% · markup {markupPct.toFixed(0)}%
      </span>
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

export default function FilamentCalculator({ embedded = false }: { embedded?: boolean }) {
  const [printMode, setPrintMode] = useState<"CLIENT" | "PRODUCTION">("CLIENT");
  const {
    project,
    setProject,
    projectIssues,
    setProjectIssues,
    pricingSettings,
    projectPricing,
    spoolPrice,
    setSpoolPrice,
    spoolWeight,
    setSpoolWeight,
    reservePct,
    setReservePct,
    failureRatePct,
    setFailureRatePct,
    failureImpactPct,
    setFailureImpactPct,
    inventoryMaterials,
    machinePrice,
    setMachinePrice,
    lifespanHours,
    setLifespanHours,
    nozzlePrice,
    setNozzlePrice,
    nozzleLifeHours,
    setNozzleLifeHours,
    platePrice,
    setPlatePrice,
    plateLifeHours,
    setPlateLifeHours,
    beltsPrice,
    setBeltsPrice,
    beltsLifeHours,
    setBeltsLifeHours,
    maintPerHour,
    setMaintPerHour,
    kwhCost,
    setKwhCost,
    steadyPower,
    setSteadyPower,
    startupPower,
    setStartupPower,
    startupMinutes,
    setStartupMinutes,
    requiresLabor,
    setRequiresLabor,
    laborHours,
    setLaborHours,
    laborRate,
    setLaborRate,
    extraSupplies,
    setExtraSupplies,
    packagingCost,
    setPackagingCost,
    targetProfitPerMachineHour,
    setTargetProfitPerMachineHour,
    wholesaleMarkup,
    retailMarkup,
    minPrice,
    setMinPrice,
    markupMode,
    setMarkupMode,
    wholesaleDisplay,
    retailDisplay,
    markupLabel,
    handleWholesaleMarkup,
    handleRetailMarkup,
    showAdvancedMachine,
    setShowAdvancedMachine,
    showAdvancedEnergy,
    setShowAdvancedEnergy,
    showMachineConfig,
    setShowMachineConfig,
    showMaterialConfig,
    setShowMaterialConfig,
    showEnergyConfig,
    setShowEnergyConfig,
    showLaborConfig,
    setShowLaborConfig,
    savingCalc,
    handleSaveCalc,
    clientName,
    setClientName,
    clientLastName,
    setClientLastName,
    clientPhone,
    setClientPhone,
    selectedCustomerId,
    customerSearch,
    setCustomerSearch,
    customerMatches,
    selectQuoteCustomer,
    clearQuoteCustomer,
    priceTier,
    setPriceTier,
    quoteImageUrl,
    setQuoteImageUrl,
    uploadingImage,
    handleUploadImage,
    draftSavedAt,
    result,
    machineBreak,
    laborTotal,
    generatedAt,
  } = useCalculatorState();

  const quotedTotal = priceTier === "WHOLESALE" ? result.wholesaleTotal : result.retailTotal;
  const quotedUnit = priceTier === "WHOLESALE" ? result.wholesaleUnit : result.retailUnit;
  const negotiationFloor = Math.max(
    result.minimumSustainablePrice,
    result.weightGrams > 0 || result.hours > 0 ? minPrice : 0,
  );
  const maximumSafeDiscountPct =
    quotedTotal > 0 ? Math.max(0, ((quotedTotal - negotiationFloor) / quotedTotal) * 100) : 0;
  const comfortableDiscountPct =
    priceTier === "RETAIL" ? Math.min(pricingSettings.pixDiscountPct, maximumSafeDiscountPct) : 0;
  const comfortableOffer = quotedTotal * (1 - comfortableDiscountPct / 100);
  const selectedReprintProfit =
    priceTier === "WHOLESALE"
      ? result.wholesaleProfitAfterFullReprint
      : result.retailProfitAfterFullReprint;
  const printReport = (mode: "CLIENT" | "PRODUCTION") => {
    setPrintMode(mode);
    window.setTimeout(() => window.print(), 0);
  };

  return (
    <>
      {!embedded && (
        <PageSEO
          title="Calculadora de Custos 3D"
          description="Calcule o custo real de qualquer impressão 3D: material, energia, depreciação da máquina e mão de obra. Motor de precisão com parâmetros da Bambu Lab P2S."
          path="/calculadora"
        />
      )}
      <div
        className={`maker-screen relative overflow-hidden bg-[#07080d] px-4 text-white sm:px-6 lg:px-8 ${embedded ? "min-h-full py-5 sm:py-6" : "min-h-screen py-8"}`}
      >
        <div className="relative z-10 mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col gap-5 border-b border-white/[0.08] pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <BrandMark className="h-8 w-8" />
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70">
                  <Calculator className="h-5 w-5" />
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
                  CÁLCULO <span className="text-white">MAKER</span>
                </h1>
              </div>
              <p className="text-sm text-white/40">
                Entenda cada centavo: material, energia, depreciação da máquina e seu lucro real
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
              {draftSavedAt && (
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-200"
                  title={new Date(draftSavedAt).toLocaleString("pt-BR")}
                >
                  <Save className="h-3 w-3" />
                  Rascunho salvo
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                <Settings2 className="h-3 w-3" />
                MOTOR V6.0
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                <Hash className="h-3 w-3" /># MOTOR DE PRECISÃO
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-300">
                Bambu Lab P2S + AMS
              </span>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <div className="space-y-4">
              {/* INÍCIO RÁPIDO — sempre visível */}
              <Reveal delay={0}>
                <SectionCard
                  icon={Zap}
                  title="Início Rápido"
                  subtitle="Dados do job atual — copie do Bambu Studio"
                >
                  <CalculatorProjectEditor
                    project={project}
                    onChange={(next) => {
                      setProject(next);
                      if (projectIssues.length) setProjectIssues([]);
                    }}
                    materials={inventoryMaterials}
                    pricingSettings={pricingSettings}
                    issues={projectIssues}
                  />
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MachineStat label="Bandejas" value={`${project.plates.length}`} />
                    <MachineStat label="Tempo total" value={formatHoursToHHMM(result.hours)} />
                    <MachineStat
                      label="Peso total"
                      value={`${result.weightGrams.toFixed(2)}g`}
                      highlight
                    />
                  </div>
                </SectionCard>
              </Reveal>

              {/* MÁQUINA & DEPRECIAÇÃO — recolhida */}
              <Reveal delay={0.1}>
                <CollapsibleSection
                  icon={Cpu}
                  title="Máquina & Depreciação"
                  summary={`Custo: ${formatBRL(machineBreak.total)}/h · Depr. ${formatBRL(machineBreak.depreciation)}/h`}
                  open={showMachineConfig}
                  onToggle={() => setShowMachineConfig((v) => !v)}
                >
                  <div className="grid gap-3 sm:grid-cols-3">
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

                  <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-xs leading-relaxed text-white/50">
                    Cada hora de impressão consome{" "}
                    <span className="font-black text-cyan-300">
                      {formatBRL(machineBreak.total)}/h
                    </span>{" "}
                    da sua máquina —{" "}
                    <span className="font-black text-white/80">
                      {formatBRL(machineBreak.depreciation)}
                    </span>{" "}
                    de desgaste +{" "}
                    <span className="font-black text-white/80">
                      {formatBRL(machineBreak.replacement)}
                    </span>{" "}
                    para repor peças.
                  </div>

                  <AdvancedPanel
                    open={showAdvancedMachine}
                    onToggle={() => setShowAdvancedMachine((v) => !v)}
                    label="Ajustar máquina e depreciação"
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
                    <p className="mt-5 mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
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
                  </AdvancedPanel>
                </CollapsibleSection>
              </Reveal>

              {/* FILAMENTO & CUSTOS — recolhida */}
              <Reveal delay={0.2}>
                <CollapsibleSection
                  icon={Package}
                  title="Filamento & Custos"
                  summary={`R$${spoolPrice}/carretel · reserva ${reservePct}% · falha ${failureRatePct}%`}
                  open={showMaterialConfig}
                  onToggle={() => setShowMaterialConfig((v) => !v)}
                >
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
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <NumberField
                      label="Margem técnica de material"
                      suffix="%"
                      value={reservePct}
                      onChange={setReservePct}
                      step={1}
                      help={HELP.reserve}
                    />
                    <NumberField
                      label="Taxa de falha"
                      suffix="%"
                      value={failureRatePct}
                      onChange={setFailureRatePct}
                      step={1}
                      help={HELP.failureRate}
                    />
                    <NumberField
                      label="Perda média quando falha"
                      suffix="%"
                      value={failureImpactPct}
                      onChange={setFailureImpactPct}
                      step={5}
                      help={HELP.failureImpact}
                    />
                    <NumberField
                      label="Meta por hora ocupada"
                      prefix="R$"
                      suffix="/h"
                      value={targetProfitPerMachineHour}
                      onChange={setTargetProfitPerMachineHour}
                      step={1}
                      help={HELP.targetProfitPerMachineHour}
                    />
                  </div>
                  <div className="mt-5 rounded-xl border border-blue-400/20 bg-blue-400/[0.05] p-4 text-xs leading-relaxed text-white/50">
                    Os filamentos e os pesos reais do Bambu Studio são definidos em cada bandeja no
                    início do cálculo. Filamentos manuais entram no custo previsto, mas não
                    movimentam o estoque.
                  </div>
                </CollapsibleSection>
              </Reveal>

              {/* ENERGIA — recolhida */}
              <Reveal delay={0.3}>
                <CollapsibleSection
                  icon={Zap}
                  title="Energia"
                  summary={`R$${kwhCost}/kWh · ${decimal.format(result.energyKwh)} kWh estimados`}
                  open={showEnergyConfig}
                  onToggle={() => setShowEnergyConfig((v) => !v)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <NumberField
                      label="Custo do kWh"
                      prefix="R$"
                      value={kwhCost}
                      onChange={setKwhCost}
                      step={0.01}
                      help={HELP.kwh}
                    />
                    <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
                        Consumo estimado
                      </p>
                      <p className="mt-1 font-mono text-lg font-black text-cyan-300">
                        {decimal.format(result.energyKwh)} kWh
                      </p>
                      <p className="mt-1 text-[10px] text-white/40">
                        = {formatBRL(result.energyCost)}
                      </p>
                    </div>
                  </div>
                  <AdvancedPanel
                    open={showAdvancedEnergy}
                    onToggle={() => setShowAdvancedEnergy((v) => !v)}
                    label="Ajustes avançados de energia"
                  >
                    <div className="grid gap-4 sm:grid-cols-3">
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
                    </div>
                  </AdvancedPanel>
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-relaxed text-white/40">
                    A energia soma o{" "}
                    <span className="font-black text-white/80">pico de aquecimento</span> nos
                    primeiros minutos com o{" "}
                    <span className="font-black text-white/80">regime estável</span> pelo resto da
                    impressão.
                  </div>
                </CollapsibleSection>
              </Reveal>

              {/* MÃO DE OBRA & INSUMOS — recolhida */}
              <Reveal delay={0.4}>
                <CollapsibleSection
                  icon={Wrench}
                  title="Mão de Obra & Insumos"
                  summary={requiresLabor ? `${formatBRL(laborTotal)} computados` : "Não computada"}
                  open={showLaborConfig}
                  onToggle={() => setShowLaborConfig((v) => !v)}
                >
                  <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-white/90">
                        Tem trabalho manual / pós-processamento?
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        Ative para computar fatiar, tirar suportes, lixar, pintar, montar e embalar.
                      </p>
                    </div>
                    <Toggle checked={requiresLabor} onChange={setRequiresLabor} />
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                      help={HELP.extraSupplies}
                    />
                    <NumberField
                      label="Embalagem"
                      prefix="R$"
                      value={packagingCost}
                      onChange={setPackagingCost}
                      step={0.5}
                      help="Caixa ou envelope, proteção, etiqueta, fita e demais itens usados para entregar o pedido."
                    />
                  </div>
                </CollapsibleSection>
              </Reveal>
            </div>

            <aside className="bg-white/[0.03] border border-white/[0.08] rounded-[28px] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] lg:p-6 xl:sticky xl:top-24">
              <div className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                    Custo real de produção
                    <HelpTip text={HELP.totalCost} />
                  </p>
                  <div className="mt-3 flex items-start gap-2">
                    <span className="mt-2 text-xl font-black text-white/40">R$</span>
                    <span className="text-5xl font-black tracking-tight text-white sm:text-6xl">
                      {result.totalCost.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-right">
                  <p className="flex items-center justify-end gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                    Por grama
                    <HelpTip text={HELP.costPerGram} />
                  </p>
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
                  help={HELP.spoolPrice}
                />
                <CostBar
                  label="Energia"
                  value={result.energyCost}
                  percent={result.shares.energy}
                  color="bg-orange-400"
                  help={HELP.kwh}
                />
                <CostBar
                  label="Máquina"
                  value={result.machineCost}
                  percent={result.shares.machine}
                  color="bg-primary"
                  help={HELP.depreciation}
                />
                <CostBar
                  label="Mão de obra"
                  value={laborTotal}
                  percent={result.shares.labor}
                  color="bg-white/40"
                  help={HELP.laborHours}
                />
                {result.failureLoss > 0 && (
                  <CostBar
                    label="Falhas"
                    value={result.failureLoss}
                    percent={result.shares.failure}
                    color="bg-amber-400"
                    help={HELP.failureRate}
                  />
                )}
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-cyan-300" />
                    <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.22em] text-white/90">
                      Preço de venda & lucro
                      <HelpTip text={HELP.sellPrice} />
                    </h3>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-lg border border-white/15 bg-white/[0.04] p-0.5">
                    <button
                      onClick={() => setMarkupMode("mult")}
                      className={`rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${markupMode === "mult" ? "bg-cyan-500/30 text-cyan-200" : "text-white/40 hover:text-white/70"}`}
                    >
                      ×
                    </button>
                    <button
                      onClick={() => setMarkupMode("pct")}
                      className={`rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${markupMode === "pct" ? "bg-cyan-500/30 text-cyan-200" : "text-white/40 hover:text-white/70"}`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <NumberField
                    label={markupMode === "pct" ? "Atacado %" : "Atacado ×"}
                    value={wholesaleDisplay}
                    onChange={handleWholesaleMarkup}
                    step={markupMode === "pct" ? 5 : 0.1}
                    help={HELP.wholesale}
                  />
                  <NumberField
                    label={markupMode === "pct" ? "Varejo %" : "Varejo ×"}
                    value={retailDisplay}
                    onChange={handleRetailMarkup}
                    step={markupMode === "pct" ? 5 : 0.1}
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
                      title={`Atacado (${markupLabel(wholesaleMarkup)})`}
                      description="Ideal para cliente que revende ou fecha lote recorrente."
                      total={result.wholesaleTotal}
                      unit={result.wholesaleUnit}
                      tone="wholesale"
                    />
                    <ProfitLine
                      profit={result.profitWholesale}
                      marginPct={result.profitWholesalePct}
                      markupPct={result.profitWholesaleMarkupPct}
                    />
                    {result.isBelowMinWholesale && (
                      <p className="mt-1 px-1 text-[10px] font-bold text-yellow-300">
                        preço mínimo aplicado
                      </p>
                    )}
                  </div>
                  <div>
                    <PriceBox
                      title={`Varejo (${markupLabel(retailMarkup)})`}
                      description="Ideal para venda direta ao cliente final, sob demanda."
                      total={result.retailTotal}
                      unit={result.retailUnit}
                      tone="retail"
                    />
                    <ProfitLine
                      profit={result.profitRetail}
                      marginPct={result.profitRetailPct}
                      markupPct={result.profitRetailMarkupPct}
                    />
                    {result.isBelowMinRetail && (
                      <p className="mt-1 px-1 text-[10px] font-bold text-yellow-300">
                        preço mínimo aplicado
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 xl:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-white/60">
                    Piso sustentável
                  </p>
                  <p className="mt-1 text-lg font-black text-white">
                    {formatBRL(result.minimumSustainablePrice)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">
                    Menor valor recomendado: custo real de {formatBRL(result.totalCost)} mais{" "}
                    {formatBRL(result.capacityContributionTarget)} pela ocupação da máquina
                    {result.hours > 0 ? ` durante ${formatHoursToHHMM(result.hours)}` : ""}.
                  </p>
                </div>
                <div className="rounded-xl border border-blue-400/25 bg-blue-400/[0.06] p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-blue-200/80">
                    Faixa de negociação
                  </p>
                  <p className="mt-1 text-lg font-black text-blue-200">
                    {comfortableDiscountPct > 0
                      ? `Pode oferecer ${formatBRL(comfortableOffer)}`
                      : priceTier === "WHOLESALE"
                        ? "Atacado já negociado"
                        : "Mantenha o preço sugerido"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">
                    {priceTier === "WHOLESALE"
                      ? "Evite desconto adicional sem rever quantidade e custos."
                      : `Desconto confortável de ${comfortableDiscountPct.toFixed(1)}%. Limite máximo seguro: ${maximumSafeDiscountPct.toFixed(1)}%, nunca abaixo de ${formatBRL(negotiationFloor)}.`}
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-4 ${selectedReprintProfit >= 0 ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-red-400/25 bg-red-400/[0.06]"}`}
                >
                  <p className="text-[11px] font-black uppercase tracking-wider text-white/60">
                    Se houver uma reimpressão completa
                  </p>
                  <p
                    className={`mt-1 text-lg font-black ${selectedReprintProfit >= 0 ? "text-emerald-300" : "text-red-300"}`}
                  >
                    {selectedReprintProfit >= 0 ? "Ainda sobra " : "Prejuízo de "}
                    {formatBRL(Math.abs(selectedReprintProfit))}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">
                    {selectedReprintProfit >= 0
                      ? "O preço escolhido suporta uma reimpressão completa."
                      : "Não ofereça desconto; revise o preço ou a provisão de falha."}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-yellow-400/35 bg-yellow-400/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
                  <p className="text-xs font-semibold leading-relaxed text-yellow-100/80">
                    Cálculo transparente: depreciação real da máquina diluída na vida útil, fundo de
                    reposição de bico, placa e correias, energia com pico de aquecimento e sua mão
                    de obra. Passe o mouse nos "?" para entender cada campo.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => printReport("CLIENT")}
                className="mt-5 inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary px-5 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-primary-dark hover:shadow-[0_0_30px_rgba(37,99,235,0.25)] active:scale-[0.99]"
              >
                <Download className="h-4 w-4" />
                Gerar proposta do cliente
              </button>
              <button
                type="button"
                onClick={() => printReport("PRODUCTION")}
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-[0.14em] text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <Factory className="h-4 w-4" /> Ficha interna de produção
              </button>

              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Save className="h-4 w-4 text-emerald-300" />
                  <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-white/90">
                    Salvar orçamento
                    <HelpTip text="Salva este orçamento na aba Orçamentos com o preço comercial escolhido (varejo ou atacado), o cliente vinculado e a ficha técnica interna. Requer login de admin." />
                  </h3>
                </div>
                <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3">
                  <label className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/65">
                    <Search className="h-4 w-4 text-cyan-300" /> Buscar cliente já cadastrado
                  </label>
                  <input
                    type="search"
                    placeholder="Digite nome, sobrenome ou telefone"
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm font-bold uppercase text-white placeholder:normal-case placeholder:text-white/30 focus:border-cyan-400/40 focus:outline-none"
                  />
                  {customerMatches.length > 0 && (
                    <div className="mt-2 grid gap-1.5">
                      {customerMatches.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectQuoteCustomer(customer)}
                          className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-left transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.07]"
                        >
                          <span className="min-w-0">
                            <strong className="block truncate text-xs text-white">
                              {(
                                customer.name ||
                                [customer.firstName, customer.lastName].filter(Boolean).join(" ")
                              ).toLocaleUpperCase("pt-BR")}
                            </strong>
                            <span className="block text-[11px] font-mono text-white/45">
                              {customer.phone || customer.whatsapp || "SEM TELEFONE"}
                            </span>
                          </span>
                          <span className="shrink-0 text-[10px] font-black uppercase text-cyan-300">
                            Selecionar
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCustomerId && (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-3">
                    <span className="flex min-w-0 items-center gap-2 text-xs font-black text-emerald-200">
                      <UserCheck className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {[clientName, clientLastName].filter(Boolean).join(" ")}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={clearQuoteCustomer}
                      className="shrink-0 text-[10px] font-black uppercase text-white/55 hover:text-white"
                    >
                      Alterar
                    </button>
                  </div>
                )}

                <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/20 p-1.5">
                  <button
                    type="button"
                    onClick={() => setPriceTier("RETAIL")}
                    className={`min-h-11 rounded-lg px-3 text-xs font-black transition ${priceTier === "RETAIL" ? "bg-blue-500 text-white shadow-lg" : "text-white/45 hover:bg-white/[0.05] hover:text-white"}`}
                  >
                    Varejo <span className="block text-[9px] font-medium opacity-75">padrão</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceTier("WHOLESALE")}
                    className={`min-h-11 rounded-lg px-3 text-xs font-black transition ${priceTier === "WHOLESALE" ? "bg-amber-500 text-black shadow-lg" : "text-white/45 hover:bg-white/[0.05] hover:text-white"}`}
                  >
                    Atacado{" "}
                    <span className="block text-[9px] font-medium opacity-75">lote ou revenda</span>
                  </button>
                </div>

                {!selectedCustomerId && (
                  <p className="mb-2 text-[11px] leading-relaxed text-white/45">
                    Cliente novo: será criado um cadastro rápido no CRM ao salvar. Nome obrigatório,
                    sobrenome opcional.
                  </p>
                )}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Nome *"
                    value={clientName}
                    disabled={Boolean(selectedCustomerId)}
                    onChange={(e) => setClientName(e.target.value.toLocaleUpperCase("pt-BR"))}
                    className="h-11 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs font-bold uppercase text-white placeholder:normal-case placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none disabled:opacity-60"
                  />
                  <input
                    type="text"
                    placeholder="Sobrenome (opcional)"
                    value={clientLastName}
                    disabled={Boolean(selectedCustomerId)}
                    onChange={(e) => setClientLastName(e.target.value.toLocaleUpperCase("pt-BR"))}
                    className="h-11 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs font-bold uppercase text-white placeholder:normal-case placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none disabled:opacity-60"
                  />
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-200">
                      WhatsApp{" "}
                      <span className="normal-case tracking-normal text-amber-200/70">
                        Importante para enviar a proposta
                      </span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="(DDD) número do WhatsApp"
                      value={clientPhone}
                      disabled={Boolean(selectedCustomerId)}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="h-11 w-full min-w-0 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] px-3 text-xs font-mono font-bold text-white placeholder:text-white/30 focus:border-amber-300/50 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>
                {quoteImageUrl ? (
                  <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2">
                    <img
                      src={quoteImageUrl}
                      alt="Prévia do produto"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-white/60">
                      Imagem anexada
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuoteImageUrl("")}
                      className="shrink-0 rounded-lg border border-white/10 p-2 text-white/40 transition hover:border-red-400/30 hover:text-red-300"
                      aria-label="Remover imagem"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-2.5 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 text-[11px] font-bold text-white/50 transition hover:border-white/30 hover:text-white/70">
                    {uploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    {uploadingImage ? "Enviando..." : "Anexar imagem do produto (opcional)"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}

                <button
                  type="button"
                  onClick={handleSaveCalc}
                  disabled={savingCalc || uploadingImage}
                  className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-4 text-xs font-black uppercase tracking-[0.16em] text-emerald-300 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {savingCalc ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Salvar no sistema
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <Factory className="mx-auto mb-2 h-4 w-4 text-primary" />
                  <p className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
                    Lote <HelpTip text={HELP.batch} />
                  </p>
                  <p className="font-mono text-sm font-black text-white">
                    {Math.max(1, projectPricing.totalPieces)} un.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <Layers3 className="mx-auto mb-2 h-4 w-4 text-cyan-300" />
                  <p className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
                    Unitário <HelpTip text={HELP.unitCost} />
                  </p>
                  <p className="font-mono text-sm font-black text-white">
                    {formatBRL(result.unitCost)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <Gauge className="mx-auto mb-2 h-4 w-4 text-orange-300" />
                  <p className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
                    Horas <HelpTip text={HELP.time} />
                  </p>
                  <p className="font-mono text-sm font-black text-white">
                    {formatHoursToHHMM(result.hours)}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <section
        className={`maker-print-report ${printMode === "CLIENT" ? "maker-print-report-client" : "maker-print-report-production"}`}
        aria-label="Relatório Cálculo Maker"
      >
        <article className="maker-report-page maker-report-page-client">
          <header className="maker-report-header">
            <div>
              <p className="maker-report-kicker">INOVAPRO3D</p>
              <h1>Orçamento</h1>
              <p>
                {clientName
                  ? `Cliente: ${[clientName, clientLastName].filter(Boolean).join(" ")}`
                  : "Proposta para manufatura 3D"}
              </p>
            </div>
            <div className="maker-report-meta">
              <span>{generatedAt}</span>
              <span>Validade: 7 dias</span>
            </div>
          </header>

          <div className="maker-report-highlight maker-report-highlight-client">
            <div>
              <span>Valor total</span>
              <strong>{formatBRL(quotedTotal)}</strong>
            </div>
            <div>
              <span>Valor por unidade</span>
              <strong>{formatBRL(quotedUnit)}</strong>
            </div>
            <div>
              <span>Quantidade</span>
              <strong>{Math.max(1, projectPricing.totalPieces)} un.</strong>
            </div>
          </div>

          <div className="maker-report-grid">
            <section className="maker-report-card">
              <h2>Seu Projeto</h2>
              <ReportLine label="Projeto" value={project.name || "Projeto Bambu Studio"} />
              <ReportLine
                label="Quantidade"
                value={`${Math.max(1, projectPricing.totalPieces)} un.`}
              />
              <ReportLine
                label="Acabamento / pós-processamento"
                value={requiresLabor ? "Incluso" : "Padrão"}
              />
            </section>

            <section className="maker-report-card">
              <h2>Atendimento</h2>
              {clientName && (
                <ReportLine
                  label="Cliente"
                  value={[clientName, clientLastName].filter(Boolean).join(" ")}
                />
              )}
              {clientPhone && <ReportLine label="Contato" value={clientPhone} />}
              <ReportLine label="Processo" value="Impressão 3D (FDM)" />
              <ReportLine
                label="Condição comercial"
                value={priceTier === "WHOLESALE" ? "Atacado / lote" : "Varejo"}
              />
            </section>
          </div>

          <footer className="maker-report-footer">
            Obrigado pela preferência! Este orçamento é válido por 7 dias corridos. Valores sujeitos
            a confirmação após análise final do modelo 3D. Fale com a <strong>INOVAPRO3D</strong>{" "}
            para aprovar e iniciar a produção.
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
              <ReportLine
                label="Filamento utilizado"
                value={`${decimal.format(result.weightGrams)}g`}
              />
              <ReportLine label="Peso técnico" value={`${decimal.format(result.weightGrams)}g`} />
              <ReportLine
                label="Peças no projeto"
                value={`${Math.max(1, projectPricing.totalPieces)} un.`}
              />
              <ReportLine label="Tempo total" value={formatHoursToHHMM(result.hours)} />
            </section>

            <section className="maker-report-card">
              <h2>Material e Energia</h2>
              <ReportLine label="Bandejas" value={`${project.plates.length}`} />
              <ReportLine label="Carretel" value={formatBRL(spoolPrice)} />
              <ReportLine label="Peso nominal" value={`${decimal.format(spoolWeight)}g`} />
              <ReportLine label="Reserva falhas" value={`${reservePct}%`} />
              <ReportLine label="Taxa de falha" value={`${failureRatePct}%`} />
              <ReportLine label="Consumo" value={`${decimal.format(result.energyKwh)} kWh`} />
              <ReportLine label="Tarifa kWh" value={formatBRL(kwhCost)} />
            </section>

            <section className="maker-report-card">
              <h2>Máquina e Mão de Obra</h2>
              <ReportLine label="Potência média" value={`${steadyPower} W`} />
              <ReportLine
                label="Pico inicial"
                value={`${startupPower} W / ${startupMinutes} min`}
              />
              <ReportLine
                label="Custo-máquina/h"
                value={`${formatBRL(result.machineHourCost)}/h`}
              />
              <ReportLine
                label="Depreciação/h"
                value={`${formatBRL(machineBreak.depreciation)}/h`}
              />
              <ReportLine label="Reposição/h" value={`${formatBRL(machineBreak.replacement)}/h`} />
              <ReportLine label="Hora de trabalho" value={`${formatBRL(laborRate)}/h`} />
              <ReportLine
                label="Mão de obra + insumos"
                value={requiresLabor ? formatBRL(laborTotal) : "Não aplicado"}
              />
            </section>

            <section className="maker-report-card">
              <h2>Comercial Interno</h2>
              <ReportLine
                label={`Atacado ${markupLabel(wholesaleMarkup)} total`}
                value={formatBRL(result.wholesaleTotal)}
              />
              <ReportLine
                label="Lucro atacado"
                value={`${formatBRL(result.profitWholesale)} · margem ${result.profitWholesalePct.toFixed(0)}%`}
              />
              <ReportLine
                label={`Varejo ${markupLabel(retailMarkup)} total`}
                value={formatBRL(result.retailTotal)}
              />
              <ReportLine
                label="Lucro varejo"
                value={`${formatBRL(result.profitRetail)} · margem ${result.profitRetailPct.toFixed(0)}%`}
              />
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
                {result.failureLoss > 0 && (
                  <tr>
                    <td>Falhas (tempo + energia)</td>
                    <td>{formatBRL(result.failureLoss)}</td>
                    <td>{result.shares.failure.toFixed(1)}%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <footer className="maker-report-footer">
            <strong>Nota interna:</strong> cálculo pelo motor unificado INOVAPRO3D — depreciação da
            máquina diluída na vida útil, fundo de reposição de peças, energia com pico de
            aquecimento da P2S e mão de obra quando aplicável.
          </footer>
        </article>
      </section>
    </>
  );
}

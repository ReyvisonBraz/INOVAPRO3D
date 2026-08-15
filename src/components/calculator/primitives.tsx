import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle, Settings2, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatBRL, HELP } from "../../lib/pricing";
import { NumberField as RawNumberField } from "../ui/NumberField";

// ============================================================================
// ÁTOMOS VISUAIS DA CALCULADORA
// ----------------------------------------------------------------------------
// Extraídos de `FilamentCalculator.tsx` sem mudança de aparência: o arquivo
// passava de 1600 linhas e não tem cobertura de teste, então separar a
// apresentação da orquestração é o que torna as próximas mudanças revisáveis.
// ============================================================================

export function HelpTip({ text }: { text: string }) {
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

export interface NumberFieldProps {
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
}

/** Campo numérico rotulado. O input em si vem do componente compartilhado. */
export function NumberField({
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
        <RawNumberField
          value={value}
          onChange={onChange}
          min={min}
          step={step}
          disabled={disabled}
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

export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
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

export function CollapsibleSection({
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
  children: ReactNode;
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

export function AdvancedPanel({
  open,
  onToggle,
  label,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  children: ReactNode;
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

export function Toggle({
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

export function CostBar({
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

export function MachineStat({
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

export function PriceBox({
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

export function ProfitLine({
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

export function ReportLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="maker-report-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

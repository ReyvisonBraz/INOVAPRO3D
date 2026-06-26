import { memo, type ReactNode } from "react";
import { Settings, Calculator, Zap, Coins, Package, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../../lib/utils";
import { Button } from "../../../components/ui/Button";
import { NumInput } from "../../../lib/adminHelpers";
import { DiagnosticWidget } from "../../../components/layout/DebugMarker";
import type { GlobalSettings } from "../../../types/domain";
import {
  MATERIAL_PRESETS,
  type MachineConfig,
  type MaterialKey,
  type MaterialSettings,
  type PricingSettings,
} from "../../../lib/pricing";

export interface AdminSettingsPanelProps {
  globalSettings: GlobalSettings;
  machineConfig: MachineConfig;
  pricingSettings: PricingSettings;
  onUpdateGlobalSettings: (settings: GlobalSettings) => void;
  onUpdateMachineConfig: (config: MachineConfig) => void;
  onUpdatePricingSettings: (settings: PricingSettings) => void;
  onSaveGlobalSettings: () => void;
  onSaveMachineConfig: () => void;
  onSavePricingSettings: () => void;
  onToggleMaintenance: () => void;
}

const MACHINE_CONFIG_FIELDS: { label: string; key: keyof MachineConfig; min: number; step?: number }[] = [
  { label: "Preço da Máquina (R$)", key: "price", min: 0 },
  { label: "Vida útil (horas)", key: "lifespanHours", min: 1, step: 100 },
  { label: "Preço do Bico (R$)", key: "nozzlePrice", min: 0 },
  { label: "Vida do Bico (h)", key: "nozzleLifeHours", min: 1, step: 50 },
  { label: "Preço da Placa (R$)", key: "platePrice", min: 0 },
  { label: "Vida da Placa (h)", key: "plateLifeHours", min: 1, step: 50 },
  { label: "Preço das Correias (R$)", key: "beltsPrice", min: 0 },
  { label: "Vida das Correias (h)", key: "beltsLifeHours", min: 1, step: 50 },
  { label: "Manutenção R$/h", key: "maintPerHour", min: 0, step: 0.01 },
];

const ENERGY_FIELDS: { label: string; key: keyof PricingSettings; min: number; step: number; suffix: string }[] = [
  { label: "Tarifa de energia", key: "kwhCost", min: 0, step: 0.01, suffix: "R$/kWh" },
  { label: "Pico de aquecimento", key: "startupPowerWatts", min: 0, step: 10, suffix: "W" },
  { label: "Duração do pico", key: "startupMinutes", min: 0, step: 0.5, suffix: "min" },
];

const PRICING_FIELDS: { label: string; key: keyof PricingSettings; min: number; step: number; suffix: string; hint?: string }[] = [
  { label: "Markup atacado", key: "wholesaleMarkup", min: 0, step: 0.1, suffix: "×", hint: "1.6 = custo + 60%" },
  { label: "Markup varejo", key: "retailMarkup", min: 0, step: 0.1, suffix: "×", hint: "2.5 = custo × 2,5" },
  { label: "Preço mínimo", key: "minPrice", min: 0, step: 1, suffix: "R$" },
  { label: "Taxa de falha", key: "failureRatePct", min: 0, step: 1, suffix: "%" },
  { label: "Desconto PIX", key: "pixDiscountPct", min: 0, step: 1, suffix: "%", hint: "à vista na vitrine" },
  { label: "Parcelas s/ juros", key: "maxInstallments", min: 1, step: 1, suffix: "x", hint: "máx. no cartão" },
];

const MATERIAL_FIELDS: { label: string; key: keyof MaterialSettings; min: number; step: number; suffix: string }[] = [
  { label: "Preço do rolo", key: "spoolPrice", min: 0, step: 1, suffix: "R$" },
  { label: "Peso do rolo", key: "spoolWeight", min: 1, step: 50, suffix: "g" },
  { label: "Potência média", key: "steadyPowerWatts", min: 0, step: 10, suffix: "W" },
  { label: "Reserva de falha", key: "defaultReservePct", min: 0, step: 1, suffix: "%" },
];

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono outline-none focus:border-primary/50 transition-all";

function Field({
  label,
  suffix,
  hint,
  ...rest
}: {
  label: string;
  suffix?: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-baseline justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-secondary">
        <span>{label}</span>
        {suffix && <span className="text-[9px] text-dim normal-case tracking-normal">{suffix}</span>}
      </label>
      <NumInput {...rest} className={inputCls} />
      {hint && <p className="text-[9px] text-dim">{hint}</p>}
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  subtitle,
  className,
  children,
}: {
  icon: typeof Settings;
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("glass rounded-[32px] p-7 border border-white/5 space-y-6", className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest italic">{title}</h3>
          {subtitle && <p className="mt-1 text-[10px] text-secondary tracking-wide leading-snug">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

const AdminSettingsPanel = memo(function AdminSettingsPanel({
  globalSettings,
  machineConfig,
  pricingSettings,
  onUpdateGlobalSettings,
  onUpdateMachineConfig,
  onUpdatePricingSettings,
  onSaveGlobalSettings,
  onSaveMachineConfig,
  onSavePricingSettings,
  onToggleMaintenance,
}: AdminSettingsPanelProps) {
  const setMaterial = (key: MaterialKey, field: keyof MaterialSettings, v: number) =>
    onUpdatePricingSettings({
      ...pricingSettings,
      materials: {
        ...pricingSettings.materials,
        [key]: { ...pricingSettings.materials[key], [field]: v },
      },
    });

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {/* Config Gerais */}
      <Card icon={Settings} title="Config Gerais" subtitle="Banner e regras gerais da loja">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-dim">Banner Promocional</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-primary/50"
              value={globalSettings.promoBanner || ""}
              onChange={(e) => onUpdateGlobalSettings({ ...globalSettings, promoBanner: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-dim">Valor Mínimo para Orçamento (R$)</label>
            <NumInput
              min={0}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-primary/50"
              value={globalSettings.minOrderValue ?? 0}
              onChange={(v) => onUpdateGlobalSettings({ ...globalSettings, minOrderValue: v })}
            />
          </div>
          <Button className="w-full h-12 rounded-2xl" onClick={onSaveGlobalSettings}>
            Salvar Alterações Globais
          </Button>
        </div>
      </Card>

      {/* Estado do Sistema */}
      <Card icon={Sparkles} title="Estado do Sistema" subtitle="Disponibilidade e diagnóstico">
        <div className="space-y-4">
          <button
            onClick={onToggleMaintenance}
            className={cn(
              "w-full flex items-center justify-between p-5 rounded-2xl border transition-all",
              globalSettings.maintenanceMode ? "bg-red-500/10 border-red-500/20" : "bg-green-500/10 border-green-500/20"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", globalSettings.maintenanceMode ? "bg-red-500" : "bg-green-500")} />
              <span className="text-[10px] font-black uppercase">
                {globalSettings.maintenanceMode ? "Modo Manutenção Ativo" : "Sistema Online"}
              </span>
            </div>
            <span className={cn("text-[11px] font-black uppercase px-2 py-0.5 rounded", globalSettings.maintenanceMode ? "bg-red-500 text-white" : "bg-green-500 text-white")}>
              {globalSettings.maintenanceMode ? "OFFLINE" : "LIVE"}
            </span>
          </button>
          <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black uppercase text-dim mb-2">Versão do Engine</p>
            <p className="text-xs font-mono font-bold">INOVAPRO-OS v2.4.8-stable</p>
          </div>
          <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black uppercase text-dim mb-4">Motor de Diagnóstico</p>
            <DiagnosticWidget />
          </div>
        </div>
      </Card>

      {/* PARÂMETROS DA CALCULADORA — controla as duas calculadoras */}
      <Card
        icon={Calculator}
        title="Parâmetros da Calculadora"
        subtitle="Fonte única de verdade — controla a calculadora pública (/calculadora) e o Cálculo Maker Rápido do painel"
        className="lg:col-span-2"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Aplica nas duas calculadoras ao salvar
        </div>

        {/* Energia */}
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/70">
            <Zap className="w-3.5 h-3.5 text-orange-300" /> Energia
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {ENERGY_FIELDS.map(({ label, key, min, step, suffix }) => (
              <Field
                key={key}
                label={label}
                suffix={suffix}
                min={min}
                step={step}
                value={pricingSettings[key] as number}
                onChange={(v) => onUpdatePricingSettings({ ...pricingSettings, [key]: v })}
              />
            ))}
          </div>
        </div>

        {/* Precificação */}
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/70">
            <Coins className="w-3.5 h-3.5 text-cyan-300" /> Precificação & Margens
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PRICING_FIELDS.map(({ label, key, min, step, suffix, hint }) => (
              <Field
                key={key}
                label={label}
                suffix={suffix}
                hint={hint}
                min={min}
                step={step}
                value={pricingSettings[key] as number}
                onChange={(v) => onUpdatePricingSettings({ ...pricingSettings, [key]: v })}
              />
            ))}
          </div>
        </div>

        {/* Materiais */}
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/70">
            <Package className="w-3.5 h-3.5 text-primary" /> Materiais
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(pricingSettings.materials) as MaterialKey[]).map((key) => (
              <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-white/80">
                  {MATERIAL_PRESETS[key]?.label ?? key}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {MATERIAL_FIELDS.map(({ label, key: field, min, step, suffix }) => (
                    <Field
                      key={field}
                      label={label}
                      suffix={suffix}
                      min={min}
                      step={step}
                      value={pricingSettings.materials[key][field]}
                      onChange={(v) => setMaterial(key, field, v)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          className="h-12 rounded-2xl px-8 text-[10px] font-black uppercase tracking-widest"
          onClick={onSavePricingSettings}
        >
          Salvar Parâmetros da Calculadora
        </Button>
      </Card>

      {/* Config da Máquina */}
      <Card
        icon={Calculator}
        title="Config da Máquina (Bambu Lab P2S)"
        subtitle="Depreciação e reposição de peças — usado pelas duas calculadoras"
        className="lg:col-span-2"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {MACHINE_CONFIG_FIELDS.map(({ label, key, min, step }) => (
            <Field
              key={key}
              label={label}
              min={min}
              step={step}
              value={machineConfig[key]}
              onChange={(v) => onUpdateMachineConfig({ ...machineConfig, [key]: v })}
            />
          ))}
        </div>
        <Button
          className="h-12 rounded-2xl px-8 text-[10px] font-black uppercase tracking-widest"
          onClick={onSaveMachineConfig}
        >
          Salvar Config da Máquina
        </Button>
      </Card>
    </motion.div>
  );
});

export default AdminSettingsPanel;

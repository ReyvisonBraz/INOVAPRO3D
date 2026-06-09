import { memo } from "react";
import { Settings, Calculator } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../../lib/utils";
import { Button } from "../../../components/ui/Button";
import { NumInput } from "../../../lib/adminHelpers";
import { DiagnosticWidget } from "../../../components/layout/DebugMarker";
import type { GlobalSettings } from "../../../types/domain";
import type { MachineConfig } from "../../../lib/pricing";

export interface AdminSettingsPanelProps {
  globalSettings: GlobalSettings;
  machineConfig: MachineConfig;
  onUpdateGlobalSettings: (settings: GlobalSettings) => void;
  onUpdateMachineConfig: (config: MachineConfig) => void;
  onSaveGlobalSettings: () => void;
  onSaveMachineConfig: () => void;
  onToggleMaintenance: () => void;
}

const MACHINE_CONFIG_FIELDS: { label: string; key: keyof MachineConfig; min: number }[] = [
  { label: "Preço da Máquina (R$)", key: "price", min: 0 },
  { label: "Vida útil (horas)", key: "lifespanHours", min: 1 },
  { label: "Preço do Bico (R$)", key: "nozzlePrice", min: 0 },
  { label: "Vida do Bico (h)", key: "nozzleLifeHours", min: 1 },
  { label: "Preço da Placa (R$)", key: "platePrice", min: 0 },
  { label: "Vida da Placa (h)", key: "plateLifeHours", min: 1 },
  { label: "Preço das Correias (R$)", key: "beltsPrice", min: 0 },
  { label: "Vida das Correias (h)", key: "beltsLifeHours", min: 1 },
  { label: "Manutenção R$/h", key: "maintPerHour", min: 0 },
];

const AdminSettingsPanel = memo(function AdminSettingsPanel({
  globalSettings,
  machineConfig,
  onUpdateGlobalSettings,
  onUpdateMachineConfig,
  onSaveGlobalSettings,
  onSaveMachineConfig,
  onToggleMaintenance,
}: AdminSettingsPanelProps) {
  return (
    <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="glass rounded-[48px] p-10 border border-white/5 space-y-8">
        <h3 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2"><Settings className="w-4 h-4" /> Config Gerais</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-dim">Banner Promocional</label>
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-primary/50" 
              value={globalSettings.promoBanner || ''}
              onChange={(e) => onUpdateGlobalSettings({...globalSettings, promoBanner: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-dim">Valor Mínimo para Orçamento (R$)</label>
            <NumInput
              min={0}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-primary/50"
              value={globalSettings.minOrderValue ?? 0}
              onChange={(v) => onUpdateGlobalSettings({...globalSettings, minOrderValue: v})}
            />
          </div>
          <Button className="w-full h-14 rounded-2xl" onClick={onSaveGlobalSettings}>Salvar Alterações Globais</Button>
        </div>
      </div>
      <div className="glass rounded-[48px] p-10 border border-white/5 space-y-8 md:col-span-2">
        <h3 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2"><Calculator className="w-4 h-4" /> Config da Máquina (Bambu Lab P2S)</h3>
        <p className="text-[9px] text-secondary uppercase tracking-widest -mt-4">Esses valores são usados pela calculadora rápida e pela calculadora pública como padrão inicial.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {MACHINE_CONFIG_FIELDS.map(({ label, key, min }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-secondary">{label}</label>
              <NumInput
                min={min}
                value={machineConfig[key]}
                onChange={v => onUpdateMachineConfig({...machineConfig, [key]: v})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono outline-none focus:border-primary/50 transition-all"
              />
            </div>
          ))}
        </div>
        <Button className="h-12 rounded-2xl px-8 text-[10px] font-black uppercase tracking-widest" onClick={onSaveMachineConfig}>
          Salvar Config da Máquina
        </Button>
      </div>

      <div className="glass rounded-[48px] p-10 border border-white/5">
        <h3 className="text-sm font-black uppercase tracking-widest italic mb-8">Estado do Sistema</h3>
        <div className="space-y-4">
          <button 
            onClick={onToggleMaintenance}
            className={cn(
              "w-full flex items-center justify-between p-6 rounded-3xl border transition-all",
              globalSettings.maintenanceMode ? "bg-red-500/10 border-red-500/20" : "bg-green-500/10 border-green-500/20"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", globalSettings.maintenanceMode ? "bg-red-500" : "bg-green-500")} />
              <span className="text-[10px] font-black uppercase">{globalSettings.maintenanceMode ? "Modo Manutenção Ativo" : "Sistema Online"}</span>
            </div>
            <span className={cn("text-[11px] font-black uppercase px-2 py-0.5 rounded", globalSettings.maintenanceMode ? "bg-red-500 text-white" : "bg-green-500 text-white")}>
              {globalSettings.maintenanceMode ? "OFFLINE" : "LIVE"}
            </span>
          </button>
          <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
            <p className="text-[10px] font-black uppercase text-dim mb-2">Versão do Engine</p>
            <p className="text-xs font-mono font-bold">INOVAPRO-OS v2.4.8-stable</p>
          </div>
          <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
            <p className="text-[10px] font-black uppercase text-dim mb-4">Motor de Diagnóstico</p>
            <DiagnosticWidget />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default AdminSettingsPanel;

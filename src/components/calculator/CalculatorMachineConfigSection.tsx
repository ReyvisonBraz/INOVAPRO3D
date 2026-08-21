import { Cpu, Wrench } from "lucide-react";
import { formatBRL, HELP, type MachineConfig, type MachineHourBreakdown } from "../../lib/pricing";
import { Reveal } from "../ui/Reveal";
import { AdvancedPanel, CollapsibleSection, MachineStat, NumberField } from "./primitives";

interface CalculatorMachineConfigSectionProps {
  machine: MachineConfig;
  machineBreakdown: MachineHourBreakdown;
  machineOverrides: Partial<MachineConfig> | null;
  overrideCount: number;
  printerName?: string;
  open: boolean;
  advancedOpen: boolean;
  onToggle: () => void;
  onToggleAdvanced: () => void;
  onResetOverrides: () => void;
  onChangeMachineField: (key: keyof MachineConfig, value: number) => void;
}

export function CalculatorMachineConfigSection({
  machine,
  machineBreakdown,
  machineOverrides,
  overrideCount,
  printerName,
  open,
  advancedOpen,
  onToggle,
  onToggleAdvanced,
  onResetOverrides,
  onChangeMachineField,
}: CalculatorMachineConfigSectionProps) {
  return (
    <Reveal delay={0.1}>
      <CollapsibleSection
        icon={Cpu}
        title="Máquina & Depreciação"
        summary={`Custo: ${formatBRL(machineBreakdown.total)}/h · Depr. ${formatBRL(machineBreakdown.depreciation)}/h`}
        open={open}
        onToggle={onToggle}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MachineStat
            label="Depreciação"
            value={`${formatBRL(machineBreakdown.depreciation)}/h`}
            help={HELP.depreciation}
          />
          <MachineStat
            label="Reposição de peças"
            value={`${formatBRL(machineBreakdown.replacement)}/h`}
            help={HELP.replacement}
          />
          <MachineStat
            label="Custo-máquina total"
            value={`${formatBRL(machineBreakdown.total)}/h`}
            highlight
          />
        </div>

        <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-xs leading-relaxed text-white/50">
          Cada hora de impressão consome{" "}
          <span className="font-black text-cyan-300">{formatBRL(machineBreakdown.total)}/h</span> da{" "}
          <span className="font-black text-white/80">{printerName ?? "máquina configurada"}</span> —{" "}
          <span className="font-black text-white/80">
            {formatBRL(machineBreakdown.depreciation)}
          </span>{" "}
          de desgaste +{" "}
          <span className="font-black text-white/80">
            {formatBRL(machineBreakdown.replacement)}
          </span>{" "}
          para repor peças.
        </div>

        <AdvancedPanel
          open={advancedOpen}
          onToggle={onToggleAdvanced}
          label="Personalizar só este orçamento"
        >
          {overrideCount > 0 && (
            <button
              type="button"
              onClick={onResetOverrides}
              className="mb-4 text-[10px] font-bold text-cyan-300/80 underline decoration-dotted underline-offset-2 hover:text-cyan-200"
            >
              Restaurar todos os valores da impressora
            </button>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label={`Preço da máquina${machineOverrides?.price !== undefined ? " (personalizado)" : ""}`}
              prefix="R$"
              value={machine.price}
              onChange={(value) => onChangeMachineField("price", value)}
              step={1}
              help={HELP.machinePrice}
            />
            <NumberField
              label={`Vida útil da máquina${machineOverrides?.lifespanHours !== undefined ? " (personalizado)" : ""}`}
              suffix="h"
              value={machine.lifespanHours}
              onChange={(value) => onChangeMachineField("lifespanHours", value)}
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
              value={machine.nozzlePrice}
              onChange={(value) => onChangeMachineField("nozzlePrice", value)}
              step={1}
              help={HELP.nozzle}
            />
            <NumberField
              label="Bico — vida útil"
              suffix="h"
              value={machine.nozzleLifeHours}
              onChange={(value) => onChangeMachineField("nozzleLifeHours", value)}
              min={1}
              step={50}
              help={HELP.nozzle}
            />
            <NumberField
              label="Placa / PEI — preço"
              prefix="R$"
              value={machine.platePrice}
              onChange={(value) => onChangeMachineField("platePrice", value)}
              step={1}
              help={HELP.plate}
            />
            <NumberField
              label="Placa / PEI — vida útil"
              suffix="h"
              value={machine.plateLifeHours}
              onChange={(value) => onChangeMachineField("plateLifeHours", value)}
              min={1}
              step={50}
              help={HELP.plate}
            />
            <NumberField
              label="Correias (par) — preço"
              prefix="R$"
              value={machine.beltsPrice}
              onChange={(value) => onChangeMachineField("beltsPrice", value)}
              step={1}
              help={HELP.belts}
            />
            <NumberField
              label="Correias — vida útil"
              suffix="h"
              value={machine.beltsLifeHours}
              onChange={(value) => onChangeMachineField("beltsLifeHours", value)}
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
              value={machine.maintPerHour}
              onChange={(value) => onChangeMachineField("maintPerHour", value)}
              step={0.01}
              help={HELP.maint}
            />
          </div>
        </AdvancedPanel>
      </CollapsibleSection>
    </Reveal>
  );
}

import { Zap } from "lucide-react";
import { formatBRL, HELP } from "../../lib/pricing";
import { Reveal } from "../ui/Reveal";
import { AdvancedPanel, CollapsibleSection, NumberField } from "./primitives";

const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

interface CalculatorEnergySectionProps {
  kwhCost: number;
  energyKwh: number;
  energyCost: number;
  steadyPower: number;
  startupPower: number;
  startupMinutes: number;
  open: boolean;
  advancedOpen: boolean;
  onToggle: () => void;
  onToggleAdvanced: () => void;
  onKwhCostChange: (value: number) => void;
  onSteadyPowerChange: (value: number) => void;
  onStartupPowerChange: (value: number) => void;
  onStartupMinutesChange: (value: number) => void;
}

export function CalculatorEnergySection({
  kwhCost,
  energyKwh,
  energyCost,
  steadyPower,
  startupPower,
  startupMinutes,
  open,
  advancedOpen,
  onToggle,
  onToggleAdvanced,
  onKwhCostChange,
  onSteadyPowerChange,
  onStartupPowerChange,
  onStartupMinutesChange,
}: CalculatorEnergySectionProps) {
  return (
    <Reveal delay={0.3}>
      <CollapsibleSection
        icon={Zap}
        title="Energia"
        summary={`R$${kwhCost}/kWh · ${decimal.format(energyKwh)} kWh estimados`}
        open={open}
        onToggle={onToggle}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Custo do kWh"
            prefix="R$"
            value={kwhCost}
            onChange={onKwhCostChange}
            step={0.01}
            help={HELP.kwh}
          />
          <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
              Consumo estimado
            </p>
            <p className="mt-1 font-mono text-lg font-black text-cyan-300">
              {decimal.format(energyKwh)} kWh
            </p>
            <p className="mt-1 text-[10px] text-white/40">= {formatBRL(energyCost)}</p>
          </div>
        </div>
        <AdvancedPanel
          open={advancedOpen}
          onToggle={onToggleAdvanced}
          label="Ajustes avançados de energia"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Potência média"
              suffix="W"
              value={steadyPower}
              onChange={onSteadyPowerChange}
              help={HELP.steadyPower}
            />
            <NumberField
              label="Pico de aquecimento"
              suffix="W"
              value={startupPower}
              onChange={onStartupPowerChange}
              help={HELP.startupPower}
            />
            <NumberField
              label="Duração do pico"
              suffix="min"
              value={startupMinutes}
              onChange={onStartupMinutesChange}
              step={0.5}
              help={HELP.startupMinutes}
            />
          </div>
        </AdvancedPanel>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-relaxed text-white/40">
          A energia soma o <span className="font-black text-white/80">pico de aquecimento</span> nos
          primeiros minutos com o <span className="font-black text-white/80">regime estável</span>{" "}
          pelo resto da impressão.
        </div>
      </CollapsibleSection>
    </Reveal>
  );
}

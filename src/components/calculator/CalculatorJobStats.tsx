import { Factory, Gauge, Layers3 } from "lucide-react";
import { formatBRL, formatHoursToHHMM, HELP } from "../../lib/pricing";
import { HelpTip } from "./primitives";

interface CalculatorJobStatsProps {
  totalPieces: number;
  unitCost: number;
  hours: number;
}

export function CalculatorJobStats({ totalPieces, unitCost, hours }: CalculatorJobStatsProps) {
  return (
    <div className="mt-5 grid grid-cols-3 gap-3 text-center">
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <Factory className="mx-auto mb-2 h-4 w-4 text-primary" />
        <p className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
          Lote <HelpTip text={HELP.batch} />
        </p>
        <p className="font-mono text-sm font-black text-white">{Math.max(1, totalPieces)} un.</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <Layers3 className="mx-auto mb-2 h-4 w-4 text-cyan-300" />
        <p className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
          Unitário <HelpTip text={HELP.unitCost} />
        </p>
        <p className="font-mono text-sm font-black text-white">{formatBRL(unitCost)}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <Gauge className="mx-auto mb-2 h-4 w-4 text-orange-300" />
        <p className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
          Horas <HelpTip text={HELP.time} />
        </p>
        <p className="font-mono text-sm font-black text-white">{formatHoursToHHMM(hours)}</p>
      </div>
    </div>
  );
}

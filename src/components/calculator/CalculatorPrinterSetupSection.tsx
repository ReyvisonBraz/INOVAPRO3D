import { Factory } from "lucide-react";
import { formatBRL } from "../../lib/pricing";
import type { Printer } from "../../types/domain";
import { Reveal } from "../ui/Reveal";
import { PrinterPicker } from "./PrinterPicker";
import { SectionCard } from "./primitives";

interface CalculatorPrinterSetupSectionProps {
  printers: Printer[];
  selectedPrinterId: string;
  overrideCount: number;
  quickMode: boolean;
  kwhCost: number;
  failureRatePct: number;
  retailMarkupLabel: string;
  minPrice: number;
  onSelectPrinter: (id: string) => void;
  onResetOverrides: () => void;
  onOpenFullMode: () => void;
}

export function CalculatorPrinterSetupSection({
  printers,
  selectedPrinterId,
  overrideCount,
  quickMode,
  kwhCost,
  failureRatePct,
  retailMarkupLabel,
  minPrice,
  onSelectPrinter,
  onResetOverrides,
  onOpenFullMode,
}: CalculatorPrinterSetupSectionProps) {
  return (
    <>
      <Reveal delay={0.05}>
        <SectionCard
          icon={Factory}
          title="Impressora"
          subtitle="Base de cálculo desta proposta — personalize valores só para este orçamento se precisar"
        >
          <PrinterPicker
            printers={printers}
            selectedPrinterId={selectedPrinterId}
            onSelect={onSelectPrinter}
            overrideCount={overrideCount}
            onResetOverrides={onResetOverrides}
          />
        </SectionCard>
      </Reveal>

      {quickMode && (
        <Reveal delay={0.08}>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs leading-relaxed text-white/45">
            Usando seus padrões:{" "}
            <strong className="font-black text-white/75">{formatBRL(kwhCost)}/kWh</strong> · falha{" "}
            <strong className="font-black text-white/75">{failureRatePct}%</strong> · varejo{" "}
            <strong className="font-black text-white/75">{retailMarkupLabel}</strong> · mínimo{" "}
            <strong className="font-black text-white/75">{formatBRL(minPrice)}</strong>
            <button
              type="button"
              onClick={onOpenFullMode}
              className="ml-2 font-black text-cyan-300 underline decoration-dotted underline-offset-2 hover:text-cyan-200"
            >
              Ajustar tudo →
            </button>
          </div>
        </Reveal>
      )}
    </>
  );
}

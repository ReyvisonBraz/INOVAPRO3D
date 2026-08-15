import { ImageIcon, Plus, RotateCcw, Star } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatBRL, machineHourBreakdown } from "../../lib/pricing";
import { machineConfigFromPrinter } from "../../lib/printers";
import type { Printer } from "../../types/domain";

interface PrinterPickerProps {
  printers: Printer[];
  selectedPrinterId: string;
  onSelect: (id: string) => void;
  overrideCount: number;
  onResetOverrides: () => void;
  onOpenPrinters?: () => void;
}

/**
 * Seletor de impressora da calculadora. Mostra nome, foto e custo-hora de
 * cada máquina cadastrada — a personalização feita por baixo (na seção
 * "Ajustar máquina") nunca grava no cadastro, só sobrepõe o cálculo deste
 * orçamento; este componente só avisa quantos campos foram tocados.
 */
export function PrinterPicker({
  printers,
  selectedPrinterId,
  onSelect,
  overrideCount,
  onResetOverrides,
  onOpenPrinters,
}: PrinterPickerProps) {
  if (!printers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-center">
        <p className="text-xs text-white/45">
          Nenhuma impressora cadastrada ainda. A calculadora está usando a configuração de máquina
          salva em Ajustes.
        </p>
        {onOpenPrinters && (
          <button
            type="button"
            onClick={onOpenPrinters}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Cadastrar impressora
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {printers
          .filter((printer) => printer.active !== false || printer.id === selectedPrinterId)
          .map((printer) => {
            const active = printer.id === selectedPrinterId;
            const hourly = machineHourBreakdown(machineConfigFromPrinter(printer));
            return (
              <button
                key={printer.id}
                type="button"
                onClick={() => onSelect(printer.id)}
                aria-pressed={active}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border text-left transition",
                  active
                    ? "border-cyan-300/50 bg-cyan-400/[0.08] shadow-[0_0_0_1px_rgba(103,232,249,0.25)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]",
                )}
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-black/30">
                  {printer.photoUrl ? (
                    <img
                      src={printer.photoUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/15">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                {printer.isDefault && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-200 backdrop-blur">
                    <Star className="h-2 w-2" /> Padrão
                  </span>
                )}
                <div className="p-2.5">
                  <p className="truncate text-[11px] font-black text-white">{printer.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] font-bold text-cyan-300/80">
                    {formatBRL(hourly.total)}/h
                  </p>
                </div>
              </button>
            );
          })}
      </div>

      {overrideCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-2.5">
          <p className="text-[11px] text-amber-100/80">
            <strong className="font-black text-amber-200">
              {overrideCount}{" "}
              {overrideCount === 1 ? "valor personalizado" : "valores personalizados"}
            </strong>{" "}
            só neste orçamento. O cadastro da impressora não foi alterado.
          </p>
          <button
            type="button"
            onClick={onResetOverrides}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-300/30 px-2.5 py-1.5 text-[10px] font-bold text-amber-200 transition hover:bg-amber-400/10"
          >
            <RotateCcw className="h-3 w-3" /> Restaurar da impressora
          </button>
        </div>
      )}
    </div>
  );
}

import { AlertTriangle } from "lucide-react";

interface AdminQuoteCalcSnapshotNoticeProps {
  onEditInCalculator: () => void;
  onDuplicate: () => void;
}

export function AdminQuoteCalcSnapshotNotice({
  onEditInCalculator,
  onDuplicate,
}: AdminQuoteCalcSnapshotNoticeProps) {
  return (
    <div className="mb-6 rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <p className="text-sm font-black text-amber-100">
              Este orçamento possui ficha técnica de cálculo
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/65">
              Alterar os campos abaixo muda apenas os valores exibidos. Para recalcular máquina,
              bandejas e custos mantendo a ficha sincronizada, abra-o na calculadora.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEditInCalculator}
            className="min-h-10 rounded-xl bg-blue-600 px-3 text-xs font-black text-white hover:bg-blue-500"
          >
            Editar no cálculo
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="min-h-10 rounded-xl border border-white/15 px-3 text-xs font-bold text-white/70 hover:bg-white/[0.06]"
          >
            Duplicar
          </button>
        </div>
      </div>
    </div>
  );
}

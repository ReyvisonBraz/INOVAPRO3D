import { AlertTriangle, Save } from "lucide-react";
import type { CalculatorTemplate } from "../../types/domain";

interface CalculatorNoticesProps {
  snapshotStale: boolean;
  template: CalculatorTemplate | null;
  onUpdateTemplate: (template: CalculatorTemplate) => void;
}

export function CalculatorNotices({
  snapshotStale,
  template,
  onUpdateTemplate,
}: CalculatorNoticesProps) {
  return (
    <>
      {snapshotStale && (
        <div
          className="mb-6 flex gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-relaxed text-amber-100"
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <strong className="block font-black">Confira os valores antes de salvar</strong>
            Este orçamento foi criado antes da ficha técnica completa ou teve campos alterados
            diretamente no painel. As bandejas foram recuperadas, mas os parâmetros atuais precisam
            ser confirmados.
          </div>
        </div>
      )}

      {template && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-violet-300/25 bg-violet-300/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="block text-sm font-black text-violet-100">
              Editando o modelo “{template.name}”
            </strong>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              Ajuste bandejas, custos e parâmetros abaixo. Ao terminar, grave o conteúdo no mesmo
              modelo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onUpdateTemplate(template)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white transition hover:bg-violet-500"
          >
            <Save className="h-4 w-4" /> Salvar alterações no modelo
          </button>
        </div>
      )}
    </>
  );
}

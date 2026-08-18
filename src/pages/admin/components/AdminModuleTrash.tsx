import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
import type { TrashEntry } from "../../../types/domain";
import { AdminEmptyState } from "./AdminPrimitives";

interface Props {
  items: TrashEntry[];
  itemLabel: string;
  blocked?: boolean;
  onRestore: (entry: TrashEntry) => void;
  onDeletePermanently: (entry: TrashEntry) => void;
  onEmpty: () => void;
}

function deletedDate(entry: TrashEntry): string {
  const value = entry.deletedAt;
  if (!value || typeof value.seconds !== "number") return "Agora";
  return new Date(value.seconds * 1000).toLocaleString("pt-BR");
}

export default function AdminModuleTrash({
  items,
  itemLabel,
  blocked = false,
  onRestore,
  onDeletePermanently,
  onEmpty,
}: Props) {
  return (
    <section className="admin-panel overflow-hidden border-red-400/15">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] p-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-white">
            <Trash2 className="h-4 w-4 text-red-300" /> Lixeira de {itemLabel}
          </h3>
          <p className="mt-1 text-xs text-white/40">
            {items.length} {items.length === 1 ? "item excluído" : "itens excluídos"}
          </p>
        </div>
        {items.length > 0 && !blocked && (
          <button
            type="button"
            onClick={onEmpty}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-500/10 px-3 text-[11px] font-bold text-red-300 transition hover:bg-red-500 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" /> Esvaziar lixeira
          </button>
        )}
      </div>

      {blocked && (
        <p className="m-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> A lixeira está temporariamente
          indisponível até a publicação das regras no Firebase.
        </p>
      )}

      {!blocked && items.length === 0 ? (
        <AdminEmptyState
          title={`Nenhum ${itemLabel.toLowerCase()} excluído`}
          description="Quando você excluir um item, ele aparecerá aqui para restauração."
        />
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {items.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white/85">{entry.label}</p>
                <p className="mt-1 text-[11px] text-white/35">
                  Excluído em {deletedDate(entry)} · #{entry.originalId.slice(0, 10)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => onRestore(entry)}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500/10 px-3 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500 hover:text-white sm:flex-none"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                </button>
                <button
                  type="button"
                  onClick={() => onDeletePermanently(entry)}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-red-500/10 px-3 text-[11px] font-bold text-red-300 transition hover:bg-red-500 hover:text-white sm:flex-none"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir de vez
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

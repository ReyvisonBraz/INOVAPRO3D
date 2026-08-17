import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
import type { TrashEntry } from "../../../types/domain";
import { AdminEmptyState, AdminMetric, AdminSectionHeader } from "./AdminPrimitives";

interface Props {
  items: TrashEntry[];
  blocked: boolean;
  onRestore: (entry: TrashEntry) => void;
  onDeletePermanently: (entry: TrashEntry) => void;
}

const COLLECTION_LABELS: Record<string, string> = {
  orders: "Pedido",
  quotes: "Orçamento",
  products: "Produto",
  categories: "Categoria",
  materials: "Material",
  customers: "Cliente",
  tickets: "Ticket",
  faqs: "FAQ",
  showcase: "Vitrine",
  coupons: "Cupom",
};

function deletedDate(entry: TrashEntry): string {
  const value = entry.deletedAt;
  if (!value || typeof value.seconds !== "number") return "Agora";
  return new Date(value.seconds * 1000).toLocaleString("pt-BR");
}

export default function AdminTrashPanel({ items, blocked, onRestore, onDeletePermanently }: Props) {
  return (
    <div className="space-y-4">
      <AdminSectionHeader
        eyebrow="Segurança"
        title="Lixeira"
        description="Restaure exclusões acidentais ou remova definitivamente após a conferência."
      />

      {blocked && (
        <div className="flex gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            As regras da coleção <strong>trash</strong> ainda precisam ser publicadas no Firebase.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminMetric
          label="Itens na lixeira"
          value={items.length}
          tone={items.length ? "warning" : "default"}
        />
        <AdminMetric
          label="Pedidos"
          value={items.filter((item) => item.sourceCollection === "orders").length}
        />
        <AdminMetric
          label="Orçamentos"
          value={items.filter((item) => item.sourceCollection === "quotes").length}
        />
        <AdminMetric
          label="Outros registros"
          value={
            items.filter((item) => !["orders", "quotes"].includes(item.sourceCollection)).length
          }
        />
      </div>

      <div className="admin-table-wrap overflow-x-auto no-scrollbar">
        <table className="admin-table min-w-[720px]">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Item</th>
              <th>Excluído em</th>
              <th>Excluído por</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr key={entry.id}>
                <td className="text-xs font-semibold text-blue-300">
                  {COLLECTION_LABELS[entry.sourceCollection] || entry.sourceCollection}
                </td>
                <td>
                  <p className="max-w-[280px] truncate text-sm font-semibold text-white/85">
                    {entry.label}
                  </p>
                  <p className="font-mono text-[10px] text-white/30">
                    #{entry.originalId.slice(0, 10)}
                  </p>
                </td>
                <td className="text-xs text-white/50">{deletedDate(entry)}</td>
                <td className="max-w-[180px] truncate text-xs text-white/45">
                  {entry.deletedBy || "Administrador"}
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onRestore(entry)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500 hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePermanently(entry)}
                      title="Excluir permanentemente"
                      className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/10 text-red-300 transition hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!blocked && items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-0">
                  <AdminEmptyState
                    title="A lixeira está vazia"
                    description="Itens removidos pelo painel aparecerão aqui para restauração."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

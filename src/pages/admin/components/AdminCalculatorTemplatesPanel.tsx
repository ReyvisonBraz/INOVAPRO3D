import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Calculator,
  Copy,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  cloneCalculatorTemplate,
  deleteCalculatorTemplate,
  fetchAllCalculatorTemplates,
  permanentlyDeleteCalculatorTemplate,
  restoreCalculatorTemplate,
  setCalculatorTemplateArchived,
  updateCalculatorTemplate,
} from "../../../services/calculatorTemplates";
import type { CalculatorTemplate } from "../../../types/domain";
import { AdminEmptyState, AdminMetric, AdminSectionHeader } from "./AdminPrimitives";

interface Props {
  onEditInCalculator: (template: CalculatorTemplate) => void;
}

export default function AdminCalculatorTemplatesPanel({ onEditInCalculator }: Props) {
  const [templates, setTemplates] = useState<CalculatorTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"ACTIVE" | "ARCHIVED" | "TRASH">("ACTIVE");
  const [editing, setEditing] = useState<CalculatorTemplate | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await fetchAllCalculatorTemplates());
    } catch {
      toast.error("Não foi possível carregar os modelos da calculadora.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // O carregamento inicial sincroniza este painel com a coleção remota.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const visible = useMemo(
    () =>
      templates.filter((template) => {
        if (view === "TRASH") return template.deleted;
        if (view === "ARCHIVED") return template.archived && !template.deleted;
        return !template.archived && !template.deleted;
      }),
    [templates, view],
  );

  const beginEdit = (template: CalculatorTemplate) => {
    setEditing(template);
    setEditName(template.name);
    setEditDescription(template.description ?? "");
  };

  return (
    <div className="space-y-4">
      <AdminSectionHeader
        eyebrow="Calculadora"
        title="Modelos de projeto"
        description="Organize configurações reutilizáveis, revise seu conteúdo e mantenha modelos antigos arquivados."
        actions={
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["ACTIVE", "Ativos", Calculator],
                ["ARCHIVED", "Arquivados", Archive],
                ["TRASH", "Lixeira", Trash2],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setView(id);
                  setPendingDeleteId(null);
                }}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-semibold transition ${view === id ? "border-blue-400/30 bg-blue-500/15 text-blue-100" : "border-white/10 bg-white/[0.04] text-white/55 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminMetric
          label="Modelos ativos"
          value={templates.filter((item) => !item.archived && !item.deleted).length}
        />
        <AdminMetric
          label="Arquivados"
          value={templates.filter((item) => item.archived && !item.deleted).length}
        />
        <AdminMetric label="Na lixeira" value={templates.filter((item) => item.deleted).length} />
        <AdminMetric
          label="Usos acumulados"
          value={templates
            .filter((item) => !item.deleted)
            .reduce((sum, item) => sum + (item.usageCount || 0), 0)}
        />
      </div>

      {loading ? (
        <div className="admin-panel flex min-h-48 items-center justify-center gap-2 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando modelos...
        </div>
      ) : visible.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((template) => (
            <article key={template.id} className="admin-panel p-4">
              <div className="flex gap-3">
                {template.imageUrl ? (
                  <img
                    src={template.imageUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                    <Calculator className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-white">{template.name}</h3>
                  <p className="mt-1 text-[11px] text-white/40">
                    {template.snapshot.project.plates.length} bandeja(s) ·{" "}
                    {template.usageCount || 0} uso(s)
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-white/45">
                    {template.description || "Sem descrição"}
                  </p>
                </div>
              </div>
              {view === "TRASH" ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await restoreCalculatorTemplate(template.id);
                        toast.success("Modelo restaurado para os ativos.");
                        await reload();
                      } catch {
                        toast.error("Falha ao restaurar modelo.");
                      }
                    }}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-500/15 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500 hover:text-white"
                  >
                    <RotateCcw className="h-4 w-4" /> Restaurar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (pendingDeleteId !== template.id) {
                        setPendingDeleteId(template.id);
                        return;
                      }
                      try {
                        await permanentlyDeleteCalculatorTemplate(template.id);
                        toast.success("Modelo excluído definitivamente.");
                        setPendingDeleteId(null);
                        await reload();
                      } catch {
                        toast.error("Falha ao excluir definitivamente.");
                      }
                    }}
                    className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg text-[11px] font-bold ${pendingDeleteId === template.id ? "bg-red-500 text-white" : "bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white"}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    {pendingDeleteId === template.id ? "Confirmar exclusão" : "Excluir de vez"}
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-[1fr_repeat(4,36px)] gap-2">
                  <button
                    type="button"
                    onClick={() => onEditInCalculator(template)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-500/15 px-2 text-[10px] font-bold uppercase text-blue-200 hover:bg-blue-500 hover:text-white"
                  >
                    <Calculator className="h-3.5 w-3.5" /> Editar conteúdo
                  </button>
                  <button
                    type="button"
                    onClick={() => beginEdit(template)}
                    title="Editar nome e descrição"
                    className="grid h-9 place-items-center rounded-lg bg-white/[0.05] text-white/55 hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await cloneCalculatorTemplate(template);
                        toast.success("Modelo clonado.");
                        await reload();
                      } catch {
                        toast.error("Falha ao clonar modelo.");
                      }
                    }}
                    title="Clonar"
                    className="grid h-9 place-items-center rounded-lg bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await setCalculatorTemplateArchived(template.id, !template.archived);
                        toast.success(
                          template.archived ? "Modelo restaurado." : "Modelo arquivado.",
                        );
                        await reload();
                      } catch {
                        toast.error("Falha ao alterar o arquivamento.");
                      }
                    }}
                    title={template.archived ? "Restaurar" : "Arquivar"}
                    className="grid h-9 place-items-center rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-black"
                  >
                    {template.archived ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (pendingDeleteId !== template.id) {
                        setPendingDeleteId(template.id);
                        return;
                      }
                      try {
                        await deleteCalculatorTemplate(template.id);
                        toast.success("Modelo movido para a lixeira.");
                        setPendingDeleteId(null);
                        await reload();
                      } catch {
                        toast.error("Falha ao excluir modelo.");
                      }
                    }}
                    title={
                      pendingDeleteId === template.id
                        ? "Clique novamente para confirmar"
                        : "Excluir"
                    }
                    className={`grid h-9 place-items-center rounded-lg ${pendingDeleteId === template.id ? "bg-red-500 text-white" : "bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white"}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-panel">
          <AdminEmptyState
            title={
              view === "TRASH"
                ? "A lixeira está vazia"
                : view === "ARCHIVED"
                  ? "Nenhum modelo arquivado"
                  : "Nenhum modelo ativo"
            }
            description={
              view === "TRASH"
                ? "Os modelos excluídos temporariamente aparecerão aqui."
                : "Crie modelos pela calculadora e eles aparecerão aqui."
            }
          />
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#11151f] p-5 shadow-2xl">
            <h3 className="text-lg font-black text-white">Editar modelo</h3>
            <div className="mt-4 space-y-3">
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Nome do modelo"
                className="admin-input w-full"
              />
              <textarea
                rows={4}
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="Descrição e quando usar este modelo"
                className="admin-input w-full resize-none"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-10 rounded-xl border border-white/10 px-4 text-xs font-bold text-white/60 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!editName.trim()}
                onClick={async () => {
                  try {
                    await updateCalculatorTemplate(editing.id, {
                      name: editName,
                      description: editDescription,
                    });
                    toast.success("Modelo atualizado.");
                    setEditing(null);
                    await reload();
                  } catch {
                    toast.error("Falha ao editar modelo.");
                  }
                }}
                className="h-10 rounded-xl bg-primary px-4 text-xs font-bold text-white disabled:opacity-40"
              >
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

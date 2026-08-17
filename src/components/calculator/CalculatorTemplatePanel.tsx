import { useState } from "react";
import {
  Archive,
  BookmarkPlus,
  Check,
  ChevronDown,
  Copy,
  Layers,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import type { CalculatorTemplate } from "../../types/domain";

interface CalculatorTemplatePanelProps {
  templates: CalculatorTemplate[];
  loading: boolean;
  saving: boolean;
  onApply: (template: CalculatorTemplate) => void;
  onSave: (name: string) => Promise<boolean>;
  onEdit: (template: CalculatorTemplate, name: string, description: string) => Promise<boolean>;
  onUpdateFromCurrent: (template: CalculatorTemplate) => Promise<boolean>;
  onClone: (template: CalculatorTemplate) => Promise<void>;
  onArchive: (template: CalculatorTemplate) => Promise<void>;
  onDelete: (template: CalculatorTemplate) => Promise<void>;
}

export function CalculatorTemplatePanel({
  templates,
  loading,
  saving,
  onApply,
  onSave,
  onEdit,
  onUpdateFromCurrent,
  onClone,
  onArchive,
  onDelete,
}: CalculatorTemplatePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const startEditing = (template: CalculatorTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditDescription(template.description ?? "");
  };

  return (
    <section className="rounded-[24px] border border-white/[0.08] bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center gap-3 p-4 text-left sm:p-5"
        aria-expanded={expanded}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300">
          <Layers className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
            Modelos de projeto
          </span>
          <span className="mt-1 block truncate text-xs text-white/45">
            {loading ? "Carregando..." : `${templates.length} ativo(s) · aplicar e gerenciar`}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 text-white/45 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-white/[0.07] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs text-white/45">
              Reutilize configurações sem copiar o cliente. Edite, clone, arquive ou substitua um
              modelo pelo projeto aberto.
            </p>
            <button
              type="button"
              onClick={() => setShowSave((current) => !current)}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/10 px-3 text-[11px] font-black text-violet-200"
            >
              <BookmarkPlus className="h-4 w-4" /> Salvar modelo atual
            </button>
          </div>

          {showSave && (
            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Chaveiros PLA · P2S"
                className="min-h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30 focus:border-violet-300/40 focus:outline-none"
              />
              <button
                type="button"
                disabled={saving || !name.trim()}
                onClick={async () => {
                  if (await onSave(name)) {
                    setName("");
                    setShowSave(false);
                  }
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:opacity-40"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Criar modelo
              </button>
            </div>
          )}

          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {loading && (
              <div className="flex min-h-28 min-w-56 items-center justify-center gap-2 rounded-xl border border-white/10 text-xs text-white/45">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando modelos...
              </div>
            )}
            {!loading && !templates.length && (
              <div className="min-w-full rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
                Nenhum modelo ativo. Crie um ou restaure modelos arquivados pelo painel.
              </div>
            )}
            {templates.map((template) => (
              <article
                key={template.id}
                className="min-w-72 rounded-xl border border-white/10 bg-black/20 p-3"
              >
                {editingId === template.id ? (
                  <div className="space-y-2">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-xs font-bold text-white outline-none focus:border-violet-300/40"
                    />
                    <textarea
                      rows={2}
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      placeholder="Descrição opcional"
                      className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white outline-none focus:border-violet-300/40"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!editName.trim()}
                        onClick={async () => {
                          if (await onEdit(template, editName, editDescription)) setEditingId(null);
                        }}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-violet-600 text-[10px] font-black text-white disabled:opacity-40"
                      >
                        <Check className="h-3.5 w-3.5" /> Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/50 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-3">
                      {template.imageUrl ? (
                        <img
                          src={template.imageUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-violet-400/10">
                          <Layers className="h-4 w-4 text-violet-300" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-white">
                          {template.name}
                        </strong>
                        <span className="mt-1 block text-[11px] text-white/40">
                          {template.snapshot.project.plates.length} bandeja(s) · usado{" "}
                          {template.usageCount || 0}x
                        </span>
                      </div>
                    </div>
                    {template.description && (
                      <p className="mt-2 line-clamp-2 text-[11px] text-white/40">
                        {template.description}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => onApply(template)}
                      className="mt-3 h-9 w-full rounded-lg bg-violet-500/15 text-[10px] font-black uppercase text-violet-200 hover:bg-violet-500 hover:text-white"
                    >
                      Aplicar modelo
                    </button>
                    <div className="mt-2 grid grid-cols-5 gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEditing(template)}
                        title="Editar nome e descrição"
                        className="grid h-8 place-items-center rounded-lg bg-white/[0.05] text-white/50 hover:text-white"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateFromCurrent(template)}
                        title="Substituir pelo projeto atual"
                        className="grid h-8 place-items-center rounded-lg bg-blue-500/10 text-blue-300 hover:bg-blue-500 hover:text-white"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onClone(template)}
                        title="Clonar modelo"
                        className="grid h-8 place-items-center rounded-lg bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-white"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onArchive(template)}
                        title="Arquivar modelo"
                        className="grid h-8 place-items-center rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-black"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          pendingDeleteId === template.id
                            ? onDelete(template)
                            : setPendingDeleteId(template.id)
                        }
                        title={
                          pendingDeleteId === template.id
                            ? "Clique novamente para confirmar"
                            : "Excluir modelo"
                        }
                        className={`grid h-8 place-items-center rounded-lg ${pendingDeleteId === template.id ? "bg-red-500 text-white" : "bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white"}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

import { useMemo, useState } from "react";
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
import { groupTemplatesByProduct } from "../../lib/calculatorTemplateGroups";

interface CalculatorTemplatePanelProps {
  templates: CalculatorTemplate[];
  loading: boolean;
  saving: boolean;
  /** outputQuantity do projeto aberto agora — pré-preenche o campo de nova quantidade. */
  currentQuantity: number;
  onApply: (template: CalculatorTemplate) => void;
  onSave: (name: string) => Promise<boolean>;
  onSaveVariant: (anchor: CalculatorTemplate, quantityValue: number) => Promise<boolean>;
  onEdit: (template: CalculatorTemplate, name: string, description: string) => Promise<boolean>;
  onUpdateFromCurrent: (template: CalculatorTemplate) => Promise<boolean>;
  onClone: (template: CalculatorTemplate) => Promise<void>;
  onArchive: (template: CalculatorTemplate) => Promise<void>;
  onDelete: (template: CalculatorTemplate) => Promise<void>;
}

const ICON_BUTTON_CLASS = "grid h-8 place-items-center rounded-lg";

export function CalculatorTemplatePanel({
  templates,
  loading,
  saving,
  currentQuantity,
  onApply,
  onSave,
  onSaveVariant,
  onEdit,
  onUpdateFromCurrent,
  onClone,
  onArchive,
  onDelete,
}: CalculatorTemplatePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [saveMode, setSaveMode] = useState<"NEW" | "VARIANT">("NEW");
  const [name, setName] = useState("");
  const [variantAnchorId, setVariantAnchorId] = useState("");
  const [variantQuantity, setVariantQuantity] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Qual variante cada grupo está exibindo/operando agora. Chave por
  // productKey (estável mesmo se a âncora mudar) — grupos avulsos, que não
  // têm productKey, nem precisam de entrada aqui (variants.length === 1).
  const [selectedVariantByGroup, setSelectedVariantByGroup] = useState<Record<string, string>>({});

  const groups = useMemo(() => groupTemplatesByProduct(templates), [templates]);

  const startEditing = (template: CalculatorTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditDescription(template.description ?? "");
  };

  const openSaveBox = () => {
    const opening = !showSave;
    setShowSave(opening);
    if (opening) {
      setVariantQuantity(String(Math.max(1, Math.floor(currentQuantity) || 1)));
      if (!variantAnchorId && groups.length) setVariantAnchorId(groups[0].anchor.id);
    }
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
              onClick={openSaveBox}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/10 px-3 text-[11px] font-black text-violet-200"
            >
              <BookmarkPlus className="h-4 w-4" /> Salvar modelo atual
            </button>
          </div>

          {showSave && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              {groups.length > 0 && (
                <div className="mb-3 flex gap-2" role="tablist">
                  {(
                    [
                      { id: "NEW", label: "Novo modelo" },
                      { id: "VARIANT", label: "Nova quantidade" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={saveMode === tab.id}
                      onClick={() => setSaveMode(tab.id)}
                      className={`min-h-9 flex-1 rounded-lg px-3 text-[11px] font-black transition ${
                        saveMode === tab.id
                          ? "bg-violet-600 text-white"
                          : "bg-white/[0.04] text-white/50 hover:text-white/80"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {saveMode === "NEW" || !groups.length ? (
                <div className="flex flex-col gap-2 sm:flex-row">
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
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] leading-relaxed text-white/40">
                    Salva o projeto aberto agora como mais uma quantidade do produto escolhido.
                    Continua aparecendo separado no painel de Orçamentos — isto só facilita reabrir
                    os números certos da próxima vez.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={variantAnchorId}
                      onChange={(event) => setVariantAnchorId(event.target.value)}
                      className="min-h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white focus:border-violet-300/40 focus:outline-none"
                    >
                      {groups.map((group) => (
                        <option key={group.anchor.id} value={group.anchor.id}>
                          {group.anchor.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={variantQuantity}
                      onChange={(event) => setVariantQuantity(event.target.value)}
                      placeholder="Quantidade"
                      aria-label="Quantidade desta variante"
                      className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30 focus:border-violet-300/40 focus:outline-none sm:w-32"
                    />
                    <button
                      type="button"
                      disabled={saving || !variantAnchorId || !Number(variantQuantity)}
                      onClick={async () => {
                        const anchor = templates.find((item) => item.id === variantAnchorId);
                        if (!anchor) return;
                        if (await onSaveVariant(anchor, Number(variantQuantity))) {
                          setShowSave(false);
                        }
                      }}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:opacity-40"
                    >
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />} Vincular
                    </button>
                  </div>
                </div>
              )}
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
            {groups.map((group) => {
              const groupKey = group.anchor.productKey ?? group.anchor.id;
              const selectedId = selectedVariantByGroup[groupKey] ?? group.anchor.id;
              const selected =
                group.variants.find((variant) => variant.id === selectedId) ?? group.anchor;
              const isMultiVariant = group.variants.length > 1;

              return (
                <article
                  key={groupKey}
                  className="min-w-72 rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  {editingId === selected.id ? (
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
                            if (await onEdit(selected, editName, editDescription)) {
                              setEditingId(null);
                            }
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
                        {group.anchor.imageUrl ? (
                          <img
                            src={group.anchor.imageUrl}
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
                            {group.anchor.name}
                          </strong>
                          <span className="mt-1 block text-[11px] text-white/40">
                            {selected.snapshot.project.plates.length} bandeja(s) · usado{" "}
                            {selected.usageCount || 0}x
                          </span>
                        </div>
                      </div>

                      {isMultiVariant && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {group.variants.map((variant) => (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() =>
                                setSelectedVariantByGroup((current) => ({
                                  ...current,
                                  [groupKey]: variant.id,
                                }))
                              }
                              className={`min-h-8 rounded-lg px-2.5 text-[11px] font-black transition ${
                                variant.id === selected.id
                                  ? "bg-violet-500 text-white"
                                  : "bg-white/[0.05] text-white/50 hover:text-white/80"
                              }`}
                            >
                              {variant.quantityValue ?? "?"} pç
                            </button>
                          ))}
                        </div>
                      )}

                      {selected.description && (
                        <p className="mt-2 line-clamp-2 text-[11px] text-white/40">
                          {selected.description}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => onApply(selected)}
                        className="mt-3 h-9 w-full rounded-lg bg-violet-500/15 text-[10px] font-black uppercase text-violet-200 hover:bg-violet-500 hover:text-white"
                      >
                        Aplicar modelo
                      </button>
                      <div className="mt-2 grid grid-cols-5 gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEditing(selected)}
                          title="Editar nome e descrição"
                          className={`${ICON_BUTTON_CLASS} bg-white/[0.05] text-white/50 hover:text-white`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateFromCurrent(selected)}
                          title="Substituir pelo projeto atual"
                          className={`${ICON_BUTTON_CLASS} bg-blue-500/10 text-blue-300 hover:bg-blue-500 hover:text-white`}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onClone(selected)}
                          title="Clonar modelo"
                          className={`${ICON_BUTTON_CLASS} bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-white`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onArchive(selected)}
                          title="Arquivar modelo"
                          className={`${ICON_BUTTON_CLASS} bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-black`}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            pendingDeleteId === selected.id
                              ? onDelete(selected)
                              : setPendingDeleteId(selected.id)
                          }
                          title={
                            pendingDeleteId === selected.id
                              ? "Clique novamente para confirmar"
                              : "Excluir modelo"
                          }
                          className={`${ICON_BUTTON_CLASS} ${pendingDeleteId === selected.id ? "bg-red-500 text-white" : "bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white"}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

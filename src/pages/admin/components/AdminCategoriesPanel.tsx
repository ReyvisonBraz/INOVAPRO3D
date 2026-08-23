import { memo, type FC, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  FolderOpen,
  FolderPlus,
  FolderTree,
  Image,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import type { CategoryBackfillPlan } from "../../../lib/productCategory";
import type { Category } from "../../../types/domain";

interface AdminCategoriesPanelProps {
  categories: Category[];
  /** Id da categoria -> produtos vinculados diretamente a ela. */
  productsCount: Map<string, number>;
  /** Produtos com categoria resolvida. Nao e a soma de productsCount: um
   *  produto legado de nome ambiguo aparece em cada homonima. */
  assignedProducts: number;
  onAdd: (parentId?: string) => void;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  onSetCover: (cat: Category) => void;
  /** Previa do backfill: o que da para vincular sozinho e o que sobra. */
  backfillPlan: CategoryBackfillPlan;
  /** Grava os `categoryId` da previa. So e chamado apos confirmacao. */
  onRunBackfill: () => Promise<void>;
}

const byOrder = (a: Category, b: Category) => (a.order ?? 999) - (b.order ?? 999);

const AdminCategoriesPanel: FC<AdminCategoriesPanelProps> = memo(
  ({
    categories,
    productsCount,
    assignedProducts,
    onAdd,
    onEdit,
    onDelete,
    onToggleActive,
    onReorder,
    onSetCover,
    backfillPlan,
    onRunBackfill,
  }) => {
    const [backfillConfirming, setBackfillConfirming] = useState(false);
    const [backfillRunning, setBackfillRunning] = useState(false);
    /** Nomes distintos da fila, para o admin saber o que vai decidir depois. */
    const pendingNames = useMemo(
      () =>
        Array.from(
          new Set(
            backfillPlan.pending.map((product) => product.category?.trim() || "(sem categoria)"),
          ),
        ),
      [backfillPlan],
    );

    const roots = useMemo(
      () => categories.filter((category) => !category.parentId).sort(byOrder),
      [categories],
    );
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const effectiveSelectedId = roots.some((category) => category.id === selectedId)
      ? selectedId
      : roots[0]?.id || null;
    const selected = roots.find((category) => category.id === effectiveSelectedId) || null;
    const children = useMemo(
      () =>
        selected
          ? categories.filter((category) => category.parentId === selected.id).sort(byOrder)
          : [],
      [categories, selected],
    );

    const activeCount = categories.filter((category) => category.active !== false).length;
    const ownProductCount = selected ? (productsCount.get(selected.id) ?? 0) : 0;
    const childrenProductCount = children.reduce(
      (sum, category) => sum + (productsCount.get(category.id) ?? 0),
      0,
    );

    return (
      <motion.div
        key="categories"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-5"
      >
        <div className="flex flex-col gap-4 rounded-[24px] border border-white/5 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-widest">
                Estrutura do catálogo
              </h3>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-dim">
              Crie uma categoria principal e organize as subcategorias dentro dela
            </p>
          </div>
          <button
            onClick={() => onAdd()}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-primary-dark"
          >
            <Plus className="h-3.5 w-3.5" /> Nova categoria principal
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="admin-panel p-4">
            <p className="admin-eyebrow">Principais</p>
            <p className="text-2xl font-black text-white">{roots.length}</p>
            <p className="mt-1 text-[10px] text-dim">categorias de entrada</p>
          </div>
          <div className="admin-panel p-4">
            <p className="admin-eyebrow">Subcategorias</p>
            <p className="text-2xl font-black text-white">{categories.length - roots.length}</p>
            <p className="mt-1 text-[10px] text-dim">divisões internas</p>
          </div>
          <div className="admin-panel p-4">
            <p className="admin-eyebrow">Visíveis</p>
            <p className="text-2xl font-black text-white">{activeCount}</p>
            <p className="mt-1 text-[10px] text-dim">de {categories.length} cadastradas</p>
          </div>
          <div className="admin-panel p-4">
            <p className="admin-eyebrow">Produtos</p>
            <p className="text-2xl font-black text-white">{assignedProducts}</p>
            <p className="mt-1 text-[10px] text-dim">organizados no catálogo</p>
          </div>
        </div>

        {(backfillPlan.resolved.length > 0 || backfillPlan.pending.length > 0) && (
          <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/[0.04] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-300">
                  Vincular produtos às categorias
                </p>
                <p className="mt-1 text-[11px] text-dim">
                  <strong className="text-white">{backfillPlan.resolved.length}</strong>{" "}
                  {backfillPlan.resolved.length === 1 ? "produto" : "produtos"} de nome único
                  {backfillPlan.resolved.length === 1 ? " pode" : " podem"} ser vinculado
                  {backfillPlan.resolved.length === 1 ? "" : "s"} automaticamente ·{" "}
                  <strong className="text-white">{backfillPlan.pending.length}</strong>{" "}
                  {backfillPlan.pending.length === 1 ? "precisa" : "precisam"} de decisão sua na aba
                  Produtos
                </p>
                {pendingNames.length > 0 && (
                  <p className="mt-1 text-[10px] text-subtle">Na fila: {pendingNames.join(", ")}</p>
                )}
              </div>
              {backfillPlan.resolved.length > 0 && (
                <button
                  type="button"
                  disabled={backfillRunning}
                  onClick={async () => {
                    if (!backfillConfirming) {
                      setBackfillConfirming(true);
                      return;
                    }
                    setBackfillRunning(true);
                    try {
                      await onRunBackfill();
                    } finally {
                      setBackfillRunning(false);
                      setBackfillConfirming(false);
                    }
                  }}
                  className={cn(
                    "shrink-0 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50",
                    backfillConfirming
                      ? "bg-amber-500 hover:bg-amber-600"
                      : "bg-white/10 hover:bg-white/20",
                  )}
                >
                  {backfillRunning
                    ? "Vinculando…"
                    : backfillConfirming
                      ? `Confirmar ${backfillPlan.resolved.length}`
                      : "Revisar e vincular"}
                </button>
              )}
            </div>
          </div>
        )}

        {roots.length > 0 ? (
          <div className="grid min-h-[520px] overflow-hidden rounded-[26px] border border-white/[0.07] bg-white/[0.015] lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="border-b border-white/[0.07] bg-black/10 p-3 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between px-2 pb-3 pt-1">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-dim">
                    Categorias principais
                  </p>
                  <p className="mt-1 text-[10px] text-subtle">Selecione para organizar</p>
                </div>
                <button
                  onClick={() => onAdd()}
                  className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary transition-colors hover:bg-primary/20"
                  title="Nova categoria principal"
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                {roots.map((category) => {
                  const childTotal = categories.filter(
                    (item) => item.parentId === category.id,
                  ).length;
                  const active = category.active !== false;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedId(category.id)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all",
                        effectiveSelectedId === category.id
                          ? "border-primary/30 bg-primary/10"
                          : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.03]",
                        !active && "opacity-55",
                      )}
                    >
                      <span className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.04] text-dim">
                        {category.image ? (
                          <img src={category.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <FolderOpen className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-black uppercase text-white">
                          {category.name}
                        </span>
                        <span className="mt-1 block text-[10px] text-dim">
                          {childTotal} subcategoria{childTotal !== 1 ? "s" : ""}
                        </span>
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-dim transition-transform",
                          effectiveSelectedId === category.id && "translate-x-0.5 text-primary",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </aside>

            {selected && (
              <section className="min-w-0 p-4 sm:p-6">
                <div className="flex flex-col gap-5 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-start">
                  <button
                    type="button"
                    onClick={() => onSetCover(selected)}
                    className="flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] text-dim sm:w-32"
                    title="Alterar imagem da categoria"
                  >
                    {selected.image ? (
                      <img src={selected.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Image className="h-6 w-6 opacity-40" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-xl font-black uppercase text-white">
                        {selected.name}
                      </h4>
                      <button
                        onClick={() => onToggleActive(selected.id, selected.active !== false)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest",
                          selected.active !== false
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400",
                        )}
                      >
                        {selected.active !== false ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                        {selected.active !== false ? "Visível" : "Oculta"}
                      </button>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-dim">
                      {selected.description ||
                        "Sem descrição. Adicione uma frase curta para identificar esta categoria."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-subtle">
                      <span className="rounded-lg bg-white/[0.04] px-2.5 py-1.5">
                        {ownProductCount} direto{ownProductCount !== 1 ? "s" : ""}
                      </span>
                      <span className="rounded-lg bg-white/[0.04] px-2.5 py-1.5">
                        {childrenProductCount} em subcategorias
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => onReorder(selected.id, "up")}
                      className="rounded-lg p-2 text-dim hover:bg-white/5 hover:text-white"
                      title="Mover categoria para cima"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onReorder(selected.id, "down")}
                      className="rounded-lg p-2 text-dim hover:bg-white/5 hover:text-white"
                      title="Mover categoria para baixo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(selected)}
                      className="rounded-lg p-2 text-dim hover:bg-white/5 hover:text-white"
                      title="Editar categoria"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(selected.id)}
                      className="rounded-lg p-2 text-dim hover:bg-red-500/10 hover:text-red-400"
                      title="Excluir categoria"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h5 className="text-xs font-black uppercase tracking-widest text-white">
                        Subcategorias de {selected.name}
                      </h5>
                      <p className="mt-1 text-[10px] text-dim">
                        Crie divisões somente quando ajudarem o cliente a encontrar o produto.
                      </p>
                    </div>
                    <button
                      onClick={() => onAdd(selected.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/20"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar subcategoria
                    </button>
                  </div>

                  {children.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
                      {children.map((category) => {
                        const count = productsCount.get(category.id) ?? 0;
                        const active = category.active !== false;
                        return (
                          <div
                            key={category.id}
                            className={cn(
                              "flex flex-col gap-3 border-b border-white/[0.06] p-4 last:border-0 sm:flex-row sm:items-center",
                              !active && "opacity-55",
                            )}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <button
                                onClick={() => onSetCover(category)}
                                className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.04] text-dim"
                              >
                                {category.image ? (
                                  <img
                                    src={category.image}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Image className="h-3.5 w-3.5 opacity-40" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-black uppercase text-white">
                                  {category.name}
                                </p>
                                <p className="mt-1 flex items-center gap-1.5 text-[10px] text-dim">
                                  <Package className="h-3 w-3" /> {count} produto
                                  {count !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => onToggleActive(category.id, active)}
                              className={cn(
                                "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest",
                                active
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-red-500/10 text-red-400",
                              )}
                            >
                              {active ? (
                                <Eye className="h-3 w-3" />
                              ) : (
                                <EyeOff className="h-3 w-3" />
                              )}
                              {active ? "Visível" : "Oculta"}
                            </button>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => onReorder(category.id, "up")}
                                className="rounded-lg p-2 text-dim hover:bg-white/5 hover:text-white"
                                title="Subir"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => onReorder(category.id, "down")}
                                className="rounded-lg p-2 text-dim hover:bg-white/5 hover:text-white"
                                title="Descer"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => onEdit(category)}
                                className="rounded-lg p-2 text-dim hover:bg-white/5 hover:text-white"
                                title="Editar"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => onDelete(category.id)}
                                className="rounded-lg p-2 text-dim hover:bg-red-500/10 hover:text-red-400"
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.015] px-5 py-10 text-center">
                      <FolderPlus className="mx-auto mb-3 h-7 w-7 text-dim" />
                      <p className="text-xs font-black uppercase tracking-widest text-subtle">
                        Nenhuma subcategoria
                      </p>
                      <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-dim">
                        Você pode manter os produtos diretamente em {selected.name} ou criar uma
                        divisão mais específica.
                      </p>
                      <button
                        onClick={() => onAdd(selected.id)}
                        className="mt-4 text-[10px] font-black uppercase tracking-widest text-primary hover:text-white"
                      >
                        Criar primeira subcategoria
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="rounded-[26px] border border-dashed border-white/[0.09] bg-white/[0.015] py-20 text-center">
            <FolderTree className="mx-auto mb-4 h-9 w-9 text-dim" />
            <h4 className="text-sm font-black uppercase tracking-widest text-white">
              Comece pela categoria principal
            </h4>
            <p className="mx-auto mt-2 max-w-md text-[11px] leading-relaxed text-dim">
              Ela será a primeira opção vista pelo cliente. Depois, você poderá criar subcategorias
              dentro dela.
            </p>
            <button
              onClick={() => onAdd()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Criar primeira categoria
            </button>
          </div>
        )}
      </motion.div>
    );
  },
);

export default AdminCategoriesPanel;

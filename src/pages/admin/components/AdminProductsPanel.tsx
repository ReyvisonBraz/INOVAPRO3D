import { memo, useState, useCallback } from "react";
import { Layers, Edit, Trash2, Plus, SlidersHorizontal, CheckSquare, Square, MoveRight, EyeOff, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../components/ui/Button";
import { cn } from "../../../lib/utils";
import type { Product } from "../../../types/domain";

export interface AdminProductsPanelProps {
  products: Product[];
  categories: string[];
  onDuplicate: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onUpdateStock: (id: string, currentStock: number, delta: number) => void;
  onAddProduct: () => void;
  onMoveToCategory: (productIds: string[], category: string) => void;
  onChangeCategory: (productId: string, newCategory: string) => void;
}

const AdminProductsPanel = memo(function AdminProductsPanel({
  products,
  categories,
  onDuplicate,
  onEdit,
  onDelete,
  onBatchDelete,
  onUpdateStock,
  onAddProduct,
  onMoveToCategory,
  onChangeCategory,
}: AdminProductsPanelProps) {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allCategories = ["ALL", ...categories];

  const filtered = filterCategory === "ALL"
    ? products
    : filterCategory === "_orphan"
      ? products.filter(p => !p.category || !categories.includes(p.category))
      : products.filter(p => p.category === filterCategory);

  const orphanCount = products.filter(p => !p.category || !categories.includes(p.category)).length;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  }, [selectedIds, filtered]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectMode(false);
  }, []);

  const handleBatchMove = useCallback((cat: string) => {
    onMoveToCategory([...selectedIds], cat);
    clearSelection();
  }, [selectedIds, onMoveToCategory, clearSelection]);

  const handleBatchDelete = useCallback(() => {
    onBatchDelete([...selectedIds]);
    clearSelection();
  }, [selectedIds, onBatchDelete, clearSelection]);

  return (
    <motion.div key="products" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02] p-4 sm:p-5 rounded-2xl border border-white/[0.06]">
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-widest italic">Controle de Catálogo</h3>
          <p className="text-[11px] text-dim uppercase font-bold tracking-widest">
            {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
            {filterCategory !== "ALL" && ` em ${filterCategory === "_orphan" ? "Sem categoria" : filterCategory}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectMode(!selectMode); if (selectMode) clearSelection(); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
              selectMode
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-white/[0.03] border-white/[0.06] text-dim hover:border-white/10 hover:text-white"
            )}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Selecionar
          </button>
          <Button onClick={onAddProduct} className="rounded-xl gap-1.5 h-8 px-3 whitespace-nowrap shrink-0 text-[10px]">
            <Plus className="w-3.5 h-3.5" /> Novo
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {selectMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <button onClick={toggleSelectAll} className="text-dim hover:text-white text-[10px] font-black uppercase">
                {selectedIds.size === filtered.length ? "Desmarcar todos" : "Marcar todos"}
              </button>
              <span className="text-[11px] font-black text-primary">
                {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Move to category dropdown */}
              <div className="relative group/move">
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-[10px] font-black uppercase tracking-widest text-dim hover:text-white transition-all">
                  <MoveRight className="w-3 h-3" /> Mover para
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-[#0A0A0F] border border-white/10 rounded-xl p-1.5 shadow-2xl opacity-0 invisible group-hover/move:opacity-100 group-hover/move:visible transition-all z-50 max-h-64 overflow-y-auto no-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => handleBatchMove(cat)}
                      className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold text-dim hover:text-white hover:bg-white/5 uppercase transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Excluir
              </button>
              <button onClick={clearSelection} className="px-2 py-1 text-[10px] font-black uppercase text-dim hover:text-white">
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <SlidersHorizontal className="w-3 h-3 text-dim shrink-0" />
        {allCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
              filterCategory === cat
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-white/[0.03] border-white/[0.06] text-dim hover:border-white/10 hover:text-white"
            )}
          >
            {cat === "ALL" ? "Todos" : cat}
          </button>
        ))}
        {orphanCount > 0 && (
          <button
            onClick={() => setFilterCategory("_orphan")}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5",
              filterCategory === "_orphan"
                ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                : "bg-white/[0.03] border-white/[0.06] text-dim hover:border-white/10 hover:text-white"
            )}
          >
            Sem categoria
            <span className="text-[9px] bg-amber-500/20 px-1.5 py-0.5 rounded-full">{orphanCount}</span>
          </button>
        )}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => {
          const isSelected = selectedIds.has(p.id);
          return (
            <div
              key={p.id}
              className={cn(
                "bg-surface-card rounded-2xl border transition-all flex flex-col group/card",
                isSelected
                  ? "border-primary/40 ring-1 ring-primary/20"
                  : "border-white/[0.06] hover:border-primary/20"
              )}
            >
              {/* Image */}
              <div className="relative aspect-square rounded-t-2xl overflow-hidden bg-black/40 border-b border-white/[0.06]">
                <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" />
                
                {/* Selection checkbox */}
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(p.id)}
                    className={cn(
                      "absolute top-3 left-3 p-1.5 rounded-lg transition-all z-10",
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-black/50 text-white/60 hover:bg-black/70 hover:text-white"
                    )}
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                )}

                {/* Quick actions (hover) */}
                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button onClick={() => onDuplicate(p)} className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-dim hover:text-blue-400 transition-colors" title="Duplicar">
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onEdit(p)} className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-dim hover:text-primary transition-colors" title="Editar">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(p.id)} className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-dim hover:text-red-400 transition-colors" title="Excluir">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Category badge with quick-change dropdown */}
                <div className="absolute bottom-3 left-3 group/cat">
                  <div className="flex items-center gap-1 px-3 py-1 bg-primary/90 text-white text-[10px] font-black uppercase rounded-full tracking-widest italic cursor-pointer">
                    {p.category || "Sem cat."}
                    <ChevronDown className="w-3 h-3 opacity-60 group-hover/cat:opacity-100" />
                  </div>
                  <div className="absolute bottom-full left-0 mb-1 w-44 bg-[#0A0A0F] border border-white/10 rounded-xl p-1.5 shadow-2xl opacity-0 invisible group-hover/cat:opacity-100 group-hover/cat:visible transition-all z-50 max-h-56 overflow-y-auto no-scrollbar">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={(e) => { e.stopPropagation(); onChangeCategory(p.id, cat); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-colors",
                          p.category === cat ? "text-primary bg-primary/10" : "text-dim hover:text-white hover:bg-white/5"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active badge */}
                {p.active === false && (
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-red-500/20 border border-red-500/30 text-[9px] font-black uppercase tracking-widest text-red-400">
                    <EyeOff className="w-3 h-3 inline mr-1" /> Inativo
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col flex-1">
                <h4 className="text-sm font-black uppercase mb-1 line-clamp-1 leading-snug">{p.name}</h4>
                <p className="text-[11px] text-dim mb-3 line-clamp-2 leading-relaxed">{p.description}</p>

                {/* Stock controls */}
                <div className="flex items-center justify-between p-2.5 bg-white/[0.03] rounded-xl border border-white/[0.04] mb-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-dim tracking-widest">Estoque</p>
                    <p className="text-xs font-black">{p.stock || 0} unid.</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onUpdateStock(p.id, p.stock || 0, -1)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-dim hover:text-white transition-colors text-xs">−</button>
                    <button onClick={() => onUpdateStock(p.id, p.stock || 0, 1)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-dim hover:text-white transition-colors text-xs">+</button>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto flex justify-between items-center">
                  <span className="text-base font-display font-black text-primary">R$ {p.basePrice?.toFixed(2)}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", p.active !== false ? "bg-green-500" : "bg-red-500")} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-dim">
                      {p.active !== false ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-3">
            <p className="text-sm font-black uppercase text-subtle tracking-widest">
              {filterCategory !== "ALL"
                ? filterCategory === "_orphan"
                  ? "Nenhum produto sem categoria"
                  : `Nenhum produto em "${filterCategory}"`
                : "Nenhum produto no catálogo"}
            </p>
            <p className="text-[11px] text-dim">
              {filterCategory === "_orphan"
                ? "Todos os produtos estão categorizados."
                : "Clique em Novo Produto para adicionar."}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default AdminProductsPanel;

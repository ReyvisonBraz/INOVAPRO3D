import { memo, useState } from "react";
import { Layers, Edit, Trash2, Plus, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/Button";
import type { Product } from "../../../types/domain";

export interface AdminProductsPanelProps {
  products: Product[];
  categories: string[];
  onDuplicate: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onUpdateStock: (id: string, currentStock: number, delta: number) => void;
  onAddProduct: () => void;
}

const AdminProductsPanel = memo(function AdminProductsPanel({
  products,
  categories,
  onDuplicate,
  onEdit,
  onDelete,
  onUpdateStock,
  onAddProduct,
}: AdminProductsPanelProps) {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const filtered = filterCategory === "ALL" ? products : products.filter(p => p.category === filterCategory);

  return (
    <motion.div key="products" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02] p-4 sm:p-6 rounded-[24px] border border-white/5">
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-widest italic">Controle de Catálogo</h3>
          <p className="text-[11px] text-dim uppercase font-bold tracking-widest">
            {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
            {filterCategory !== "ALL" && ` em ${filterCategory}`}
          </p>
        </div>
        <Button onClick={onAddProduct} className="rounded-2xl gap-2 h-9 px-4 whitespace-nowrap shrink-0 text-[10px]">
          <Plus className="w-4 h-4" /> Novo Produto
        </Button>
      </div>

      {/* Category filter chips */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <SlidersHorizontal className="w-3.5 h-3.5 text-dim shrink-0" />
          {(["ALL", ...categories] as string[]).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                filterCategory === cat
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-white/[0.03] border-white/[0.06] text-dim hover:border-white/10 hover:text-white"
              }`}
            >
              {cat === "ALL" ? "Todos" : cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(p => (
          <div key={p.id} className="bg-surface-card rounded-[40px] p-6 border border-white/5 group hover:border-primary/30 transition-all flex flex-col min-h-[44px]">
            <div className="relative aspect-square rounded-[32px] overflow-hidden mb-4 bg-black/40 border border-white/5">
              <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onDuplicate(p)} className="p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 hover:text-blue-400 transition-colors" title="Duplicar"><Layers className="w-4 h-4" /></button>
                <button onClick={() => onEdit(p)} className="p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                <button onClick={() => onDelete(p.id)} className="p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="absolute bottom-4 left-4">
                <span className="px-3 py-1 bg-primary text-white text-[11px] font-black uppercase rounded-full tracking-widest italic">{p.category}</span>
              </div>
            </div>
            <h4 className="text-sm font-black uppercase mb-1 line-clamp-2 leading-snug">{p.name}</h4>
            <p className="text-[11px] text-dim mb-4 line-clamp-2">{p.description}</p>
            
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 mb-4">
              <div>
                <p className="text-[11px] font-black uppercase text-secondary tracking-widest">Estoque</p>
                <p className="text-xs font-black">{p.stock || 0} unid.</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onUpdateStock(p.id, p.stock || 0, -1)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">-</button>
                <button onClick={() => onUpdateStock(p.id, p.stock || 0, 1)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">+</button>
              </div>
            </div>

            <div className="mt-auto flex justify-between items-center">
              <span className="text-lg font-display font-black text-primary">R$ {p.basePrice?.toFixed(2)}</span>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-[11px] font-black uppercase tracking-widest text-dim">{p.active ? 'Ativo' : 'Inativo'}</span>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <p className="text-sm font-black uppercase text-subtle tracking-widest">
              {filterCategory !== "ALL" ? `Nenhum produto em "${filterCategory}"` : "Nenhum produto no catálogo"}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default AdminProductsPanel;

import { memo, type FC } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Edit, Eye, EyeOff, ArrowUp, ArrowDown, Image, Upload } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { Category } from "../../../types/domain";

interface AdminCategoriesPanelProps {
  categories: Category[];
  productsCount: Record<string, number>;
  onAdd: () => void;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  onSetCover: (cat: Category) => void;
}

const AdminCategoriesPanel: FC<AdminCategoriesPanelProps> = memo(({
  categories,
  productsCount,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
  onReorder,
  onSetCover,
}) => {
  const sorted = [...categories].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  return (
    <motion.div
      key="categories"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02] p-4 sm:p-6 rounded-[24px] border border-white/5">
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-widest italic">Pastas / Categorias</h3>
          <p className="text-[11px] text-dim uppercase font-bold tracking-widest">
            {categories.length} pasta{categories.length !== 1 ? "s" : ""} no catálogo
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Nova Pasta
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map((cat) => {
          const count = productsCount[cat.name] || 0;
          return (
            <div
              key={cat.id}
              className={cn(
                "bg-surface-card rounded-[28px] border border-white/5 overflow-hidden group transition-all hover:border-white/10",
                !cat.active && "opacity-50"
              )}
            >
              {/* Cover image */}
              <div
                className="relative aspect-[21/9] bg-white/[0.03] overflow-hidden cursor-pointer"
                onClick={() => onSetCover(cat)}
              >
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-dim gap-2">
                    <Image className="w-8 h-8 opacity-30" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Sem capa</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-all text-[10px] font-black uppercase tracking-widest text-white bg-black/50 px-3 py-1.5 rounded-xl">
                    <Upload className="w-3 h-3 inline mr-1" /> Alterar Capa
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-black uppercase truncate">{cat.name}</h4>
                    <p className="text-[11px] text-dim mt-0.5">
                      {count} produto{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => onToggleActive(cat.id, !!cat.active)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all shrink-0",
                      cat.active !== false
                        ? "text-green-400 hover:bg-green-500/10"
                        : "text-red-400 hover:bg-red-500/10"
                    )}
                    title={cat.active !== false ? "Visível no catálogo" : "Oculta"}
                  >
                    {cat.active !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pt-2 border-t border-white/5">
                  <button
                    onClick={() => onReorder(cat.id, "up")}
                    className="p-2 rounded-lg text-dim hover:text-white hover:bg-white/5 transition-all"
                    title="Mover para cima"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onReorder(cat.id, "down")}
                    className="p-2 rounded-lg text-dim hover:text-white hover:bg-white/5 transition-all"
                    title="Mover para baixo"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => onEdit(cat)}
                    className="p-2 rounded-lg text-dim hover:text-white hover:bg-white/5 transition-all"
                    title="Editar pasta"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(cat.id)}
                    className="p-2 rounded-lg text-dim hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Excluir pasta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {categories.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <p className="text-sm font-black uppercase text-subtle tracking-widest">Nenhuma pasta criada</p>
            <p className="text-[11px] text-dim mt-2">Crie pastas para organizar seu catálogo</p>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default AdminCategoriesPanel;

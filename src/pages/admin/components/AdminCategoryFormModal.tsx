import { Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import type { Category } from "../../../types/domain";
import type { CategoryDraft } from "../hooks/useCategoryAdmin";

interface AdminCategoryFormModalProps {
  isEditing: boolean;
  category: CategoryDraft;
  setCategory: Dispatch<SetStateAction<CategoryDraft>>;
  /** Categorias existentes, para escolher a categoria-mae. */
  categories: Category[];
  /** Categoria em edicao, excluida da lista de possiveis maes. */
  editingCategoryId: string | null;
  isUploadingImage: boolean;
  onUploadImage: (file: File | null) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}

export function AdminCategoryFormModal({
  isEditing,
  category,
  setCategory,
  categories,
  editingCategoryId,
  isUploadingImage,
  onUploadImage,
  onSubmit,
  onClose,
}: AdminCategoryFormModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-surface border border-white/10 rounded-[48px] p-10 max-w-md w-full relative my-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-dim hover:text-white transition-all"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-3xl font-black italic tracking-tighter mb-8 leading-none">
          {isEditing
            ? "Editar Categoria"
            : category.parentId
              ? "Nova Subcategoria"
              : "Nova Categoria"}
          <br />
          <span className="text-primary text-sm uppercase tracking-widest mt-2 block">
            {isEditing
              ? "Nome, hierarquia e apresentação"
              : category.parentId
                ? "Dentro da categoria selecionada"
                : "Categoria principal do catálogo"}
          </span>
        </h2>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-dim">Nome da Categoria</label>
            <input
              required
              value={category.name}
              onChange={(e) => setCategory((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: DECORAÇÃO"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold uppercase outline-none focus:border-primary/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-dim">Descrição curta</label>
            <textarea
              rows={2}
              value={category.description}
              onChange={(e) => setCategory((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ajude a identificar o tipo de produto desta categoria"
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold outline-none transition-all focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-dim">Local da categoria</label>
            <select
              value={category.parentId}
              onChange={(e) => setCategory((prev) => ({ ...prev, parentId: e.target.value }))}
              className="w-full bg-[#050508] border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all font-display"
            >
              <option value="">Nenhuma — categoria principal</option>
              {categories
                .filter((c) => !c.parentId && c.id !== editingCategoryId && c.active !== false)
                .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    Dentro de {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-dim">
              Imagem de Capa (URL ou upload)
            </label>
            {category.image && (
              <div className="relative rounded-2xl overflow-hidden aspect-[21/9] mb-2">
                <img src={category.image} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCategory((prev) => ({ ...prev, image: "" }))}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <input
              type="url"
              value={category.image}
              onChange={(e) => setCategory((prev) => ({ ...prev, image: e.target.value }))}
              placeholder="https://..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all font-mono text-xs"
            />
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-[10px] font-black uppercase tracking-widest text-dim">
                  Upload de imagem
                </span>
                <span className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                  {isUploadingImage ? "Enviando..." : "Escolher arquivo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingImage}
                  onChange={(e) => {
                    onUploadImage(e.target.files?.[0] || null);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
          <button
            type="submit"
            className="w-full h-16 rounded-[24px] bg-primary hover:bg-primary-dark text-white text-xs font-black uppercase tracking-[0.2em] italic shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
          >
            {isEditing
              ? "Salvar Alterações"
              : category.parentId
                ? "Criar Subcategoria"
                : "Criar Categoria"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

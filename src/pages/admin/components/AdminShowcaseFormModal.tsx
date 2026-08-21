import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/Button";
import type { ShowcaseDraft } from "../../../services/showcase";

interface AdminShowcaseFormModalProps {
  isEditing: boolean;
  showcase: ShowcaseDraft;
  setShowcase: Dispatch<SetStateAction<ShowcaseDraft>>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
}

export function AdminShowcaseFormModal({
  isEditing,
  showcase,
  setShowcase,
  onSubmit,
  onClose,
}: AdminShowcaseFormModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="bg-surface border border-white/10 rounded-[48px] p-12 max-w-lg w-full relative my-auto"
      >
        <button onClick={onClose} className="absolute top-8 right-8 text-dim hover:text-white">
          <Plus className="w-8 h-8 rotate-45" />
        </button>
        <h2 className="text-3xl font-black italic tracking-tighter mb-8">
          {isEditing ? "Edição Vitrine" : "Novo Destaque"}
        </h2>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-dim">Título do Banner</label>
            <input
              required
              value={showcase.title}
              onChange={(event) => setShowcase({ ...showcase, title: event.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-dim">Subtítulo / Tagline</label>
            <input
              value={showcase.subtitle}
              onChange={(event) => setShowcase({ ...showcase, subtitle: event.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-dim">Wallpaper URL</label>
            <input
              required
              value={showcase.image}
              onChange={(event) => setShowcase({ ...showcase, image: event.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-16 rounded-[24px] uppercase font-black text-xs italic"
          >
            Publicar Ativo
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

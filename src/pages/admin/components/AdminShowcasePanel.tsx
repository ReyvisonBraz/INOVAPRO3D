import { memo, type FC } from "react";
import { motion } from "framer-motion";
import { Eye, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { cn } from "../../../lib/utils";
import type { ShowcaseItem } from "../../../types/domain";

interface AdminShowcasePanelProps {
  showcase: ShowcaseItem[];
  onDeleteShowcase: (id: string) => void;
  onAddShowcase: () => void;
  onEditShowcase: (item: ShowcaseItem) => void;
}

const AdminShowcasePanel: FC<AdminShowcasePanelProps> = memo(({
  showcase,
  onDeleteShowcase,
  onAddShowcase,
  onEditShowcase,
}) => {
  return (
    <motion.div key="showcase" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="flex justify-between items-center gap-3 bg-white/5 p-8 rounded-[40px] border border-white/5">
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2 text-primary">
            <Eye className="w-4 h-4" /> Gestão de Vitrine
          </h3>
          <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] mt-1">Banners e Destaques da Landing Page</p>
        </div>
        <Button onClick={onAddShowcase} className="rounded-2xl gap-2 h-9 px-4 bg-white text-black hover:bg-white/90 whitespace-nowrap shrink-0 text-[10px]">
          <Plus className="w-4 h-4" /> Novo Destaque
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {showcase.map(s => (
          <div key={s.id} className="group relative aspect-[21/9] rounded-[48px] overflow-hidden border border-white/5 bg-black">
            <img src={s.image} alt={s.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-all duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 p-12 flex flex-col justify-end bg-gradient-to-t from-black via-black/40 to-transparent">
              <div className="flex items-center gap-2 mb-3">
                <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded", s.active ? "bg-green-500 text-white" : "bg-red-500 text-white")}>
                  {s.active ? "ATIVO" : "INATIVO"}
                </span>
              </div>
              <h4 className="text-3xl font-display font-black italic mb-1 tracking-tighter">{s.title}</h4>
              <p className="text-xs text-white/40 uppercase tracking-[0.3em] font-medium">{s.subtitle}</p>

              <div className="mt-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                <button onClick={() => onEditShowcase(s)} className="flex-1 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-primary hover:border-primary transition-all text-[10px] font-black uppercase italic tracking-widest">Editar Config</button>
                <button onClick={() => onDeleteShowcase(s.id)} className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        ))}
        {showcase.length === 0 && (
          <div className="md:col-span-2 py-20 text-center text-white/10 italic">Nenhum destaque configurado.</div>
        )}
      </div>
    </motion.div>
  );
});

export default AdminShowcasePanel;

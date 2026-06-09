import { memo, type FC } from "react";
import { motion } from "framer-motion";
import { Trash2, Plus } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { cn } from "../../../lib/utils";
import type { Material } from "../../../types/domain";

interface AdminMaterialsPanelProps {
  materials: Material[];
  onDeleteMaterial: (id: string) => void;
  onAddMaterial: () => void;
  onToggleStock: (id: string, current: boolean) => void;
}

const AdminMaterialsPanel: FC<AdminMaterialsPanelProps> = memo(({
  materials,
  onDeleteMaterial,
  onAddMaterial,
  onToggleStock,
}) => {
  return (
    <motion.div key="materials" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex justify-between items-center gap-3 bg-white/[0.02] p-6 rounded-[24px] border border-white/5">
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-widest italic">Estoque</h3>
          <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Matéria Prima para Impressão</p>
        </div>
        <Button onClick={onAddMaterial} className="rounded-2xl gap-2 h-9 px-4 whitespace-nowrap shrink-0 text-[10px]">
          <Plus className="w-4 h-4" /> Novo Filamento
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map(m => (
          <div key={m.id} className="glass rounded-[48px] p-8 border border-white/5 flex flex-col items-center text-center group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onDeleteMaterial(m.id)} className="text-white/20 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="w-16 h-16 rounded-full mb-6 border-4 border-white/5 shadow-2xl transition-transform group-hover:scale-110" style={{ backgroundColor: m.color }} />
            <h4 className="text-sm font-black uppercase tracking-tight mb-2">{m.name}</h4>
            <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-6">{m.type || 'PLA Premium'}</p>

            <div className="w-full flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Em Estoque</span>
              <button
                onClick={() => onToggleStock(m.id, !!m.inStock)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  m.inStock ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                )}
              >
                {m.inStock ? 'Disponível' : 'Esgotado'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
});

export default AdminMaterialsPanel;

import { memo, type FC, type Dispatch, type SetStateAction, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { FAQ } from "../../../types/domain";

interface AdminFAQPanelProps {
  faqs: FAQ[];
  onDeleteFAQ: (id: string) => void;
  onAddFAQ: () => void;
  isAddingFAQ: boolean;
  newFAQ: { question: string; answer: string };
  setNewFAQ: Dispatch<SetStateAction<{ question: string; answer: string }>>;
  onFAQSubmit: (e: FormEvent) => void;
  setIsAddingFAQ: Dispatch<SetStateAction<boolean>>;
}

const AdminFAQPanel: FC<AdminFAQPanelProps> = memo(({
  faqs,
  onDeleteFAQ,
  onAddFAQ,
  isAddingFAQ,
  newFAQ,
  setNewFAQ,
  onFAQSubmit,
  setIsAddingFAQ,
}) => {
  return (
    <>
      <motion.div key="faqs" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
        <div className="flex justify-between items-center gap-3 bg-white/[0.02] p-6 rounded-[24px] border border-white/5">
          <div className="min-w-0">
            <h3 className="text-sm font-black uppercase tracking-widest italic">Central de Dúvidas</h3>
            <p className="text-[10px] text-dim uppercase font-bold tracking-widest">Base de Conhecimento do Cliente</p>
          </div>
          <Button onClick={onAddFAQ} className="rounded-2xl gap-2 h-9 px-4 whitespace-nowrap shrink-0 text-[10px]">
            <Plus className="w-4 h-4" /> Nova Resposta
          </Button>
        </div>
        <div className="space-y-4">
          {faqs.map(f => (
            <div key={f.id} className="bg-surface-card rounded-[32px] p-8 border border-white/5 group hover:border-white/10 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <h4 className="text-sm font-bold uppercase text-white/80 italic">{f.question}</h4>
                </div>
                <button onClick={() => onDeleteFAQ(f.id)} className="p-2 text-subtle hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-white/40 leading-relaxed font-medium">{f.answer}</p>
            </div>
          ))}
          {faqs.length === 0 && (
            <div className="py-20 text-center glass border-dashed border-white/5 rounded-[48px] text-subtle italic">Nenhum FAQ catalogado até o momento.</div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isAddingFAQ && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-surface border border-white/10 rounded-[48px] p-10 max-w-lg w-full relative my-auto">
              <button onClick={() => setIsAddingFAQ(false)} className="absolute top-8 right-8 text-dim hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
              <h2 className="text-3xl font-black italic tracking-tighter mb-8 leading-none">Novo FAQ<br/><span className="text-primary text-sm uppercase tracking-widest mt-2 block">Central de Ajuda</span></h2>

              <form onSubmit={onFAQSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-dim italic">Pergunta (Short Handle)</label>
                  <input
                    required
                    value={newFAQ.question}
                    onChange={(e) => setNewFAQ({...newFAQ, question: e.target.value})}
                    placeholder="Ex: Como rastrear meu pedido?"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-dim italic">Resposta Detalhada</label>
                  <textarea
                    required
                    rows={5}
                    value={newFAQ.answer}
                    onChange={(e) => setNewFAQ({...newFAQ, answer: e.target.value})}
                    placeholder="Descreva a solução completa aqui..."
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-xs font-medium leading-relaxed outline-none focus:border-primary/50 resize-none"
                  />
                </div>
                <Button type="submit" className="w-full h-16 rounded-[24px] uppercase font-black text-xs italic tracking-widest bg-primary hover:bg-primary-hover shadow-xl shadow-primary/20">Publicar Conhecimento</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
});

export default AdminFAQPanel;

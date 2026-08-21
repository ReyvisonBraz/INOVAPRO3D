import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/Button";
import { NumInput } from "../../../lib/adminHelpers";
import type { MaterialDraft } from "../../../services/inventory";

interface AdminMaterialFormModalProps {
  material: MaterialDraft;
  setMaterial: Dispatch<SetStateAction<MaterialDraft>>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
}

export function AdminMaterialFormModal({
  material,
  setMaterial,
  onSubmit,
  onClose,
}: AdminMaterialFormModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-surface border border-white/10 rounded-[48px] p-12 max-w-md w-full relative"
      >
        <button onClick={onClose} className="absolute top-8 right-8 text-dim hover:text-white">
          <Plus className="w-8 h-8 rotate-45" />
        </button>
        <h2 className="text-3xl font-black italic tracking-tighter mb-8">Novo Material</h2>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-dim">Identificação</label>
            <input
              required
              value={material.name}
              onChange={(event) => setMaterial({ ...material, name: event.target.value })}
              placeholder="Ex: PLA Silk Gold"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-dim">Tipo</label>
              <input
                value={material.type}
                onChange={(event) => setMaterial({ ...material, type: event.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-dim">Custo p/ Kg</label>
              <NumInput
                min={0}
                step={0.01}
                value={material.pricePerKg}
                onChange={(value) => setMaterial({ ...material, pricePerKg: value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-dim">Cor do Display</label>
            <input
              type="color"
              value={material.color}
              onChange={(event) => setMaterial({ ...material, color: event.target.value })}
              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-dim">Saldo inicial (g)</label>
              <NumInput
                min={0}
                value={material.stockGrams}
                onChange={(value) => setMaterial({ ...material, stockGrams: value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-dim">
                Estoque minimo (g)
              </label>
              <NumInput
                min={0}
                value={material.minimumStockGrams}
                onChange={(value) => setMaterial({ ...material, minimumStockGrams: value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              value={material.brand}
              onChange={(event) => setMaterial({ ...material, brand: event.target.value })}
              placeholder="Marca"
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
            />
            <input
              value={material.supplier}
              onChange={(event) => setMaterial({ ...material, supplier: event.target.value })}
              placeholder="Fornecedor"
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
            />
            <input
              value={material.batch}
              onChange={(event) => setMaterial({ ...material, batch: event.target.value })}
              placeholder="Lote"
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
            />
            <input
              value={material.location}
              onChange={(event) => setMaterial({ ...material, location: event.target.value })}
              placeholder="Localizacao"
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
            />
          </div>
          <textarea
            value={material.notes}
            onChange={(event) => setMaterial({ ...material, notes: event.target.value })}
            placeholder="Observacoes do filamento"
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
          />
          <Button
            type="submit"
            className="w-full h-16 rounded-[24px] uppercase font-black text-xs italic tracking-widest"
          >
            Registrar Material
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

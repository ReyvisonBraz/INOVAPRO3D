import { memo, type FC } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowDownUp, PackageOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { cn } from "../../../lib/utils";
import { AdminEmptyState, AdminMetric, AdminSectionHeader } from "./AdminPrimitives";
import type { Material } from "../../../types/domain";

interface AdminMaterialsPanelProps {
  materials: Material[];
  onDeleteMaterial: (id: string) => void;
  onAddMaterial: () => void;
  onToggleStock: (id: string, current: boolean) => void;
  onAdjustStock: (material: Material) => void;
}

const AdminMaterialsPanel: FC<AdminMaterialsPanelProps> = memo(function AdminMaterialsPanel({ materials, onDeleteMaterial, onAddMaterial, onToggleStock, onAdjustStock }) {
  const stock = materials.reduce((sum, item) => sum + Number(item.stockGrams ?? 0), 0);
  const reserved = materials.reduce((sum, item) => sum + Number(item.reservedGrams ?? 0), 0);
  const lowStock = materials.filter((item) => (item.stockGrams ?? 0) - (item.reservedGrams ?? 0) <= (item.minimumStockGrams ?? 0)).length;

  return (
    <motion.div key="materials" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <AdminSectionHeader eyebrow="Producao" title="Filamentos e materiais" description="Acompanhe saldo fisico, reservas e disponibilidade real para novos pedidos." actions={
        <Button onClick={onAddMaterial} className="h-9 rounded-lg px-3 text-[11px] font-semibold shadow-none"><Plus className="h-3.5 w-3.5" /> Novo filamento</Button>
      } />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminMetric label="Cadastrados" value={materials.length} hint="SKUs de material" />
        <AdminMetric label="Estoque fisico" value={`${stock.toLocaleString("pt-BR")}g`} />
        <AdminMetric label="Reservado" value={`${reserved.toLocaleString("pt-BR")}g`} tone={reserved ? "warning" : "default"} />
        <AdminMetric label="Estoque baixo" value={lowStock} hint="Precisam de atencao" tone={lowStock ? "danger" : "success"} />
      </div>

      {materials.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {materials.map((material) => {
            const physical = Number(material.stockGrams ?? 0);
            const held = Number(material.reservedGrams ?? 0);
            const available = Math.max(0, physical - held);
            const minimum = Number(material.minimumStockGrams ?? 0);
            const isLow = available <= minimum;
            const coverage = physical > 0 ? Math.min(100, (available / physical) * 100) : 0;
            return (
              <article key={material.id} className="admin-panel group overflow-hidden">
                <div className="flex items-start gap-3 border-b border-white/[0.06] p-4">
                  <div className="h-10 w-10 shrink-0 rounded-xl border border-white/10 shadow-inner" style={{ backgroundColor: material.color || "#64748b" }} />
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold text-white">{material.name}</h3>{isLow && <span title="Estoque baixo"><AlertTriangle className="h-3.5 w-3.5 text-amber-300" /></span>}</div><p className="mt-1 truncate text-[11px] text-white/38">{[material.type, material.brand, material.location].filter(Boolean).join(" · ") || "Sem detalhes adicionais"}</p></div>
                  <button onClick={() => onDeleteMaterial(material.id)} className="grid h-8 w-8 place-items-center rounded-lg text-white/30 transition hover:bg-red-500/10 hover:text-red-300" aria-label={`Excluir ${material.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-3 gap-2"><StockValue label="Fisico" value={physical} /><StockValue label="Reservado" value={held} tone="warning" /><StockValue label="Disponivel" value={available} tone={isLow ? "danger" : "success"} /></div>
                  <div><div className="mb-1.5 flex justify-between text-[10px] text-white/38"><span>Disponibilidade</span><span>{Math.round(coverage)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className={cn("h-full rounded-full", isLow ? "bg-amber-400" : "bg-emerald-400")} style={{ width: `${coverage}%` }} /></div></div>
                  <div className="flex gap-2">
                    <button onClick={() => onAdjustStock(material)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] text-[11px] font-semibold text-white/65 transition hover:bg-white/[0.06] hover:text-white"><ArrowDownUp className="h-3.5 w-3.5" /> Movimentar</button>
                    <button onClick={() => onToggleStock(material.id, !!material.inStock)} className={cn("h-9 rounded-lg border px-3 text-[11px] font-semibold transition", material.inStock ? "border-emerald-400/20 bg-emerald-400/8 text-emerald-300 hover:bg-emerald-400/12" : "border-white/10 bg-white/[0.025] text-white/45 hover:text-white")}>{material.inStock ? "Ativo" : "Inativo"}</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : <div className="admin-panel"><AdminEmptyState icon={PackageOpen} title="Nenhum filamento cadastrado" description="Cadastre o primeiro material para controlar reservas e consumo na producao." action={<Button onClick={onAddMaterial} className="h-9 rounded-lg px-3 text-[11px]">Cadastrar filamento</Button>} /></div>}
    </motion.div>
  );
});

function StockValue({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" | "success" | "danger" }) {
  return <div className="rounded-lg bg-white/[0.025] p-2.5"><span className="block text-[9px] text-white/38">{label}</span><strong className={cn("mt-1 block text-xs font-semibold tabular-nums", tone === "warning" && "text-amber-300", tone === "success" && "text-emerald-300", tone === "danger" && "text-red-300", tone === "default" && "text-white")}>{value.toLocaleString("pt-BR")}g</strong></div>;
}

export default AdminMaterialsPanel;

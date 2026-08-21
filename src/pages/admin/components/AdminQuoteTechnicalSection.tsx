import { Box } from "lucide-react";
import { NumInput } from "../../../lib/adminHelpers";

interface AdminQuoteTechnicalSectionProps {
  material: string;
  quantity: number;
  unitPrice: number;
  printTime: string;
  weight: number;
  infill: number;
  onChangeMaterial: (material: string) => void;
  onChangeQuantity: (quantity: number) => void;
  onChangeUnitPrice: (unitPrice: number) => void;
  onChangePrintTime: (printTime: string) => void;
  onChangeWeight: (weight: number) => void;
  onChangeInfill: (infill: number) => void;
}

export function AdminQuoteTechnicalSection({
  material,
  quantity,
  unitPrice,
  printTime,
  weight,
  infill,
  onChangeMaterial,
  onChangeQuantity,
  onChangeUnitPrice,
  onChangePrintTime,
  onChangeWeight,
  onChangeInfill,
}: AdminQuoteTechnicalSectionProps) {
  return (
    <section className="quote-editor-technical rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
      <h3 className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-widest text-primary mb-6">
        <Box className="w-4 h-4" /> Especificações Técnicas
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-semibold text-white/55 mb-1.5">Material</label>
          <input
            type="text"
            value={material}
            onChange={(e) => onChangeMaterial(e.target.value)}
            placeholder="Ex: PLA Pro"
            className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/55 mb-1.5">
            Quantidade de Peças
          </label>
          <NumInput
            min={1}
            step={1}
            value={quantity}
            onChange={onChangeQuantity}
            className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm font-bold text-white outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/55 mb-1.5">
            Preço Unitário (R$)
          </label>
          <NumInput
            min={0}
            step={0.01}
            value={unitPrice}
            onChange={onChangeUnitPrice}
            className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm font-bold text-white outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/55 mb-1.5">
            Tempo de Impressão
          </label>
          <input
            type="text"
            value={printTime}
            onChange={(e) => onChangePrintTime(e.target.value)}
            placeholder="Ex: 2h 30m"
            className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/55 mb-1.5">
            Peso Estimado (g)
          </label>
          <NumInput
            min={0}
            value={weight}
            onChange={onChangeWeight}
            className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm font-bold text-white outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-mono"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-white/55">
              Densidade do Preenchimento (Infill)
            </label>
            <div className="flex items-center gap-1.5">
              <NumInput
                min={0}
                max={100}
                step={1}
                value={infill}
                onChange={onChangeInfill}
                className="h-9 w-20 rounded-lg border border-white/10 bg-[#0C0E14] px-2 text-right font-mono text-sm font-black text-primary outline-none focus:border-primary/60"
              />
              <span className="text-sm font-black text-primary">%</span>
            </div>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={infill}
            onChange={(e) => onChangeInfill(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
          />
        </div>
      </div>
    </section>
  );
}

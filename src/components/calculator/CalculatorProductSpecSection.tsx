import { Ruler } from "lucide-react";
import type { QuoteProductSpec } from "../../types/domain";
import { CollapsibleSection } from "./primitives";

interface CalculatorProductSpecSectionProps {
  spec: QuoteProductSpec;
  /** Material e cores lidos das bandejas — entram como placeholder. */
  derived: { material: string; colors: string };
  open: boolean;
  showOnQuote: boolean;
  customerNotes: string;
  highlightNotes: boolean;
  onToggle: () => void;
  onSpecChange: (spec: QuoteProductSpec) => void;
  onShowOnQuoteChange: (value: boolean) => void;
  onCustomerNotesChange: (value: string) => void;
  onHighlightNotesChange: (value: boolean) => void;
}

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-xs font-bold text-white/80 placeholder:font-medium placeholder:text-white/25 outline-none transition focus:border-blue-400/50";

const LABEL_CLASS = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/40";

const CHECKBOX_CLASS =
  "h-4 w-4 rounded border-white/20 bg-black/30 text-blue-500 focus:ring-blue-400";

/** Campo de medida: vazio limpa o eixo, para a ficha não mostrar "0". */
const parseMeasure = (value: string): number | undefined => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export function CalculatorProductSpecSection({
  spec,
  derived,
  open,
  showOnQuote,
  customerNotes,
  highlightNotes,
  onToggle,
  onSpecChange,
  onShowOnQuoteChange,
  onCustomerNotesChange,
  onHighlightNotesChange,
}: CalculatorProductSpecSectionProps) {
  const patch = (changes: Partial<QuoteProductSpec>) => onSpecChange({ ...spec, ...changes });
  const filledCount = [
    spec.width,
    spec.height,
    spec.depth,
    spec.material,
    spec.colors,
    spec.finish,
  ].filter(Boolean).length;

  return (
    <CollapsibleSection
      icon={Ruler}
      title="Ficha do produto e observação"
      summary={filledCount > 0 || customerNotes.trim() ? "Preenchida" : "Opcional"}
      open={open}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        <div>
          <span className={LABEL_CLASS}>Medidas do produto</span>
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={spec.width ?? ""}
              onChange={(event) => patch({ width: parseMeasure(event.target.value) })}
              placeholder="Largura"
              aria-label="Largura"
              className={FIELD_CLASS}
            />
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={spec.height ?? ""}
              onChange={(event) => patch({ height: parseMeasure(event.target.value) })}
              placeholder="Altura"
              aria-label="Altura"
              className={FIELD_CLASS}
            />
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={spec.depth ?? ""}
              onChange={(event) => patch({ depth: parseMeasure(event.target.value) })}
              placeholder="Profund."
              aria-label="Profundidade"
              className={FIELD_CLASS}
            />
            <select
              value={spec.unit ?? "cm"}
              onChange={(event) => patch({ unit: event.target.value === "mm" ? "mm" : "cm" })}
              aria-label="Unidade das medidas"
              className={`${FIELD_CLASS} w-[68px] px-2`}
            >
              <option value="cm">cm</option>
              <option value="mm">mm</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="spec-material">
              Material
            </label>
            <input
              id="spec-material"
              type="text"
              value={spec.material ?? ""}
              onChange={(event) => patch({ material: event.target.value })}
              placeholder={derived.material || "PLA"}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="spec-colors">
              Cores
            </label>
            <input
              id="spec-colors"
              type="text"
              value={spec.colors ?? ""}
              onChange={(event) => patch({ colors: event.target.value })}
              placeholder={derived.colors || "Conforme filamentos"}
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="spec-finish">
            Acabamento
          </label>
          <input
            id="spec-finish"
            type="text"
            value={spec.finish ?? ""}
            onChange={(event) => patch({ finish: event.target.value })}
            placeholder="Ex.: lixado e pintado, verniz fosco"
            className={FIELD_CLASS}
          />
        </div>

        <p className="text-[10px] leading-relaxed text-white/30">
          Material e cores em branco usam automaticamente o que está nas bandejas.
        </p>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-white/65">
          <input
            type="checkbox"
            checked={showOnQuote}
            onChange={(event) => onShowOnQuoteChange(event.target.checked)}
            className={CHECKBOX_CLASS}
          />
          Exibir a ficha do produto na proposta
        </label>

        <div>
          <label className={LABEL_CLASS} htmlFor="spec-notes">
            Observação para o cliente
          </label>
          <textarea
            id="spec-notes"
            rows={3}
            value={customerNotes}
            onChange={(event) => onCustomerNotesChange(event.target.value)}
            placeholder="Ex.: quadro em 3 peças encaixadas, suporte para parede incluso."
            className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs font-medium text-white/80 placeholder:text-white/25 outline-none transition focus:border-blue-400/50"
          />
        </div>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-white/65">
          <input
            type="checkbox"
            checked={highlightNotes}
            onChange={(event) => onHighlightNotesChange(event.target.checked)}
            className={CHECKBOX_CLASS}
          />
          Destacar a observação no PDF
        </label>
      </div>
    </CollapsibleSection>
  );
}

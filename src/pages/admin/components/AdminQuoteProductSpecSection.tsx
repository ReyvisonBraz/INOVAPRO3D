import { Ruler } from "lucide-react";
import type { QuoteProductSpec } from "../../../types/domain";

interface AdminQuoteProductSpecSectionProps {
  spec: QuoteProductSpec;
  /** Material e cores lidos das bandejas — entram como placeholder. */
  derived: { material: string; colors: string };
  showOnQuote: boolean;
  highlightNotes: boolean;
  onSpecChange: (spec: QuoteProductSpec) => void;
  onShowOnQuoteChange: (value: boolean) => void;
  onHighlightNotesChange: (value: boolean) => void;
}

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm text-white/85 placeholder:text-white/25 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20";

const LABEL_CLASS = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/40";

const TOGGLE_CLASS =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-white/70";

/** Campo de medida: vazio limpa o eixo, para a ficha não mostrar "0". */
const parseMeasure = (value: string): number | undefined => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export function AdminQuoteProductSpecSection({
  spec,
  derived,
  showOnQuote,
  highlightNotes,
  onSpecChange,
  onShowOnQuoteChange,
  onHighlightNotesChange,
}: AdminQuoteProductSpecSectionProps) {
  const patch = (changes: Partial<QuoteProductSpec>) => onSpecChange({ ...spec, ...changes });

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
      <h3 className="mb-6 flex items-center gap-2.5 text-sm font-bold uppercase tracking-widest text-primary">
        <Ruler className="h-4 w-4" /> Ficha do Produto
      </h3>

      <div className="space-y-4">
        <div>
          <span className={LABEL_CLASS}>Medidas</span>
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
              className={`${FIELD_CLASS} w-[80px] px-3`}
            >
              <option value="cm">cm</option>
              <option value="mm">mm</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="admin-spec-material">
              Material
            </label>
            <input
              id="admin-spec-material"
              type="text"
              value={spec.material ?? ""}
              onChange={(event) => patch({ material: event.target.value })}
              placeholder={derived.material || "PLA"}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="admin-spec-colors">
              Cores
            </label>
            <input
              id="admin-spec-colors"
              type="text"
              value={spec.colors ?? ""}
              onChange={(event) => patch({ colors: event.target.value })}
              placeholder={derived.colors || "Conforme filamentos"}
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="admin-spec-finish">
            Acabamento
          </label>
          <input
            id="admin-spec-finish"
            type="text"
            value={spec.finish ?? ""}
            onChange={(event) => patch({ finish: event.target.value })}
            placeholder="Ex.: lixado e pintado, verniz fosco"
            className={FIELD_CLASS}
          />
        </div>

        <p className="text-xs leading-relaxed text-white/30">
          Material e cores em branco usam automaticamente o que está nas bandejas do cálculo.
        </p>

        <label className={TOGGLE_CLASS}>
          <input
            type="checkbox"
            checked={showOnQuote}
            onChange={(event) => onShowOnQuoteChange(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary"
          />
          Exibir a ficha do produto na proposta
        </label>

        <label className={TOGGLE_CLASS}>
          <input
            type="checkbox"
            checked={highlightNotes}
            onChange={(event) => onHighlightNotesChange(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary"
          />
          Destacar a observação do cliente no PDF
        </label>
      </div>
    </section>
  );
}

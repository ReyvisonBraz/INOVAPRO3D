import { memo, useRef, useState, type FocusEvent } from "react";
import { isValidNumberDraft, parseNumberDraft } from "../../lib/numberInput";

// ============================================================================
// CAMPO NUMÉRICO COMPARTILHADO
// ----------------------------------------------------------------------------
// Um input numérico precisa guardar o texto digitado ("1." ainda não é um
// número), mas também aceitar um valor novo vindo de fora (carregar um
// orçamento salvo, aplicar um modelo, trocar de impressora).
//
// A sincronia é feita em fase de render comparando com o último valor visto,
// em vez de um `useEffect` — que custava um render extra a cada tecla, em
// dezenas de campos. E guardamos o último valor EMITIDO para não reescrever o
// texto do usuário no meio da digitação.
// ============================================================================

interface BaseProps {
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  placeholder?: string;
  id?: string;
  title?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  /** Seleciona o conteúdo ao focar, para trocar o valor digitando direto. */
  selectOnFocus?: boolean;
}

interface InternalProps extends BaseProps {
  value: number | null;
  onCommit: (value: number | null) => void;
  /** Quando falso, um campo vazio vira `null` em vez de cair no mínimo. */
  required: boolean;
}

function clamp(value: number, min?: number, max?: number): number {
  return Math.min(
    max ?? Number.POSITIVE_INFINITY,
    Math.max(min ?? Number.NEGATIVE_INFINITY, value),
  );
}

const RawNumberField = memo(function RawNumberField({
  value,
  onCommit,
  required,
  min,
  max,
  step,
  className,
  placeholder,
  id,
  disabled,
  selectOnFocus = true,
  ...aria
}: InternalProps) {
  const [draft, setDraft] = useState(() => (value === null ? "" : String(value)));
  const [lastValue, setLastValue] = useState(value);
  const lastEmitted = useRef<number | null>(value);

  // Mudança vinda de fora: adota o novo valor. Se o valor apenas voltou do
  // que nós mesmos emitimos, o texto digitado é preservado.
  if (value !== lastValue) {
    setLastValue(value);
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setDraft(value === null ? "" : String(value));
    }
  }

  const commit = (next: number | null) => {
    lastEmitted.current = next;
    onCommit(next);
  };

  const handleBlur = () => {
    const parsed = parseNumberDraft(draft);
    if (parsed === null) {
      if (required) {
        const fallback = min ?? 0;
        setDraft(String(fallback));
        commit(fallback);
      } else {
        setDraft("");
        commit(null);
      }
      return;
    }
    // Normaliza e aplica limites somente ao sair. Durante a digitação, valores
    // intermediários continuam livres para o usuário substituir sem atrito.
    const bounded = clamp(parsed, min, max);
    setDraft(String(bounded));
    commit(bounded);
  };

  return (
    <input
      {...aria}
      id={id}
      type="text"
      inputMode={step !== undefined && step >= 1 ? "numeric" : "decimal"}
      min={min}
      max={max}
      step={step}
      value={draft}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      onFocus={
        selectOnFocus
          ? (event: FocusEvent<HTMLInputElement>) => event.currentTarget.select()
          : undefined
      }
      onChange={(event) => {
        const text = event.target.value;
        if (!isValidNumberDraft(text)) return;
        setDraft(text);
        if (text.trim() === "") {
          if (!required) commit(null);
          return;
        }
        const parsed = parseNumberDraft(text);
        if (parsed !== null) commit(parsed);
      }}
      onBlur={handleBlur}
    />
  );
});

/** Campo numérico obrigatório: vazio volta para o mínimo ao sair. */
export const NumberField = memo(function NumberField({
  value,
  onChange,
  ...rest
}: BaseProps & { value: number; onChange: (value: number) => void }) {
  return (
    <RawNumberField
      {...rest}
      value={value}
      required
      onCommit={(next) => onChange(next ?? rest.min ?? 0)}
    />
  );
});

/** Campo numérico opcional: vazio significa "usar o padrão" (`null`). */
export const OptionalNumberField = memo(function OptionalNumberField({
  value,
  onChange,
  ...rest
}: BaseProps & { value: number | null; onChange: (value: number | null) => void }) {
  return <RawNumberField {...rest} value={value} required={false} onCommit={onChange} />;
});

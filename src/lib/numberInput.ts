/** Aceita estados intermediários necessários durante a digitação. */
export function isValidNumberDraft(text: string): boolean {
  return /^-?(?:\d+(?:[.,]\d*)?|[.,]\d*)?$/.test(text.trim());
}

/** Converte ponto ou vírgula decimal sem transformar campo vazio em zero. */
export function parseNumberDraft(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!normalized || normalized === "-" || normalized === "." || normalized === "-.") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

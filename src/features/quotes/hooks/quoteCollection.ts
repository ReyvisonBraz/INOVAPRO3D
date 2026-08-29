import type { Quote } from "../../../types/domain";

export function appendUniqueQuotes(current: readonly Quote[], incoming: readonly Quote[]): Quote[] {
  const knownIds = new Set(current.map((quote) => quote.id));
  return [...current, ...incoming.filter((quote) => !knownIds.has(quote.id))];
}

import { firestoreQuoteRepository } from "../features/quotes/data/firestoreQuoteRepository";
import type { Quote } from "../types/domain";

export async function fetchQuoteById(id: string): Promise<Quote | null> {
  return firestoreQuoteRepository.findById(id);
}

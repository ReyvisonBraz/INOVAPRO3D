import type { Quote } from "../../../types/domain";

/** Cursor opaco: somente o adaptador de persistência conhece seu formato. */
export interface QuotePageCursor {
  readonly value: unknown;
}

export interface QuotePage {
  items: Quote[];
  cursor: QuotePageCursor | null;
  hasMore: boolean;
}

export interface QuotePageOptions {
  cursor?: QuotePageCursor | null;
  maxResults?: number;
}

export interface QuoteRepository {
  findById(id: string): Promise<Quote | null>;
  listPage(options?: QuotePageOptions): Promise<QuotePage>;
}

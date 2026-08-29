import { readDocumentRecord, type DocumentLike } from "../../../shared/data/document";
import type { Quote } from "../../../types/domain";

export function mapQuoteDocument(document: DocumentLike): Quote {
  const data = readDocumentRecord(document, "Orçamento");
  return { ...data, id: document.id } as unknown as Quote;
}

export function mapActiveQuoteDocuments(documents: readonly DocumentLike[]): Quote[] {
  return documents.map(mapQuoteDocument).filter((quote) => !quote._deleted);
}

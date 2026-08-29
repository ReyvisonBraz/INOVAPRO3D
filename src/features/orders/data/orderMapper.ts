import type { Order } from "../../../types/domain";
import { readDocumentRecord, type DocumentLike } from "../../../shared/data/document";

export function mapOrderDocument(document: DocumentLike): Order {
  const data = readDocumentRecord(document, "Pedido");

  // O ID autoritativo é sempre o ID do documento, nunca um campo persistido.
  return { ...data, id: document.id } as unknown as Order;
}

export function mapActiveOrderDocuments(documents: readonly DocumentLike[]): Order[] {
  return documents.map(mapOrderDocument).filter((order) => !order._deleted);
}

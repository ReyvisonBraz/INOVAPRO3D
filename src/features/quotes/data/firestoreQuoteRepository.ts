import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../../../services/firebase";
import type { QuotePageCursor, QuoteRepository } from "../domain/quoteRepository";
import { mapActiveQuoteDocuments, mapQuoteDocument } from "./quoteMapper";

const DEFAULT_QUOTE_PAGE_SIZE = 100;

function getFirestoreCursor(cursor: QuotePageCursor): QueryDocumentSnapshot<DocumentData> {
  return cursor.value as QueryDocumentSnapshot<DocumentData>;
}

export const firestoreQuoteRepository: QuoteRepository = {
  async findById(id) {
    const snapshot = await getDoc(doc(db, "quotes", id));
    if (!snapshot.exists()) return null;
    return mapQuoteDocument(snapshot);
  },

  async listPage({ cursor = null, maxResults = DEFAULT_QUOTE_PAGE_SIZE } = {}) {
    const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
    if (cursor) constraints.push(startAfter(getFirestoreCursor(cursor)));
    constraints.push(limit(maxResults));

    const snapshot = await getDocs(query(collection(db, "quotes"), ...constraints));
    const lastDocument = snapshot.docs.at(-1);

    return {
      items: mapActiveQuoteDocuments(snapshot.docs),
      cursor: lastDocument ? { value: lastDocument } : null,
      hasMore: snapshot.size === maxResults,
    };
  },
};

import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  collection: vi.fn(() => "quotes-collection"),
  doc: vi.fn((_database: unknown, collectionName: string, id: string) => ({ collectionName, id })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn((value: number) => ({ type: "limit", value })),
  orderBy: vi.fn((field: string, direction: string) => ({ type: "orderBy", field, direction })),
  query: vi.fn(() => "quotes-query"),
  startAfter: vi.fn((value: unknown) => ({ type: "startAfter", value })),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../../../services/firebase", () => ({ db: { name: "test-db" } }));

import { firestoreQuoteRepository } from "./firestoreQuoteRepository";

const document = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });

describe("firestoreQuoteRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca um orçamento por ID usando o mapper da feature", async () => {
    firestore.getDoc.mockResolvedValue({
      id: "quote-id",
      exists: () => true,
      data: () => ({ id: "legacy-id", total: 90 }),
    });

    const quote = await firestoreQuoteRepository.findById("quote-id");

    expect(firestore.doc).toHaveBeenCalledWith(expect.anything(), "quotes", "quote-id");
    expect(quote).toEqual(expect.objectContaining({ id: "quote-id", total: 90 }));
  });

  it("retorna nulo quando o orçamento não existe", async () => {
    firestore.getDoc.mockResolvedValue({ exists: () => false });

    await expect(firestoreQuoteRepository.findById("missing")).resolves.toBeNull();
  });

  it("entrega página, cursor opaco e indicação de próxima página", async () => {
    const first = document("first", { total: 10 });
    const last = document("last", { total: 20 });
    firestore.getDocs.mockResolvedValue({ docs: [first, last], size: 2 });

    const page = await firestoreQuoteRepository.listPage({ maxResults: 2 });

    expect(page.items.map((quote) => quote.id)).toEqual(["first", "last"]);
    expect(page.cursor?.value).toBe(last);
    expect(page.hasMore).toBe(true);
    expect(firestore.startAfter).not.toHaveBeenCalled();
    expect(firestore.limit).toHaveBeenCalledWith(2);
  });

  it("aplica o cursor recebido ao consultar a página seguinte", async () => {
    const cursorDocument = document("cursor", { total: 20 });
    firestore.getDocs.mockResolvedValue({ docs: [], size: 0 });

    const page = await firestoreQuoteRepository.listPage({
      cursor: { value: cursorDocument },
      maxResults: 100,
    });

    expect(firestore.startAfter).toHaveBeenCalledWith(cursorDocument);
    expect(page).toEqual({ items: [], cursor: null, hasMore: false });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  collection: vi.fn(() => "orders-collection"),
  getDocs: vi.fn(),
  limit: vi.fn((value: number) => ({ limit: value })),
  onSnapshot: vi.fn(),
  orderBy: vi.fn((field: string, direction: string) => ({ field, direction })),
  query: vi.fn(() => "orders-query"),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../../../services/firebase", () => ({ db: { name: "test-db" } }));

import { firestoreOrderRepository } from "./firestoreOrderRepository";

const document = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });

interface ChangeSnapshot {
  docChanges(): Array<{
    type: "added" | "modified" | "removed";
    doc: ReturnType<typeof document>;
  }>;
}

type SnapshotListener = (snapshot: ChangeSnapshot) => void;
type ErrorListener = (error: unknown) => void;

describe("firestoreOrderRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista somente pedidos ativos respeitando o limite solicitado", async () => {
    firestore.getDocs.mockResolvedValue({
      docs: [document("active", { total: 25 }), document("deleted", { _deleted: true })],
    });

    const orders = await firestoreOrderRepository.listRecent(20);

    expect(orders.map((order) => order.id)).toEqual(["active"]);
    expect(firestore.limit).toHaveBeenCalledWith(20);
    expect(firestore.orderBy).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("ignora o snapshot inicial e publica somente pedidos novos", () => {
    const unsubscribe = vi.fn();
    const onOrder = vi.fn();
    firestore.onSnapshot.mockReturnValue(unsubscribe);

    const stop = firestoreOrderRepository.subscribeToNewOrders(onOrder);
    const onSnapshot = firestore.onSnapshot.mock.calls[0]?.[1] as SnapshotListener;

    onSnapshot({ docChanges: () => [{ type: "added", doc: document("existing", {}) }] });
    onSnapshot({ docChanges: () => [{ type: "modified", doc: document("changed", {}) }] });
    onSnapshot({ docChanges: () => [{ type: "added", doc: document("new", { total: 75 }) }] });

    expect(onOrder).toHaveBeenCalledOnce();
    expect(onOrder).toHaveBeenCalledWith(expect.objectContaining({ id: "new", total: 75 }));

    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("encaminha falhas da assinatura para o consumidor", () => {
    const onError = vi.fn();
    firestore.onSnapshot.mockReturnValue(vi.fn());

    firestoreOrderRepository.subscribeToNewOrders(vi.fn(), onError);
    const notifyError = firestore.onSnapshot.mock.calls[0]?.[2] as ErrorListener;
    const failure = new Error("listener unavailable");
    notifyError(failure);

    expect(onError).toHaveBeenCalledWith(failure);
  });
});

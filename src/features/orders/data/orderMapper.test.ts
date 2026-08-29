import { describe, expect, it } from "vitest";
import { mapActiveOrderDocuments, mapOrderDocument } from "./orderMapper";

const document = (id: string, data: unknown) => ({ id, data: () => data });

describe("orderMapper", () => {
  it("usa o ID autoritativo do documento", () => {
    const order = mapOrderDocument(document("firestore-id", { id: "stale-id", total: 129.9 }));

    expect(order.id).toBe("firestore-id");
    expect(order.total).toBe(129.9);
  });

  it("remove pedidos enviados para a lixeira", () => {
    const orders = mapActiveOrderDocuments([
      document("active", { total: 10 }),
      document("deleted", { total: 20, _deleted: true }),
    ]);

    expect(orders.map((order) => order.id)).toEqual(["active"]);
  });

  it("rejeita documentos com payload inválido", () => {
    expect(() => mapOrderDocument(document("invalid", null))).toThrow(
      "Pedido invalid possui dados inválidos",
    );
  });
});

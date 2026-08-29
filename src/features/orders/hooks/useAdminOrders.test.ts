import { describe, expect, it } from "vitest";
import type { Order } from "../../../types/domain";
import { mergeRecentOrder } from "./useAdminOrders";

const order = (id: string) => ({ id }) as Order;

describe("mergeRecentOrder", () => {
  it("insere o pedido novo no início sem duplicar IDs", () => {
    const result = mergeRecentOrder([order("older"), order("incoming")], order("incoming"));

    expect(result.map((item) => item.id)).toEqual(["incoming", "older"]);
  });

  it("mantém apenas o limite de pedidos recentes", () => {
    const result = mergeRecentOrder([order("2"), order("3")], order("1"), 2);

    expect(result.map((item) => item.id)).toEqual(["1", "2"]);
  });
});

import { describe, expect, it } from "vitest";
import { calculatePixTotal } from "./commercePricing";

describe("calculatePixTotal", () => {
  it("aplica 5% e arredonda valores monetários", () => {
    expect(calculatePixTotal(1, 5)).toEqual({ subtotal: 1, discount: 0.05, total: 0.95 });
    expect(calculatePixTotal(19.9, 5)).toEqual({ subtotal: 19.9, discount: 1, total: 18.9 });
  });

  it("limita percentuais inválidos", () => {
    expect(calculatePixTotal(10, -5).total).toBe(10);
    expect(calculatePixTotal(10, 150).total).toBe(0);
  });
});

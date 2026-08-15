import { describe, expect, it } from "vitest";
import { shouldRevalidate } from "./useOrderPaymentStatus";

describe("shouldRevalidate", () => {
  it("bloqueia uma segunda revalidação logo em seguida", () => {
    expect(shouldRevalidate(1000, 1500)).toBe(false);
  });

  it("libera depois do intervalo mínimo", () => {
    expect(shouldRevalidate(1000, 1000 + 15_000)).toBe(true);
  });

  it("libera a primeira chamada: o ref começa em 0 e o relógio real está bem além do intervalo", () => {
    expect(shouldRevalidate(0, Date.now())).toBe(true);
  });
});

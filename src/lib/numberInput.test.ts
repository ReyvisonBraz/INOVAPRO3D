import { describe, expect, it } from "vitest";
import { isValidNumberDraft, parseNumberDraft } from "./numberInput";

describe("entrada numérica", () => {
  it("mantém vazio e estados intermediários sem inventar zero", () => {
    expect(parseNumberDraft("")).toBeNull();
    expect(parseNumberDraft("-")).toBeNull();
    expect(parseNumberDraft("1,")).toBe(1);
  });

  it("aceita ponto e vírgula como separador decimal", () => {
    expect(parseNumberDraft("12.5")).toBe(12.5);
    expect(parseNumberDraft("12,5")).toBe(12.5);
  });

  it("bloqueia texto que não representa uma digitação numérica", () => {
    expect(isValidNumberDraft("0")).toBe(true);
    expect(isValidNumberDraft("-0,25")).toBe(true);
    expect(isValidNumberDraft("1,")).toBe(true);
    expect(isValidNumberDraft("abc")).toBe(false);
    expect(isValidNumberDraft("1,2,3")).toBe(false);
  });
});

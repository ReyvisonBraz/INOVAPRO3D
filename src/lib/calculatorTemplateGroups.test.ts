import { describe, expect, it } from "vitest";
import { groupTemplatesByProduct } from "./calculatorTemplateGroups";
import type { CalculatorTemplate } from "../types/domain";

/** Snapshot mínimo — o agrupamento nunca olha para dentro dele. */
const snapshot = {} as CalculatorTemplate["snapshot"];

const template = (patch: Partial<CalculatorTemplate> & { id: string }): CalculatorTemplate => ({
  name: patch.id,
  snapshot,
  ...patch,
});

describe("groupTemplatesByProduct", () => {
  it("modelo sem productKey vira grupo de 1, igual ao comportamento anterior ao agrupamento", () => {
    const solo = template({ id: "solo" });
    const groups = groupTemplatesByProduct([solo]);

    expect(groups).toEqual([{ anchor: solo, variants: [solo] }]);
  });

  it("modelos sem productKey nunca se misturam entre si, mesmo em quantidade", () => {
    const a = template({ id: "a", quantityValue: 1 });
    const b = template({ id: "b", quantityValue: 1 });

    const groups = groupTemplatesByProduct([a, b]);

    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.variants.length)).toEqual([1, 1]);
  });

  it("agrupa variantes do mesmo productKey e ordena por quantidade crescente", () => {
    const five = template({ id: "five", productKey: "quadro", quantityValue: 5 });
    const one = template({ id: "one", productKey: "quadro", quantityValue: 1 });
    const ten = template({ id: "ten", productKey: "quadro", quantityValue: 10 });

    const [group] = groupTemplatesByProduct([five, one, ten]);

    expect(group.variants.map((v) => v.id)).toEqual(["one", "five", "ten"]);
    expect(group.anchor.id).toBe("one");
  });

  it("empate de quantidade desempata pelo mais antigo (createdAt.seconds)", () => {
    const newer = template({
      id: "newer",
      productKey: "quadro",
      quantityValue: 5,
      createdAt: { seconds: 200 },
    });
    const older = template({
      id: "older",
      productKey: "quadro",
      quantityValue: 5,
      createdAt: { seconds: 100 },
    });

    const [group] = groupTemplatesByProduct([newer, older]);

    expect(group.anchor.id).toBe("older");
  });

  it("preserva a posição da primeira ocorrência do grupo na lista (não empurra para o fim)", () => {
    const popular = template({ id: "popular", productKey: "quadro", quantityValue: 1 });
    const middle = template({ id: "middle" });
    const popularVariant = template({ id: "popular-5", productKey: "quadro", quantityValue: 5 });

    // Ordem de entrada como viria de fetchCalculatorTemplates (usageCount desc):
    // o produto popular aparece primeiro, mesmo tendo uma segunda variante
    // só encontrada depois de "middle" na lista.
    const groups = groupTemplatesByProduct([popular, middle, popularVariant]);

    expect(groups.map((g) => g.anchor.id)).toEqual(["popular", "middle"]);
    expect(groups[0].variants).toHaveLength(2);
  });
});

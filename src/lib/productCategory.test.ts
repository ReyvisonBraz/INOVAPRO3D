import { describe, it, expect } from "vitest";
import {
  resolveProductCategory,
  isProductCategoryPending,
  filterProductsByCategory,
  countProductsByCategoryId,
  planCategoryBackfill,
} from "./productCategory";
import type { Category, Product } from "../types/domain";

const cats: Category[] = [
  { id: "quadros", name: "QUADROS" },
  { id: "chaveiros", name: "CHAVEIROS" },
  { id: "abstratos", name: "ABSTRATOS", parentId: "quadros" },
  { id: "g1", name: "GAMES", parentId: "quadros" },
  { id: "g2", name: "GAMES", parentId: "chaveiros" },
  { id: "dec", name: "DECORAÇÃO" },
];

/** Produto mínimo: só o que o vínculo com categoria enxerga. */
const prod = (id: string, category: string, categoryId?: string): Product =>
  ({ id, name: id, description: "", basePrice: 0, images: [], category, categoryId }) as Product;

describe("resolveProductCategory", () => {
  it("resolve pelo id quando ele existe", () => {
    expect(resolveProductCategory(cats, prod("p", "GAMES", "g2"))?.id).toBe("g2");
  });
  it("o id manda mesmo quando o nome gravado discorda", () => {
    expect(resolveProductCategory(cats, prod("p", "QUADROS", "abstratos"))?.id).toBe("abstratos");
  });
  it("id apagado não vira adivinhação pelo nome", () => {
    expect(resolveProductCategory(cats, prod("p", "DECORAÇÃO", "sumiu"))).toBeNull();
  });
  it("resolve pelo nome quando ele é único", () => {
    expect(resolveProductCategory(cats, prod("p", "ABSTRATOS"))?.id).toBe("abstratos");
  });
  it("devolve null quando o nome existe sob vários pais", () => {
    expect(resolveProductCategory(cats, prod("p", "GAMES"))).toBeNull();
  });
  it("ignora caixa e espaços em volta", () => {
    expect(resolveProductCategory(cats, prod("p", "  decoração "))?.id).toBe("dec");
  });
  it("devolve null para produto sem categoria", () => {
    expect(resolveProductCategory(cats, prod("p", ""))).toBeNull();
  });
  it("devolve null para nome que não existe na coleção", () => {
    expect(resolveProductCategory(cats, prod("p", "MINIATURAS"))).toBeNull();
  });
});

describe("isProductCategoryPending", () => {
  it("produto migrado não está pendente", () => {
    expect(isProductCategoryPending(cats, prod("p", "GAMES", "g1"))).toBe(false);
  });
  it("nome ambíguo está pendente", () => {
    expect(isProductCategoryPending(cats, prod("p", "GAMES"))).toBe(true);
  });
  it("produto sem categoria está pendente", () => {
    expect(isProductCategoryPending(cats, prod("p", ""))).toBe(true);
  });
  it("nome único não está pendente", () => {
    expect(isProductCategoryPending(cats, prod("p", "CHAVEIROS"))).toBe(false);
  });
});

describe("filterProductsByCategory", () => {
  const products = [
    prod("migrado-g1", "GAMES", "g1"),
    prod("migrado-g2", "GAMES", "g2"),
    prod("legado-games", "GAMES"),
    prod("abstrato", "ABSTRATOS"),
    prod("chaveiro", "CHAVEIROS"),
  ];

  it("inclui os produtos das subcategorias", () => {
    expect(filterProductsByCategory(cats, products, "quadros").map((p) => p.id)).toEqual([
      "migrado-g1",
      "legado-games",
      "abstrato",
    ]);
  });
  it("separa as duas GAMES pelos produtos migrados", () => {
    expect(filterProductsByCategory(cats, products, "g1").map((p) => p.id)).toEqual([
      "migrado-g1",
      "legado-games",
    ]);
    expect(filterProductsByCategory(cats, products, "g2").map((p) => p.id)).toEqual([
      "migrado-g2",
      "legado-games",
    ]);
  });
  it("não some com o produto legado de nome ambíguo", () => {
    // Enquanto não migra, ele aparece nos dois ramos — como hoje.
    const emAlgum = ["g1", "g2"].some((id) =>
      filterProductsByCategory(cats, products, id).some((p) => p.id === "legado-games"),
    );
    expect(emAlgum).toBe(true);
  });
  it("produto migrado não vaza para a homônima pelo nome", () => {
    expect(filterProductsByCategory(cats, products, "g2").map((p) => p.id)).not.toContain(
      "migrado-g1",
    );
  });
  it("devolve vazio para categoria sem produtos", () => {
    expect(filterProductsByCategory(cats, products, "dec")).toEqual([]);
  });
});

describe("countProductsByCategoryId", () => {
  it("conta cada categoria homônima separadamente quando migrado", () => {
    const counts = countProductsByCategoryId(cats, [
      prod("a", "GAMES", "g1"),
      prod("b", "GAMES", "g1"),
      prod("c", "GAMES", "g2"),
    ]);
    expect(counts.get("g1")).toBe(2);
    expect(counts.get("g2")).toBe(1);
  });
  it("legado ambíguo conta nas duas, batendo com o que o filtro mostra", () => {
    const counts = countProductsByCategoryId(cats, [prod("a", "GAMES")]);
    expect(counts.get("g1")).toBe(1);
    expect(counts.get("g2")).toBe(1);
  });
  it("não conta a subcategoria dentro do pai", () => {
    const counts = countProductsByCategoryId(cats, [prod("a", "ABSTRATOS")]);
    expect(counts.get("abstratos")).toBe(1);
    expect(counts.get("quadros")).toBeUndefined();
  });
  it("ignora produto sem categoria", () => {
    expect(countProductsByCategoryId(cats, [prod("a", "")]).size).toBe(0);
  });
});

describe("planCategoryBackfill", () => {
  it("resolve os de nome único e deixa os ambíguos na fila", () => {
    const plan = planCategoryBackfill(cats, [
      prod("a", "DECORAÇÃO"),
      prod("b", "GAMES"),
      prod("c", "ABSTRATOS"),
    ]);
    expect(plan.resolved.map((r) => [r.productId, r.categoryId])).toEqual([
      ["a", "dec"],
      ["c", "abstratos"],
    ]);
    expect(plan.pending.map((p) => p.id)).toEqual(["b"]);
  });
  it("ignora produto que já tem categoryId", () => {
    const plan = planCategoryBackfill(cats, [prod("a", "GAMES", "g1")]);
    expect(plan.resolved).toEqual([]);
    expect(plan.pending).toEqual([]);
  });
  it("põe na fila o produto sem categoria e o de nome que não existe", () => {
    const plan = planCategoryBackfill(cats, [prod("a", ""), prod("b", "MINIATURAS")]);
    expect(plan.resolved).toEqual([]);
    expect(plan.pending.map((p) => p.id)).toEqual(["a", "b"]);
  });
  it("não escreve nada: só descreve", () => {
    const products = [prod("a", "DECORAÇÃO")];
    planCategoryBackfill(cats, products);
    expect(products[0].categoryId).toBeUndefined();
  });
});

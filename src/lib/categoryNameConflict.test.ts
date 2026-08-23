import { describe, it, expect } from "vitest";
import {
  findCategoryNameConflict,
  categoryPathLabel,
  categorySlug,
  findCategoryBySlug,
} from "./categoryTree";
import type { Category } from "../types/domain";

const cats: Category[] = [
  { id: "quadros", name: "QUADROS" },
  { id: "chaveiros", name: "CHAVEIROS" },
  { id: "g1", name: "GAMES", parentId: "quadros" },
  { id: "g2", name: "GAMES", parentId: "chaveiros" },
  { id: "dec", name: "DECORAÇÃO" },
];

describe("findCategoryNameConflict", () => {
  it("libera o mesmo nome sob pais diferentes", () => {
    expect(findCategoryNameConflict(cats, "GAMES", "quadros", "g1")).toBeNull();
  });
  it("acusa nome repetido entre irmãos", () => {
    expect(findCategoryNameConflict(cats, "GAMES", "quadros")?.id).toBe("g1");
  });
  it("acusa nome repetido entre categorias principais", () => {
    expect(findCategoryNameConflict(cats, "DECORAÇÃO", "")?.id).toBe("dec");
  });
  it("não confunde subcategoria com categoria principal", () => {
    expect(findCategoryNameConflict(cats, "GAMES", "")).toBeNull();
  });
  it("ignora caixa e espaços em volta", () => {
    expect(findCategoryNameConflict(cats, "  games ", "chaveiros")?.id).toBe("g2");
  });
  it("não acusa a própria categoria em edição", () => {
    expect(findCategoryNameConflict(cats, "GAMES", "chaveiros", "g2")).toBeNull();
  });
  it("libera nome novo", () => {
    expect(findCategoryNameConflict(cats, "MINIATURAS", "quadros")).toBeNull();
  });
  it("devolve null para nome vazio", () => {
    expect(findCategoryNameConflict(cats, "   ", "quadros")).toBeNull();
  });
  it("trata parentId ausente como categoria principal", () => {
    expect(findCategoryNameConflict(cats, "QUADROS")?.id).toBe("quadros");
  });
});

describe("categoryPathLabel", () => {
  it("mostra o caminho da subcategoria", () => {
    expect(categoryPathLabel(cats, "g1")).toBe("QUADROS › GAMES");
  });
  it("distingue as duas GAMES", () => {
    expect(categoryPathLabel(cats, "g2")).toBe("CHAVEIROS › GAMES");
  });
  it("mostra só o nome numa categoria principal", () => {
    expect(categoryPathLabel(cats, "quadros")).toBe("QUADROS");
  });
});

describe("categorySlug", () => {
  it("mantém o slug simples quando o nome é único", () => {
    expect(categorySlug(cats, "quadros")).toBe("quadros");
    expect(categorySlug(cats, "dec")).toBe("decoracao");
  });
  it("prefixa com o pai quando o nome se repete", () => {
    expect(categorySlug(cats, "g1")).toBe("quadros-games");
    expect(categorySlug(cats, "g2")).toBe("chaveiros-games");
  });
  it("devolve vazio para id que não existe", () => {
    expect(categorySlug(cats, "sumiu")).toBe("");
  });
});

describe("findCategoryBySlug", () => {
  it("acha pelo slug desambiguado", () => {
    expect(findCategoryBySlug(cats, "chaveiros-games")?.id).toBe("g2");
  });
  it("link antigo ambíguo ainda abre uma das homônimas", () => {
    expect(["g1", "g2"]).toContain(findCategoryBySlug(cats, "games")?.id);
  });
  it("acha categoria de nome único", () => {
    expect(findCategoryBySlug(cats, "decoracao")?.id).toBe("dec");
  });
  it("devolve null para slug desconhecido", () => {
    expect(findCategoryBySlug(cats, "miniaturas")).toBeNull();
  });
  it("devolve null para slug vazio", () => {
    expect(findCategoryBySlug(cats, "")).toBeNull();
  });
});

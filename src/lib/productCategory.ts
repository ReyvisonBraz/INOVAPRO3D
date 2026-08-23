import type { Category, Product } from "../types/domain";
import { getAllDescendantIds } from "./categoryTree";

/**
 * Vinculo entre produto e categoria.
 *
 * O produto guardava so o NOME da categoria, e o mesmo nome existe sob pais
 * diferentes de proposito (GAMES sob CHAVEIROS e sob QUADROS). Por nome, esse
 * produto pertencia aos dois ramos ao mesmo tempo. O vinculo real e o
 * `categoryId`; o nome fica como espelho de exibicao e como fallback dos
 * produtos ainda nao migrados.
 *
 * Toda leitura passa por aqui: id primeiro, nome so quando ele for unico.
 */

/** Entrada minima para resolver: aceita produto completo ou so os dois campos. */
type ProductCategoryRef = Pick<Product, "category"> & Partial<Pick<Product, "categoryId">>;

function normalizeName(name: string | undefined): string {
  return name?.trim().toUpperCase() ?? "";
}

/** Nome normalizado -> categorias com esse nome. Nome vazio fica de fora. */
function indexByName(categories: Category[]): Map<string, Category[]> {
  const byName = new Map<string, Category[]>();
  for (const category of categories) {
    const name = normalizeName(category.name);
    if (!name) continue;
    const list = byName.get(name);
    if (list) list.push(category);
    else byName.set(name, [category]);
  }
  return byName;
}

/**
 * Categoria do produto, ou null quando nao da para saber.
 *
 * Devolve null de proposito quando o nome existe sob varios pais: escolher um
 * deles seria um chute, e um chute errado move o produto de ramo sem ninguem
 * perceber. Null manda o produto para a fila de decisao do admin.
 */
export function resolveProductCategory(
  categories: Category[],
  product: ProductCategoryRef,
): Category | null {
  if (product.categoryId) {
    // Id gravado que nao existe mais e dado inconsistente, nao convite para
    // adivinhar pelo nome — cai na fila igual aos ambiguos.
    return categories.find((category) => category.id === product.categoryId) ?? null;
  }
  const name = normalizeName(product.category);
  if (!name) return null;
  const matches = indexByName(categories).get(name) ?? [];
  return matches.length === 1 ? matches[0] : null;
}

/** true quando o produto precisa de uma decisao humana sobre a categoria. */
export function isProductCategoryPending(
  categories: Category[],
  product: ProductCategoryRef,
): boolean {
  return resolveProductCategory(categories, product) === null;
}

/**
 * Produtos da categoria, incluindo os das subcategorias.
 *
 * Abrir QUADROS mostra tambem o que esta em QUADROS › ABSTRATOS, como sempre
 * mostrou — a diferenca e que agora a arvore e percorrida por id.
 *
 * Produto sem `categoryId` e com nome ambiguo cai no casamento por nome, o
 * comportamento de hoje: aparece em todos os ramos homonimos. Preferir isso a
 * some-lo da vitrine enquanto a migracao nao termina — cliente nao ve produto
 * repetido como defeito, mas produto ausente nao vende.
 */
export function filterProductsByCategory(
  categories: Category[],
  products: Product[],
  categoryId: string,
  options: { includeDescendants?: boolean } = {},
): Product[] {
  const ids = new Set(
    options.includeDescendants === false
      ? [categoryId]
      : getAllDescendantIds(categories, categoryId),
  );
  const names = new Set(
    categories
      .filter((category) => ids.has(category.id))
      .map((category) => normalizeName(category.name)),
  );
  return products.filter((product) => {
    const resolved = resolveProductCategory(categories, product);
    if (resolved) return ids.has(resolved.id);
    if (product.categoryId) return false;
    return names.has(normalizeName(product.category));
  });
}

/** O que o backfill vai gravar e o que sobra para decisao humana. */
export interface CategoryBackfillPlan {
  /** Produtos cujo nome resolve numa categoria so: recebem `categoryId`. */
  resolved: { productId: string; productName: string; categoryId: string }[];
  /** Produtos que ficam na fila: sem nome, nome ambiguo ou nome inexistente. */
  pending: Product[];
}

/**
 * Prevê o backfill sem escrever nada.
 *
 * Produto que ja tem `categoryId` fica de fora dos dois lados — nada a fazer.
 * Separado da gravacao de proposito: o admin ve os numeros antes de confirmar,
 * e a regra de decisao e a mesma `resolveProductCategory` ja coberta por teste.
 */
export function planCategoryBackfill(
  categories: Category[],
  products: Product[],
): CategoryBackfillPlan {
  const plan: CategoryBackfillPlan = { resolved: [], pending: [] };
  for (const product of products) {
    if (product.categoryId) continue;
    const resolved = resolveProductCategory(categories, product);
    if (resolved)
      plan.resolved.push({
        productId: product.id,
        productName: product.name,
        categoryId: resolved.id,
      });
    else plan.pending.push(product);
  }
  return plan;
}

/**
 * Quantos produtos em cada categoria, por id.
 *
 * Conta so o vinculo direto, sem somar as subcategorias — e o numero que o
 * painel mostra ao lado de cada categoria.
 *
 * Produto de nome ambiguo ainda nao migrado conta em cada homonima, pelo mesmo
 * motivo de `filterProductsByCategory`: o numero tem que bater com o que
 * aparece ao clicar. Conforme os produtos ganham `categoryId`, os totais das
 * homonimas se separam sozinhos.
 */
export function countProductsByCategoryId(
  categories: Category[],
  products: Product[],
): Map<string, number> {
  const byName = indexByName(categories);
  const counts = new Map<string, number>();
  const bump = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);

  for (const product of products) {
    const resolved = resolveProductCategory(categories, product);
    if (resolved) {
      bump(resolved.id);
      continue;
    }
    if (product.categoryId) continue;
    for (const category of byName.get(normalizeName(product.category)) ?? []) bump(category.id);
  }
  return counts;
}

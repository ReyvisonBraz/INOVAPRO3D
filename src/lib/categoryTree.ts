import type { Category } from "../types/domain";

export interface CategoryTreeNode {
  category: Category;
  children: CategoryTreeNode[];
}

export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const active = categories.filter((c) => c.active !== false);
  const byParent = new Map<string | null, Category[]>();

  for (const cat of active) {
    const key = cat.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(cat);
  }

  const sortByOrder = (list: Category[]) =>
    [...list].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const build = (parentId: string | null): CategoryTreeNode[] =>
    sortByOrder(byParent.get(parentId) ?? []).map((cat) => ({
      category: cat,
      children: build(cat.id),
    }));

  return build(null);
}

export function getCategoryPath(categories: Category[], categoryId: string): Category[] {
  const map = new Map(categories.map((c) => [c.id, c]));
  const path: Category[] = [];
  let current: Category | undefined = map.get(categoryId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? map.get(current.parentId) : undefined;
  }
  return path;
}

export function getAllDescendantIds(categories: Category[], categoryId: string): string[] {
  const map = new Map<string, Category[]>();
  for (const cat of categories) {
    const key = cat.parentId ?? "__root__";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(cat);
  }
  const ids: string[] = [categoryId];
  const stack = map.get(categoryId)?.map((c) => c.id) ?? [];
  while (stack.length) {
    const id = stack.pop()!;
    ids.push(id);
    const children = map.get(id) ?? [];
    stack.push(...children.map((c) => c.id));
  }
  return ids;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

export function categoryNameToSlug(name: string): string {
  return generateSlug(name);
}

/**
 * Devolve a categoria irma que ja usa `name`, ou null se o nome estiver livre.
 *
 * A checagem e entre irmaos, nao global: GAMES sob QUADROS e GAMES sob
 * CHAVEIROS sao categorias legitimas e diferentes. Duas GAMES dentro do mesmo
 * pai, nao — sao indistinguiveis para quem cadastra e para o cliente.
 */
export function findCategoryNameConflict(
  categories: Category[],
  name: string,
  parentId?: string | null,
  ignoreId?: string | null,
): Category | null {
  const target = name.trim().toUpperCase();
  if (!target) return null;
  const parent = parentId || null;
  return (
    categories.find(
      (category) =>
        category.id !== ignoreId &&
        (category.parentId || null) === parent &&
        category.name?.trim().toUpperCase() === target,
    ) ?? null
  );
}

/**
 * Slug da categoria para a URL, unico dentro da colecao.
 *
 * O slug gravado vem do nome, entao as tres GAMES geravam "games" e o link
 * apontava para qualquer uma delas. Quando o nome se repete, o slug do pai
 * entra como prefixo ("quadros-games"); quando e unico, nada muda e os links
 * antigos continuam valendo.
 *
 * Derivado na leitura de proposito — nao exige reescrever slug no banco.
 */
export function categorySlug(categories: Category[], categoryId: string): string {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return "";
  const own = category.slug || generateSlug(category.name);
  const homonyms = categories.filter(
    (c) => c.id !== category.id && (c.slug || generateSlug(c.name)) === own,
  );
  if (homonyms.length === 0) return own;
  const parent = category.parentId ? categories.find((c) => c.id === category.parentId) : undefined;
  return parent ? `${parent.slug || generateSlug(parent.name)}-${own}` : own;
}

/**
 * Categoria a partir do slug da URL.
 *
 * Aceita tanto o slug desambiguado quanto o antigo: link velho para "games"
 * ainda abre uma das GAMES em vez de cair em "nenhuma categoria".
 */
export function findCategoryBySlug(categories: Category[], slug: string): Category | null {
  if (!slug) return null;
  const exact = categories.find((c) => categorySlug(categories, c.id) === slug);
  if (exact) return exact;
  return categories.find((c) => (c.slug || generateSlug(c.name)) === slug) ?? null;
}

/** Nome da categoria com o caminho ate a raiz: "QUADROS › GAMES". */
export function categoryPathLabel(categories: Category[], categoryId: string): string {
  return getCategoryPath(categories, categoryId)
    .map((category) => category.name)
    .join(" › ");
}

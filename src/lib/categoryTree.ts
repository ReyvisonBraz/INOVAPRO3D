import type { Category } from "../types/domain";

export interface CategoryTreeNode {
  category: Category;
  children: CategoryTreeNode[];
}

export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const active = categories.filter(c => c.active !== false);
  const byParent = new Map<string | null, Category[]>();

  for (const cat of active) {
    const key = cat.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(cat);
  }

  const sortByOrder = (list: Category[]) =>
    [...list].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const build = (parentId: string | null): CategoryTreeNode[] =>
    sortByOrder(byParent.get(parentId) ?? []).map(cat => ({
      category: cat,
      children: build(cat.id),
    }));

  return build(null);
}

export function getCategoryPath(categories: Category[], categoryId: string): Category[] {
  const map = new Map(categories.map(c => [c.id, c]));
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
  const stack = map.get(categoryId)?.map(c => c.id) ?? [];
  while (stack.length) {
    const id = stack.pop()!;
    ids.push(id);
    const children = map.get(id) ?? [];
    stack.push(...children.map(c => c.id));
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

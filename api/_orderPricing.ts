// ============================================================================
// RECÁLCULO DE TOTAL DE PEDIDO (fonte de verdade no servidor)
// ----------------------------------------------------------------------------
// Função PURA (sem I/O): recebe os itens do cliente e os registros de catálogo
// já carregados do Firestore, e recalcula preço unitário e total. O cliente
// NUNCA define preço — só quais itens e quantidades quer.
// ============================================================================

export interface OrderLineInput {
  type: string;
  productId?: string;
  materialId?: string;
  quantity: number;
}

export interface ProductRecord {
  basePrice: number;
  active?: boolean;
  name?: string;
}

export interface MaterialRecord {
  priceMult?: number;
  name?: string;
}

export interface ComputedLine {
  productId: string;
  materialId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export type ComputeResult =
  | { ok: true; lines: ComputedLine[]; total: number }
  | { ok: false; error: string };

const MAX_ITEMS = 50;
const MAX_QTY = 99;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeOrderTotal(
  items: OrderLineInput[],
  products: Map<string, ProductRecord>,
  materials: Map<string, MaterialRecord>,
): ComputeResult {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: "Pedido sem itens." };
  if (items.length > MAX_ITEMS) return { ok: false, error: "Itens demais no pedido." };

  const lines: ComputedLine[] = [];
  for (const it of items) {
    if (!it || it.type !== "PRODUCT") return { ok: false, error: "Tipo de item não suportado." };
    const productId = it.productId;
    if (typeof productId !== "string" || !productId) return { ok: false, error: "Item sem productId." };

    const product = products.get(productId);
    if (!product) return { ok: false, error: `Produto não encontrado: ${productId}` };
    if (product.active === false) return { ok: false, error: `Produto indisponível: ${productId}` };

    const base = Number(product.basePrice);
    if (!Number.isFinite(base) || base <= 0) return { ok: false, error: `Preço inválido: ${productId}` };

    const qty = Math.min(MAX_QTY, Math.max(1, Math.floor(Number(it.quantity) || 1)));

    let mult = 1;
    let materialId: string | null = null;
    if (it.materialId) {
      const mat = materials.get(it.materialId);
      if (!mat) return { ok: false, error: `Material não encontrado: ${it.materialId}` };
      const m = Number(mat.priceMult ?? 1);
      mult = Number.isFinite(m) && m > 0 ? m : 1;
      materialId = it.materialId;
    }

    const unitPrice = round2(base * mult);
    const lineTotal = round2(unitPrice * qty);
    lines.push({ productId, materialId, name: product.name ?? productId, quantity: qty, unitPrice, lineTotal });
  }

  const total = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  if (total <= 0) return { ok: false, error: "Total inválido." };
  return { ok: true, lines, total };
}

export const DEFAULT_PIX_DISCOUNT_PERCENT = 5;

export interface DiscountedTotal {
  subtotal: number;
  discount: number;
  total: number;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Calcula valores monetários do Pix de forma idêntica no navegador e no servidor. */
export function calculatePixTotal(subtotal: number, discountPercent: number): DiscountedTotal {
  const safeSubtotal = Math.max(0, roundMoney(Number(subtotal) || 0));
  const safePercent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const discount = roundMoney(safeSubtotal * (safePercent / 100));
  return {
    subtotal: safeSubtotal,
    discount,
    total: roundMoney(Math.max(0, safeSubtotal - discount)),
  };
}

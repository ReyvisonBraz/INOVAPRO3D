// Função serverless (Vercel) para criar pedido com o total recalculado no
// servidor. Espelha o endpoint Express em server.ts — na Vercel o runtime de
// produção são estas funções de api/, não o Express. Mantenha os dois em sincronia.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminAuth, getAdminDb, isAdminSdkConfigured } from "../firebaseAdmin.js";
import { computeOrderTotal, type OrderLineInput, type ProductRecord, type MaterialRecord } from "../_orderPricing.js";

interface CreateOrderPayload {
  items?: OrderLineInput[];
  userName?: string;
  userEmail?: string;
  phone?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  // Auth obrigatória + Admin SDK obrigatório (sem ele não há recálculo confiável).
  if (!isAdminSdkConfigured()) {
    res.status(503).json({ error: "Criação de pedido indisponível (servidor não configurado)." });
    return;
  }
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Não autorizado." });
    return;
  }
  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
  } catch {
    res.status(401).json({ error: "Token inválido." });
    return;
  }

  const body = (req.body ?? {}) as CreateOrderPayload;
  const items = Array.isArray(body.items) ? body.items : [];

  const productIds = [...new Set(items.filter((i) => i?.type === "PRODUCT" && i.productId).map((i) => i.productId as string))];
  const materialIds = [...new Set(items.map((i) => i?.materialId).filter((x): x is string => !!x))];

  const adminDb = getAdminDb();
  const products = new Map<string, ProductRecord>();
  const materials = new Map<string, MaterialRecord>();
  try {
    await Promise.all(productIds.map(async (id) => {
      const snap = await adminDb.collection("products").doc(id).get();
      if (snap.exists) {
        const d = snap.data()!;
        products.set(id, { basePrice: Number(d.basePrice), active: d.active, name: d.name });
      }
    }));
    await Promise.all(materialIds.map(async (id) => {
      const snap = await adminDb.collection("materials").doc(id).get();
      if (snap.exists) {
        const d = snap.data()!;
        materials.set(id, { priceMult: d.priceMult, name: d.name });
      }
    }));
  } catch {
    res.status(500).json({ error: "Erro ao carregar catálogo." });
    return;
  }

  const result = computeOrderTotal(items, products, materials);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  try {
    const orderItems = result.lines.map((l) => ({
      id: l.materialId ? `${l.productId}-${l.materialId}` : l.productId,
      productId: l.productId,
      materialId: l.materialId,
      name: l.name,
      price: l.unitPrice,
      quantity: l.quantity,
      type: "PRODUCT",
    }));
    const ref = await adminDb.collection("orders").add({
      userId: uid,
      userName: body.userName ?? null,
      userEmail: body.userEmail ?? null,
      phone: body.phone ?? null,
      items: orderItems,
      subtotal: result.total,
      total: result.total,
      shippingRate: 0,
      couponCode: null,
      couponDiscount: null,
      shippingAddress: null,
      status: "PENDING_PAYMENT",
      paymentMethod: "manual",
      createdAt: new Date(),
    });
    res.status(200).json({ orderId: ref.id, total: result.total });
  } catch {
    res.status(500).json({ error: "Erro ao criar pedido." });
  }
}

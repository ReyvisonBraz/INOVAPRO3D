// Função serverless (Vercel) para criar pedido com o total recalculado no
// servidor. Espelha o endpoint Express em server.ts — na Vercel o runtime de
// produção são estas funções de api/, não o Express. Mantenha os dois em sincronia.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminAuth, getAdminDb, isAdminSdkConfigured } from "../../server/firebaseAdmin.js";
import { AppError } from "../../server/_observability/appError.js";
import { createRequestContext } from "../../server/_observability/context.js";
import { sendApiError } from "../../server/_observability/http.js";
import { logEvent } from "../../server/_observability/logger.js";
import {
  computeOrderTotal,
  type OrderLineInput,
  type ProductRecord,
  type MaterialRecord,
} from "../../server/_orderPricing.js";
import { calculatePixTotal, DEFAULT_PIX_DISCOUNT_PERCENT } from "../../shared/commercePricing.js";
import { resolveTrustedIdentity } from "../../server/_orderNotification.js";
import { checkRateLimit, clientIp } from "../../server/_rateLimit.js";

// `userName`/`userEmail` chegam do cliente por compatibilidade, mas são
// deliberadamente IGNORADOS: a identidade gravada no pedido vem do token
// verificado. Aceitá-los do corpo permitia criar um pedido com o e-mail de
// terceiro e, na sequência, disparar a notificação para essa vítima.
interface CreateOrderPayload {
  items?: OrderLineInput[];
  phone?: unknown;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const context = createRequestContext(req, "order-api", "create-order");
  res.setHeader("X-Correlation-Id", context.correlationId);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendApiError(res, context, new AppError("METHOD_NOT_ALLOWED"));
    return;
  }

  // O espelho Express (server.ts) sempre teve `rateLimit(10)` nesta rota;
  // esta função — o runtime de produção na Vercel — nunca teve limite algum.
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    "orders-create",
    clientIp(req),
    10,
    context,
  );
  if (!allowed) {
    res.setHeader("Retry-After", String(retryAfterSeconds || 60));
    sendApiError(res, context, new AppError("RATE_LIMITED"));
    return;
  }

  // Auth obrigatória + Admin SDK obrigatório (sem ele não há recálculo confiável).
  if (!isAdminSdkConfigured()) {
    sendApiError(
      res,
      context,
      new AppError("SERVICE_CONFIGURATION_ERROR", {
        technicalMessage: "Firebase Admin SDK não configurado para criar pedido",
      }),
    );
    return;
  }
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) {
    sendApiError(res, context, new AppError("AUTH_REQUIRED"));
    return;
  }
  let uid: string;
  let decodedToken: { email?: string; emailVerified?: boolean; name?: string };
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
    decodedToken = {
      email: decoded.email,
      emailVerified: decoded.email_verified === true,
      name: decoded.name,
    };
  } catch (error) {
    sendApiError(
      res,
      context,
      new AppError("AUTH_REQUIRED", {
        cause: error,
        technicalMessage: "Token Firebase inválido",
      }),
    );
    return;
  }

  const body = (req.body ?? {}) as CreateOrderPayload;
  const items = Array.isArray(body.items) ? body.items : [];

  const productIds = [
    ...new Set(
      items.filter((i) => i?.type === "PRODUCT" && i.productId).map((i) => i.productId as string),
    ),
  ];
  const adminDb = getAdminDb();
  const products = new Map<string, ProductRecord>();
  const materials = new Map<string, MaterialRecord>();
  try {
    await Promise.all(
      productIds.map(async (id) => {
        const snap = await adminDb.collection("products").doc(id).get();
        if (snap.exists) {
          const d = snap.data()!;
          products.set(id, {
            basePrice: Number(d.basePrice),
            active: d.active,
            name: d.name,
            productionMaterial: d.productionMaterial,
          });
        }
      }),
    );
  } catch (error) {
    sendApiError(
      res,
      context,
      new AppError("ORDER_CREATION_FAILED", {
        cause: error,
        technicalMessage: "Falha ao carregar catálogo para criar pedido",
      }),
      { productCount: productIds.length },
    );
    return;
  }

  const result = computeOrderTotal(items, products, materials);
  if (!result.ok) {
    sendApiError(
      res,
      context,
      new AppError("INVALID_REQUEST", {
        technicalMessage: result.error,
        details: { itemCount: items.length },
      }),
    );
    return;
  }

  try {
    const mercadoPagoEnabled = process.env.MERCADOPAGO_ENABLED === "true";
    let pixDiscountPercent = DEFAULT_PIX_DISCOUNT_PERCENT;
    if (mercadoPagoEnabled) {
      const pricingSnapshot = await adminDb.collection("settings").doc("pricing").get();
      const configuredPercent = Number(pricingSnapshot.data()?.pixDiscountPct);
      if (Number.isFinite(configuredPercent)) pixDiscountPercent = configuredPercent;
    }
    const totals = mercadoPagoEnabled
      ? calculatePixTotal(result.total, pixDiscountPercent)
      : { subtotal: result.total, discount: 0, total: result.total };

    const orderItems = result.lines.map((l) => ({
      id: l.materialId ? `${l.productId}-${l.materialId}` : l.productId,
      productId: l.productId,
      materialId: l.materialId,
      productionMaterial: l.productionMaterial,
      name: l.name,
      price: l.unitPrice,
      quantity: l.quantity,
      type: "PRODUCT",
    }));
    // Identidade a partir do token verificado — nunca do corpo da requisição.
    const identity = await resolveTrustedIdentity(adminDb, uid, decodedToken);
    const phone = typeof body.phone === "string" ? body.phone.slice(0, 32) : null;

    const ref = await adminDb.collection("orders").add({
      userId: uid,
      userName: identity.name,
      userEmail: identity.email,
      phone,
      items: orderItems,
      subtotal: totals.subtotal,
      discount: totals.discount,
      pixDiscountPercent: mercadoPagoEnabled ? pixDiscountPercent : 0,
      total: totals.total,
      shippingRate: 0,
      couponCode: null,
      couponDiscount: null,
      shippingAddress: null,
      status: "PENDING_PAYMENT",
      paymentMethod: mercadoPagoEnabled ? "pix" : "manual",
      paymentProvider: mercadoPagoEnabled ? "mercadopago" : "manual",
      createdAt: new Date(),
    });
    logEvent("info", context, "Pedido criado", {
      orderId: ref.id,
      userId: uid,
      itemCount: orderItems.length,
      paymentMethod: mercadoPagoEnabled ? "pix" : "manual",
    });
    res.status(200).json({ orderId: ref.id, ...totals });
  } catch (error) {
    sendApiError(
      res,
      context,
      new AppError("ORDER_CREATION_FAILED", {
        cause: error,
        technicalMessage: "Falha ao persistir o pedido",
      }),
      { userId: uid, itemCount: items.length },
    );
  }
}

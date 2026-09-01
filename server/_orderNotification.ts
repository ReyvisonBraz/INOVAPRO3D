// Origem única da verdade para a notificação de novo pedido, compartilhada
// pelo Express (server.ts) e pela função serverless da Vercel
// (api/notify/new-order.ts).
//
// Princípio de segurança desta camada: nada que sai em e-mail ou no Telegram
// pode vir do corpo da requisição. Identidade vem do token verificado; total e
// quantidade vêm do pedido gravado pelo servidor; e o chamador precisa provar
// ser o dono daquele pedido.
//
// Sem isso o endpoint funcionava como relay: qualquer um escolhia destinatário
// e conteúdo, e o e-mail saía assinado pelo nosso domínio verificado.

import { escapeHtml } from "./_escapeHtml.js";

export interface TrustedIdentity {
  email: string | null;
  name: string | null;
}

export interface DecodedIdentity {
  email?: string;
  emailVerified?: boolean;
  name?: string;
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 160);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, 254);
}

/** Retorna apenas o e-mail cuja verificação foi comprovada pelo token atual. */
export function resolveVerifiedEmail(decoded: DecodedIdentity): string | null {
  if (decoded.emailVerified !== true || typeof decoded.email !== "string") return null;
  return normalizeEmail(decoded.email) || null;
}

/**
 * Identidade confiável do usuário: e-mail só é aceito quando o provedor marcou
 * explicitamente a claim como verificada. O perfil em `users/{uid}` serve de
 * fallback apenas para o nome, pois o cliente pode editar o perfil e uma conta
 * sem e-mail verificado não pode transformar esse campo em destinatário.
 */
export async function resolveTrustedIdentity(
  db: FirebaseFirestore.Firestore,
  uid: string,
  decoded: DecodedIdentity,
): Promise<TrustedIdentity> {
  const email = resolveVerifiedEmail(decoded);
  let name = typeof decoded.name === "string" ? normalizeName(decoded.name) : null;

  if (!name) {
    try {
      const profile = (await db.collection("users").doc(uid).get()).data();
      if (typeof profile?.name === "string") name = normalizeName(profile.name);
    } catch {
      /* perfil indisponível — seguimos com o que o token trouxe */
    }
  }

  return { email, name: name || null };
}

export interface OrderNotificationCaller extends TrustedIdentity {
  uid: string;
}

export interface OrderNotificationData {
  orderId: string;
  customerName: string;
  customerEmail: string | null;
  total: number;
  itemCount: number;
  paymentMethod: string;
}

export type OrderNotificationLookup =
  | { ok: true; data: OrderNotificationData }
  | { ok: false; status: 400 | 403 | 404 | 422 | 503; error: string };

/**
 * Carrega o pedido e confirma que `caller.uid` é o dono. Valores comerciais
 * vêm do documento; nome e destinatário vêm da identidade verificada atual.
 */
export async function loadOrderForNotification(
  db: FirebaseFirestore.Firestore,
  orderId: unknown,
  caller: OrderNotificationCaller,
): Promise<OrderNotificationLookup> {
  if (typeof orderId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(orderId)) {
    return { ok: false, status: 400, error: "orderId inválido." };
  }

  let snapshot: FirebaseFirestore.DocumentSnapshot;
  try {
    snapshot = await db.collection("orders").doc(orderId).get();
  } catch {
    return { ok: false, status: 503, error: "Não foi possível consultar o pedido." };
  }
  if (!snapshot.exists) {
    return { ok: false, status: 404, error: "Pedido não encontrado." };
  }

  const order = snapshot.data()!;
  if (order.userId !== caller.uid) {
    return { ok: false, status: 403, error: "Acesso negado." };
  }

  const total = Number(order.total);
  if (
    !Number.isFinite(total) ||
    total <= 0 ||
    !Array.isArray(order.items) ||
    order.items.length < 1
  ) {
    return { ok: false, status: 422, error: "Pedido possui dados inválidos." };
  }

  return {
    ok: true,
    data: {
      orderId,
      customerName: caller.name || "",
      customerEmail: caller.email,
      total,
      itemCount: order.items.length,
      paymentMethod: typeof order.paymentMethod === "string" ? order.paymentMethod : "manual",
    },
  };
}

const PAYMENT_LABELS: Record<string, string> = {
  stripe: "Stripe (cartão/PIX)",
  pix_manual: "PIX Manual",
  mercadopago: "Mercado Pago (PIX)",
  manual: "Combinado com o cliente",
};

function brl(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

/**
 * Monta a mensagem do Telegram. O canal usa `parse_mode: "HTML"`, então todo
 * valor interpolado passa por escape — inclusive os que vêm do Firestore, que
 * um dia foram digitados por alguém.
 */
export function buildOrderTelegramMessage(data: OrderNotificationData, appUrl: string): string {
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" });
  const label = PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod;
  const base = (appUrl || "https://www.inovapro3d.com.br").replace(/\/+$/, "");

  return (
    `🛍️ <b>Novo Pedido — INOVAPRO3D</b>\n\n` +
    `👤 Cliente: ${escapeHtml(data.customerName || "Não informado")}\n` +
    `📧 ${escapeHtml(data.customerEmail || "—")}\n` +
    `💰 Valor: R$ ${escapeHtml(brl(data.total))}\n` +
    `📦 Itens: ${data.itemCount}\n` +
    `💳 Pagamento: ${escapeHtml(label)}\n` +
    `🔑 Pedido: <code>${escapeHtml(data.orderId)}</code>\n` +
    `📅 ${escapeHtml(now)}\n` +
    `🔗 <a href="${escapeHtml(base)}/admin">Ver painel</a>`
  );
}

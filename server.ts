import dotenv from "dotenv";
// Variáveis fornecidas pelo processo/hospedagem têm precedência. Carregar o
// arquivo local primeiro também permite que ele sobrescreva o .env sem jamais
// trocar NODE_ENV=production por um valor salvo em disco.
dotenv.config({ path: ".env.local" });
dotenv.config();
import express from "express";
import { existsSync, readFileSync } from "node:fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { isTrustedCspDocument, parseCspReportPayload } from "./server/_cspReport.ts";
import { recordCspReports } from "./server/_cspReportRecorder.ts";
import { createRequestContext } from "./server/_observability/context.ts";
import { readModelMetadata, isAllowedImportHost } from "./server/_modelMetadata.ts";
import { getAdminDb, getAdminAuth, isAdminSdkConfigured } from "./server/firebaseAdmin.ts";
import { verifyAdminRequest } from "./server/_adminAuth.ts";
import { checkRateLimit, clientIp } from "./server/_rateLimit.ts";
import { buildErrorReport } from "./server/_reportError.ts";
import {
  buildSitemapXml,
  siteBaseUrl,
  SITEMAP_STATIC_PATHS,
  type SitemapUrl,
} from "./server/_sitemap.ts";
import { sendEmail } from "./server/_email.ts";
import { orderConfirmationEmail } from "./server/_emailTemplates.ts";
import {
  computeOrderTotal,
  type OrderLineInput,
  type ProductRecord,
  type MaterialRecord,
} from "./server/_orderPricing.ts";
import { calculatePixTotal, DEFAULT_PIX_DISCOUNT_PERCENT } from "./shared/commercePricing.ts";
import { extractSlicerImageWithGemini } from "./server/_slicerImage.ts";
import {
  buildOrderTelegramMessage,
  loadOrderForNotification,
  resolveTrustedIdentity,
  resolveVerifiedEmail,
} from "./server/_orderNotification.ts";
import { resolveServerRuntime } from "./server/_serverRuntime.ts";
import {
  buildCspPolicy,
  CSP_REPORT_PATH,
  reportingEndpointsHeader,
} from "./shared/security/cspPolicy.ts";

// ── Image proxy host allowlist ─────────────────────────────────────────────
// Model-import hosts plus the CDNs they serve images from.
const IMAGE_PROXY_EXTRA_HOSTS = (
  process.env.IMAGE_PROXY_ALLOWED_HOSTS ||
  "bblmw.com,bblmw.cn,thingiverse.com,printables.com,prusa3d.com,cults3d.com,myminifactory.com"
)
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (isAllowedImportHost(host)) return true;
  return IMAGE_PROXY_EXTRA_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

// ── Rate limiter compartilhado (persistido no Firestore) ───────────────────
// A chave é o path da rota — cada `app.x("/api/rota", rateLimit(n), ...)"
// continua isolado dos demais, igual ao `Map` que este código substituiu.
// Ver server/_rateLimit.ts para por que o contador não pode mais viver só na
// memória do processo.
function rateLimit(maxPerMinute: number) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      req.path,
      clientIp(req),
      maxPerMinute,
    );
    if (!allowed) {
      res.setHeader("Retry-After", String(retryAfterSeconds || 60));
      res.status(429).json({ error: "Muitas requisições. Tente novamente em instantes." });
      return;
    }
    next();
  };
}

// ── Telegram helper ────────────────────────────────────────────────────────
async function sendTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
  } catch {
    /* silent — notification failure must never break the order flow */
  }
}

// ── Firebase token verification middleware ─────────────────────────────────
// Falha SEMPRE fechado: sem token válido, `null`. A versão anterior devolvia a
// string "unchecked" quando o Admin SDK não estava configurado — e como toda
// rota testava apenas `if (!uid)`, uma string não-vazia passava. Bastava uma
// variável de ambiente ausente (typo, rotação de chave, deploy incompleto) para
// desligar a autenticação do servidor inteiro em silêncio.
async function verifyToken(req: express.Request): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(header.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}

/** Igual a `verifyToken`, mas devolve também os claims usados como identidade. */
async function verifyTokenWithClaims(req: express.Request): Promise<{
  uid: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
} | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(header.slice(7));
    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified === true,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const distPath = path.join(process.cwd(), "dist");
  const runtime = resolveServerRuntime({
    nodeEnv: process.env.NODE_ENV,
    serveStatic: process.env.SERVE_STATIC,
    args: process.argv.slice(2),
    distExists: existsSync(path.join(distPath, "index.html")),
  });

  // Mantém bibliotecas e diagnósticos alinhados ao modo efetivo. Isso é
  // especialmente importante quando `npm start` seleciona produção pelo flag
  // explícito, sem depender de sintaxe de variável de ambiente do shell.
  process.env.NODE_ENV = runtime.mode;
  console.log(`[runtime] modo=${runtime.mode} origem=${runtime.source}`);
  runtime.warnings.forEach((warning) => console.warn(`[runtime] aviso: ${warning}`));

  // Stripe webhook needs raw body — register BEFORE express.json()
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (stripeSecret) {
    const StripeLib = (await import("stripe")).default;
    const stripe = new StripeLib(stripeSecret);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // ── Create Payment Intent ──────────────────────────────────
    // Auth required. Amount is read server-side from the order document,
    // never trusted from the client body.
    app.post(
      "/api/stripe/create-payment-intent",
      rateLimit(10),
      express.json(),
      async (req, res) => {
        const auth = await verifyTokenWithClaims(req);
        if (!auth) {
          res.status(401).json({ error: "Não autorizado." });
          return;
        }

        const { orderId } = req.body as { orderId?: string };
        if (!orderId) {
          res.status(400).json({ error: "orderId é obrigatório" });
          return;
        }

        // Sem Admin SDK não há como ler o total real do pedido. Recusa
        // explícita: o fallback anterior aceitava `amount` do corpo da
        // requisição, o que permitia fechar qualquer pedido pelo valor que o
        // cliente quisesse.
        if (!isAdminSdkConfigured()) {
          res.status(503).json({ error: "Pagamento indisponível (servidor não configurado)." });
          return;
        }

        let amount: number;
        try {
          const orderSnap = await getAdminDb().collection("orders").doc(orderId).get();
          if (!orderSnap.exists) {
            res.status(404).json({ error: "Pedido não encontrado." });
            return;
          }
          const order = orderSnap.data()!;
          if (order.userId !== auth.uid) {
            res.status(403).json({ error: "Acesso negado." });
            return;
          }
          amount = Number(order.total);
          if (!Number.isFinite(amount) || amount <= 0) {
            res.status(400).json({ error: "Total do pedido inválido." });
            return;
          }
        } catch {
          res.status(500).json({ error: "Erro ao verificar pedido." });
          return;
        }

        try {
          const receiptEmail = resolveVerifiedEmail(auth);
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: "brl",
            payment_method_types: ["card", "pix"],
            ...(receiptEmail ? { receipt_email: receiptEmail } : {}),
            metadata: { orderId, platform: "inovapro3d" },
          });
          res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
          });
        } catch (err: unknown) {
          res.status(400).json({ error: err instanceof Error ? err.message : "Erro desconhecido" });
        }
      },
    );

    // ── Webhook ────────────────────────────────────────────────
    app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
      if (!webhookSecret) {
        res.status(400).send("Webhook secret não configurado");
        return;
      }
      const sig = req.headers["stripe-signature"] as string;
      let event: ReturnType<typeof stripe.webhooks.constructEvent>;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: unknown) {
        res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : err}`);
        return;
      }
      const obj = event.data.object as { metadata?: { orderId?: string }; amount?: number };
      const orderId = obj.metadata?.orderId;
      if (event.type === "payment_intent.succeeded" && orderId) {
        const amountBRL = obj.amount
          ? (obj.amount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
          : "?";
        // Mark order PAID in Firestore (Admin SDK bypasses security rules)
        try {
          await getAdminDb().collection("orders").doc(orderId).update({
            status: "PAID",
            paidAt: new Date(),
          });
        } catch (err) {
          console.error("[webhook] Falha ao marcar pedido PAID:", orderId, err);
        }
        await sendTelegram(
          `✅ <b>Pagamento Confirmado — INOVAPRO3D</b>\n\n` +
            `💳 Método: Stripe\n` +
            `💰 Valor: R$ ${amountBRL}\n` +
            `🔑 Pedido: <code>${orderId}</code>`,
        );
      }
      res.json({ received: true });
    });
  }

  app.post(
    "/api/calculator/extract-slicer",
    rateLimit(12),
    express.json({ limit: "5mb" }),
    async (req, res) => {
      const uid = await verifyToken(req);
      if (!uid) {
        res.status(403).json({ error: "Apenas administradores podem ler recortes." });
        return;
      }
      // Checagem incondicional: antes ela era pulada quando o token vinha do
      // atalho de desenvolvimento, deixando a cota da API Gemini aberta.
      try {
        const user = await getAdminDb().collection("users").doc(uid).get();
        if (user.data()?.role !== "ADMIN") {
          res.status(403).json({ error: "Apenas administradores podem ler recortes." });
          return;
        }
      } catch {
        res.status(403).json({ error: "Não foi possível validar sua sessão." });
        return;
      }

      const imageData = typeof req.body?.imageData === "string" ? req.body.imageData : "";
      const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType : "";
      if (
        !imageData ||
        imageData.length > 4_000_000 ||
        !["image/png", "image/jpeg", "image/webp"].includes(mimeType)
      ) {
        res.status(400).json({ error: "Imagem inválida ou muito grande." });
        return;
      }
      try {
        res.json(await extractSlicerImageWithGemini({ imageData, mimeType }));
      } catch (error) {
        if (error instanceof Error && error.message === "GEMINI_NOT_CONFIGURED") {
          res.status(503).json({ error: "Leitura de imagem ainda não configurada no servidor." });
          return;
        }
        console.error("[extract-slicer] falha na leitura:", error);
        res.status(502).json({ error: "Não foi possível interpretar o recorte. Tente novamente." });
      }
    },
  );

  // O navegador pode usar o formato legado ou a Reporting API moderna.
  // Esta rota vem antes do parser JSON global para impor um limite próprio e
  // aceitar os media types específicos de CSP.
  app.post(
    CSP_REPORT_PATH,
    rateLimit(60),
    (req, res, next) => {
      const contentType = req.headers["content-type"]?.split(";", 1)[0].toLowerCase();
      if (
        !contentType ||
        !["application/csp-report", "application/reports+json", "application/json"].includes(
          contentType,
        )
      ) {
        res.status(415).end();
        return;
      }
      next();
    },
    express.json({
      limit: "32kb",
      type: ["application/csp-report", "application/reports+json", "application/json"],
    }),
    async (req, res) => {
      const context = createRequestContext(req, "security", "csp-report");
      res.setHeader("Cache-Control", "no-store");
      const reports = parseCspReportPayload(req.body);
      if (reports.length === 0) {
        res.status(400).end();
        return;
      }

      const additionalHosts = [
        process.env.APP_URL,
        process.env.VERCEL_URL,
        ...(!runtime.isProduction ? ["localhost", "127.0.0.1"] : []),
      ].filter((value): value is string => !!value);
      const trustedReports = reports.filter((report) =>
        isTrustedCspDocument(report, additionalHosts),
      );
      if (trustedReports.length > 0) await recordCspReports(trustedReports, context);
      res.status(204).end();
    },
  );

  app.use(express.json());

  // ── Criação de pedido com preço recalculado no servidor ───────────────────
  // O cliente envia SÓ itens e quantidades. O total é recomputado do catálogo
  // (Admin SDK bypassa as regras). Fecha a manipulação de preço via localStorage.
  app.post("/api/orders/create", rateLimit(10), async (req, res) => {
    if (!isAdminSdkConfigured()) {
      // Sem Admin SDK não há recálculo confiável — recusa explícita (evita fallback inseguro).
      res.status(503).json({ error: "Criação de pedido indisponível (servidor não configurado)." });
      return;
    }
    const auth = await verifyTokenWithClaims(req);
    if (!auth) {
      res.status(401).json({ error: "Não autorizado." });
      return;
    }
    const uid = auth.uid;

    // `userName`/`userEmail` do corpo são ignorados de propósito — ver
    // server/_orderNotification.ts. A identidade vem do token verificado.
    const body = req.body as {
      items?: OrderLineInput[];
      phone?: unknown;
    };
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
      const identity = await resolveTrustedIdentity(adminDb, uid, auth);
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
      res.json({ orderId: ref.id, ...totals });
    } catch {
      res.status(500).json({ error: "Erro ao criar pedido." });
    }
  });

  // ── New order notification ─────────────────────────────────────────────────
  // Espelha api/notify/new-order.ts (runtime de produção na Vercel). O corpo
  // carrega apenas `orderId`: identidade vem do token e valores vêm do pedido;
  // o chamador precisa ser o dono dele. Aceitar esses campos do corpo
  // fazia da rota um relay de e-mail com a reputação do nosso domínio.
  app.post("/api/notify/new-order", rateLimit(5), async (req, res) => {
    if (!isAdminSdkConfigured()) {
      res.status(503).json({ error: "Serviço indisponível." });
      return;
    }
    const auth = await verifyTokenWithClaims(req);
    if (!auth) {
      res.status(401).json({ error: "Não autorizado." });
      return;
    }

    const adminDb = getAdminDb();
    const identity = await resolveTrustedIdentity(adminDb, auth.uid, auth);
    const lookup = await loadOrderForNotification(adminDb, req.body?.orderId, {
      uid: auth.uid,
      ...identity,
    });
    if (!lookup.ok) {
      res.status(lookup.status).json({ error: lookup.error });
      return;
    }
    const order = lookup.data;
    const appUrl = process.env.APP_URL || "https://www.inovapro3d.com.br";

    await sendTelegram(buildOrderTelegramMessage(order, appUrl));

    // E-mail de confirmação para o cliente (SendPulse). No-op se não configurado.
    if (order.customerEmail) {
      const mail = orderConfirmationEmail({
        orderId: order.orderId,
        customerName: order.customerName,
        total: order.total,
        paymentMethod: order.paymentMethod,
        appUrl,
      });
      await sendEmail({
        to: order.customerEmail,
        toName: order.customerName,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
    }

    res.json({ sent: true });
  });

  // ── Mercado Pago - Process Payment ─────────────────────────────────────────
  app.post("/api/mercadopago/process-payment", rateLimit(10), async (req, res) => {
    if (process.env.MERCADOPAGO_ENABLED !== "true") {
      res.status(503).json({ error: "Pagamento indisponível no momento." });
      return;
    }

    const auth = await verifyTokenWithClaims(req);
    if (!auth) {
      res.status(401).json({ error: "Não autorizado." });
      return;
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      res.status(503).json({ error: "Pagamento não configurado." });
      return;
    }

    const { orderId, paymentMethod = "pix" } = req.body as {
      orderId?: string;
      paymentMethod?: "pix";
    };

    if (!orderId || paymentMethod !== "pix") {
      res.status(400).json({ error: "orderId e pagamento Pix são obrigatórios." });
      return;
    }

    try {
      const { processPayment } = await import("./server/mercadopago/_service.js");
      const result = await processPayment({
        orderId,
        paymentMethod,
        userId: auth.uid,
        verifiedPayerEmail: resolveVerifiedEmail(auth) ?? undefined,
      });

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        paymentId: result.paymentId,
        status: result.status,
        statusDetail: result.statusDetail,
        qrCodeBase64: result.qrCodeBase64,
        qrCodeUrl: result.qrCodeUrl,
        pixCode: result.pixCode,
        expiresAt: result.expiresAt,
        attemptNumber: result.attemptNumber,
      });
    } catch (error) {
      console.error("[mercadopago] Erro ao processar pagamento:", error);
      const message = error instanceof Error ? error.message : "Erro ao processar pagamento";
      res.status(500).json({ error: message });
    }
  });

  // ── Mercado Pago - Webhook ─────────────────────────────────────────────────
  app.post("/api/mercadopago/webhook", async (req, res) => {
    if (!isAdminSdkConfigured()) {
      res.status(503).json({ error: "Serviço indisponível." });
      return;
    }

    const queryDataId = req.query["data.id"];
    const paymentId = String(queryDataId ?? req.body?.data?.id ?? "");
    if (!paymentId) {
      res.status(200).json({ received: true, outcome: "ignored" });
      return;
    }

    const { validateWebhookSignature } = await import("./server/mercadopago/_webhook.js");
    const validation = validateWebhookSignature({
      signature: req.header("x-signature"),
      requestId: req.header("x-request-id"),
      dataId: paymentId,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
    });
    if (!validation.valid) {
      res.status(401).json({ error: "Assinatura inválida." });
      return;
    }

    try {
      const { processPaymentWebhook } = await import("./server/mercadopago/_webhookService.js");
      const outcome = await processPaymentWebhook({
        paymentId,
        action: req.body?.action,
        type: req.body?.type,
      });
      res.status(200).json({ received: true, outcome });
    } catch (error) {
      console.error("[mercadopago-webhook] Erro:", error);
      res.status(500).json({ error: "Erro ao processar webhook." });
    }
  });

  // ── Mercado Pago - Payment Status ──────────────────────────────────────────
  // O espelho serverless (api/mercadopago/payment-status.ts) já limitava a
  // 30/min; esta rota nunca teve limite nenhum.
  app.get("/api/mercadopago/payment-status", rateLimit(30), async (req, res) => {
    const uid = await verifyToken(req);
    if (!uid) {
      res.status(401).json({ error: "Não autorizado." });
      return;
    }

    const orderId = req.query.orderId as string;
    if (!orderId) {
      res.status(400).json({ error: "orderId é obrigatório." });
      return;
    }

    const adminDb = getAdminDb();
    const orderDoc = await adminDb.collection("orders").doc(orderId).get();

    if (!orderDoc.exists) {
      res.status(404).json({ error: "Pedido não encontrado." });
      return;
    }

    const order = orderDoc.data()!;
    if (order.userId !== uid) {
      res.status(403).json({ error: "Você não tem permissão para consultar este pedido." });
      return;
    }

    res.status(200).json({
      orderId,
      paymentStatus: order.paymentStatus || "NOT_STARTED",
      paymentProvider: order.paymentProvider || "manual",
      paymentProviderStatus: order.paymentProviderStatus,
      paymentProviderStatusDetail: order.paymentProviderStatusDetail,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt,
      paymentUpdatedAt: order.paymentUpdatedAt,
    });
  });

  // ── Relato de erro (automático + reportado pelo usuário) ───────────────────
  // Sem auth (erros acontecem para visitantes anônimos), mas com rate limit.
  app.post("/api/report-error", rateLimit(20), async (req, res) => {
    try {
      const { valid, data, telegramText } = buildErrorReport(req.body || {});
      if (!valid) {
        res.status(400).json({ id: null });
        return;
      }
      let id: string | null = null;
      if (isAdminSdkConfigured()) {
        try {
          const ref = await getAdminDb().collection("errorReports").add(data);
          id = ref.id;
        } catch (err) {
          console.error("[report-error] falha ao gravar no Firestore:", err);
        }
      }
      await sendTelegram(telegramText + (id ? `🔑 <code>${id}</code>` : ""));
      res.json({ id });
    } catch {
      res.json({ id: null });
    }
  });

  // ── Sitemap dinâmico (produtos + rotas estáticas) ──────────────────────────
  app.get("/sitemap.xml", async (_req, res) => {
    const base = siteBaseUrl();
    const urls: SitemapUrl[] = SITEMAP_STATIC_PATHS.map((p) => ({ loc: base + p }));
    try {
      if (isAdminSdkConfigured()) {
        const snap = await getAdminDb().collection("products").get();
        snap.forEach((doc) => {
          const d = doc.data() as { active?: boolean; updatedAt?: { toDate?: () => Date } };
          if (d.active === false) return;
          let lastmod: string | undefined;
          try {
            lastmod = d.updatedAt?.toDate?.().toISOString();
          } catch {
            /* ignora */
          }
          urls.push({ loc: `${base}/produto/${doc.id}`, lastmod });
        });
      }
    } catch (err) {
      console.error("[sitemap] falha ao listar produtos:", err);
    }
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.send(buildSitemapXml(urls));
  });

  // Status and diagnostics endpoint.
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "online",
      timestamp: new Date().toISOString(),
      environment: runtime.mode,
      checks: {
        firebase: "pending",
        storage: "online",
        memoryUsage: process.memoryUsage(),
      },
    });
  });

  // Proxy external images so the browser can load them CORS-safely for canvas
  // conversion. Admin-only: só é chamado por src/lib/adminHelpers.tsx, do
  // painel de produtos. Anônimo, era uma rota de fetch arbitrário — o
  // servidor buscava qualquer URL https de host permitido e devolvia o
  // corpo, sem revalidar o destino final após redirect.
  app.get("/api/proxy-image", rateLimit(60), async (req, res) => {
    if (!(await verifyAdminRequest(req))) {
      res.status(403).json({ error: "Apenas administradores podem usar o proxy de imagens." });
      return;
    }
    const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!rawUrl) {
      res.status(400).json({ error: "url obrigatória" });
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: "url inválida" });
      return;
    }
    if (parsed.protocol !== "https:") {
      res.status(400).json({ error: "protocolo inválido" });
      return;
    }
    if (!isAllowedImageHost(parsed.hostname)) {
      res.status(403).json({ error: "host não permitido" });
      return;
    }
    try {
      const upstream = await fetch(rawUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; INOVAPRO3D/1.0; +https://inovapro3d.com)",
        },
        redirect: "follow",
      });
      if (!upstream.ok) {
        res.status(upstream.status).json({ error: "upstream error" });
        return;
      }
      const contentType = upstream.headers.get("content-type") || "image/jpeg";
      if (!contentType.startsWith("image/")) {
        res.status(415).json({ error: "não é imagem" });
        return;
      }
      const MAX_BYTES = 15 * 1024 * 1024;
      const contentLength = Number(upstream.headers.get("content-length") || 0);
      if (contentLength > MAX_BYTES) {
        res.status(413).json({ error: "imagem grande demais" });
        return;
      }
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=3600");
      const buf = Buffer.from(await upstream.arrayBuffer());
      if (buf.byteLength > MAX_BYTES) {
        res.status(413).json({ error: "imagem grande demais" });
        return;
      }
      res.send(buf);
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : "erro ao buscar imagem" });
    }
  });

  // Admin-only: só é chamado por src/pages/admin/hooks/useProductAdmin.ts, ao
  // importar um modelo por link. Anônimo, era um proxy de leitura de URL
  // aberto a qualquer visitante, com o mesmo problema de redirect não
  // revalidado do /api/proxy-image acima.
  app.get("/api/model-metadata", rateLimit(20), async (req, res) => {
    if (!(await verifyAdminRequest(req))) {
      res.status(403).json({ error: "Apenas administradores podem importar links de modelo." });
      return;
    }
    const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";

    try {
      const result = await readModelMetadata(rawUrl);
      res.status(result.status).json(result.body);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Nao foi possivel importar este link.",
      });
    }
  });

  if (!runtime.isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Paridade com vercel.ts para quando o app é auto-hospedado (npm start).
    // A política é deliberadamente Report-Only nesta etapa: os relatos reais
    // serão analisados antes de autorizar qualquer bloqueio em produção.
    const cspReportOnly = buildCspPolicy(readFileSync(path.join(distPath, "index.html"), "utf8"));
    let reportingEndpoint = reportingEndpointsHeader();
    try {
      if (process.env.APP_URL) {
        reportingEndpoint = reportingEndpointsHeader(
          new URL(CSP_REPORT_PATH, process.env.APP_URL).href,
        );
      }
    } catch {
      console.warn("[csp] APP_URL não é um endpoint HTTPS válido; usando o coletor de produção.");
    }
    app.use((_req, res, next) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
      res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
      res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(self)",
      );
      res.setHeader("Reporting-Endpoints", reportingEndpoint);
      res.setHeader("Content-Security-Policy-Report-Only", cspReportOnly);
      next();
    });
    app.use(
      express.static(distPath, {
        setHeaders(res, filePath) {
          if (
            filePath.includes(`${path.sep}assets${path.sep}`) ||
            filePath.includes(`${path.sep}catalogo${path.sep}`)
          ) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
          }
        },
      }),
    );
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `INOVAPRO3D server running at http://localhost:${PORT} (${runtime.mode}, ${runtime.source})`,
    );
  });
}

startServer().catch((error) => {
  console.error("[startup] Não foi possível iniciar o servidor:", error);
  process.exitCode = 1;
});

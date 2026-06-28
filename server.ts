import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { readModelMetadata, isAllowedImportHost } from "./api/_modelMetadata.ts";
import { getAdminDb, getAdminAuth, isAdminSdkConfigured } from "./api/firebaseAdmin.ts";
import { buildErrorReport } from "./api/_reportError.ts";
import { buildSitemapXml, siteBaseUrl, SITEMAP_STATIC_PATHS, type SitemapUrl } from "./api/_sitemap.ts";

// ── Image proxy host allowlist ─────────────────────────────────────────────
// Model-import hosts plus the CDNs they serve images from.
const IMAGE_PROXY_EXTRA_HOSTS = (process.env.IMAGE_PROXY_ALLOWED_HOSTS || "bblmw.com,bblmw.cn,thingiverse.com,printables.com,prusa3d.com,cults3d.com,myminifactory.com")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (isAllowedImportHost(host)) return true;
  return IMAGE_PROXY_EXTRA_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

// ── Simple in-memory rate limiter (per IP per route) ───────────────────────
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxPerMinute: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${req.path}:${req.ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
      next();
      return;
    }
    bucket.count++;
    if (bucket.count > maxPerMinute) {
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
  } catch { /* silent — notification failure must never break the order flow */ }
}

// ── Firebase token verification middleware ─────────────────────────────────
async function verifyToken(req: express.Request): Promise<string | null> {
  if (!isAdminSdkConfigured()) return 'unchecked'; // dev fallback — not enforced
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(header.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe webhook needs raw body — register BEFORE express.json()
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (stripeSecret) {
    const StripeLib = (await import('stripe')).default;
    const stripe = new StripeLib(stripeSecret);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // ── Create Payment Intent ──────────────────────────────────
    // Auth required. Amount is read server-side from the order document,
    // never trusted from the client body.
    app.post('/api/stripe/create-payment-intent', rateLimit(10), express.json(), async (req, res) => {
      const uid = await verifyToken(req);
      if (!uid) { res.status(401).json({ error: 'Não autorizado.' }); return; }

      const { orderId, customerEmail } = req.body as { orderId: string; customerEmail?: string };
      if (!orderId) { res.status(400).json({ error: 'orderId é obrigatório' }); return; }

      let amount: number;
      try {
        if (isAdminSdkConfigured()) {
          const orderSnap = await getAdminDb().collection('orders').doc(orderId).get();
          if (!orderSnap.exists) { res.status(404).json({ error: 'Pedido não encontrado.' }); return; }
          const order = orderSnap.data()!;
          // Ensure the caller owns the order (skip for dev unchecked)
          if (uid !== 'unchecked' && order.userId !== uid) {
            res.status(403).json({ error: 'Acesso negado.' }); return;
          }
          amount = Number(order.total);
          if (!Number.isFinite(amount) || amount <= 0) {
            res.status(400).json({ error: 'Total do pedido inválido.' }); return;
          }
        } else {
          // Admin SDK not configured — fall back to client amount (dev only)
          amount = Number(req.body.amount);
          if (!amount) { res.status(400).json({ error: 'amount obrigatório (dev mode)' }); return; }
        }
      } catch (err) {
        res.status(500).json({ error: 'Erro ao verificar pedido.' }); return;
      }

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: 'brl',
          payment_method_types: ['card', 'pix'],
          receipt_email: customerEmail,
          metadata: { orderId, platform: 'inovapro3d' },
        });
        res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
      } catch (err: unknown) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erro desconhecido' });
      }
    });

    // ── Webhook ────────────────────────────────────────────────
    app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
      if (!webhookSecret) { res.status(400).send('Webhook secret não configurado'); return; }
      const sig = req.headers['stripe-signature'] as string;
      let event: ReturnType<typeof stripe.webhooks.constructEvent>;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: unknown) {
        res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : err}`);
        return;
      }
      const obj = event.data.object as { metadata?: { orderId?: string }; amount?: number };
      const orderId = obj.metadata?.orderId;
      if (event.type === 'payment_intent.succeeded' && orderId) {
        const amountBRL = obj.amount ? (obj.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '?';
        // Mark order PAID in Firestore (Admin SDK bypasses security rules)
        try {
          await getAdminDb().collection('orders').doc(orderId).update({
            status: 'PAID',
            paidAt: new Date(),
          });
        } catch (err) {
          console.error('[webhook] Falha ao marcar pedido PAID:', orderId, err);
        }
        await sendTelegram(
          `✅ <b>Pagamento Confirmado — INOVAPRO3D</b>\n\n` +
          `💳 Método: Stripe\n` +
          `💰 Valor: R$ ${amountBRL}\n` +
          `🔑 Pedido: <code>${orderId}</code>`
        );
      }
      res.json({ received: true });
    });
  }

  app.use(express.json());

  // ── New order notification ─────────────────────────────────────────────────
  // Auth required to prevent Telegram spam from unauthenticated callers.
  app.post('/api/notify/new-order', rateLimit(5), async (req, res) => {
    const uid = await verifyToken(req);
    if (!uid) { res.status(401).json({ error: 'Não autorizado.' }); return; }

    const { orderId, customerName, customerEmail, total, itemCount, paymentMethod } = req.body as {
      orderId: string; customerName: string; customerEmail: string;
      total: number; itemCount: number; paymentMethod: string;
    };
    if (!orderId) { res.status(400).json({ error: 'orderId obrigatório' }); return; }

    const methodLabel: Record<string, string> = {
      stripe: 'Stripe (cartão/PIX)',
      pix_manual: 'PIX Manual',
    };
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Belem' });
    const totalFmt = (total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    await sendTelegram(
      `🛍️ <b>Novo Pedido — INOVAPRO3D</b>\n\n` +
      `👤 Cliente: ${customerName || 'Não informado'}\n` +
      `📧 ${customerEmail || '—'}\n` +
      `💰 Valor: R$ ${totalFmt}\n` +
      `📦 Itens: ${itemCount ?? '?'}\n` +
      `💳 Pagamento: ${methodLabel[paymentMethod] ?? paymentMethod}\n` +
      `🔑 Pedido: <code>${orderId}</code>\n` +
      `📅 ${now}`
    );
    res.json({ sent: true });
  });

  // ── Relato de erro (automático + reportado pelo usuário) ───────────────────
  // Sem auth (erros acontecem para visitantes anônimos), mas com rate limit.
  app.post('/api/report-error', rateLimit(20), async (req, res) => {
    try {
      const { valid, data, telegramText } = buildErrorReport(req.body || {});
      if (!valid) { res.status(400).json({ id: null }); return; }
      let id: string | null = null;
      if (isAdminSdkConfigured()) {
        try {
          const ref = await getAdminDb().collection('errorReports').add(data);
          id = ref.id;
        } catch (err) {
          console.error('[report-error] falha ao gravar no Firestore:', err);
        }
      }
      await sendTelegram(telegramText + (id ? `🔑 <code>${id}</code>` : ''));
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
          try { lastmod = d.updatedAt?.toDate?.().toISOString(); } catch { /* ignora */ }
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
      environment: process.env.NODE_ENV || "development",
      checks: {
        firebase: "pending",
        storage: "online",
        memoryUsage: process.memoryUsage(),
      },
    });
  });

  // Proxy external images so the browser can load them CORS-safely for canvas conversion
  app.get("/api/proxy-image", rateLimit(60), async (req, res) => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!rawUrl) { res.status(400).json({ error: "url obrigatória" }); return; }
    let parsed: URL;
    try { parsed = new URL(rawUrl); } catch { res.status(400).json({ error: "url inválida" }); return; }
    if (parsed.protocol !== "https:") { res.status(400).json({ error: "protocolo inválido" }); return; }
    if (!isAllowedImageHost(parsed.hostname)) { res.status(403).json({ error: "host não permitido" }); return; }
    try {
      const upstream = await fetch(rawUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; INOVAPRO3D/1.0; +https://inovapro3d.com)" },
        redirect: "follow",
      });
      if (!upstream.ok) { res.status(upstream.status).json({ error: "upstream error" }); return; }
      const contentType = upstream.headers.get("content-type") || "image/jpeg";
      if (!contentType.startsWith("image/")) { res.status(415).json({ error: "não é imagem" }); return; }
      const MAX_BYTES = 15 * 1024 * 1024;
      const contentLength = Number(upstream.headers.get("content-length") || 0);
      if (contentLength > MAX_BYTES) { res.status(413).json({ error: "imagem grande demais" }); return; }
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=3600");
      const buf = Buffer.from(await upstream.arrayBuffer());
      if (buf.byteLength > MAX_BYTES) { res.status(413).json({ error: "imagem grande demais" }); return; }
      res.send(buf);
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : "erro ao buscar imagem" });
    }
  });

  app.get("/api/model-metadata", async (req, res) => {
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

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`INOVAPRO3D server running at http://localhost:${PORT}`);
  });
}

startServer();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { readModelMetadata } from "./api/_modelMetadata.ts";

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
    app.post('/api/stripe/create-payment-intent', express.json(), async (req, res) => {
      const { amount, orderId, customerEmail } = req.body as {
        amount: number; orderId: string; customerEmail?: string;
      };
      if (!amount || !orderId) {
        res.status(400).json({ error: 'amount e orderId são obrigatórios' });
        return;
      }
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // centavos
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
    app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
      if (!webhookSecret) { res.status(400).send('Webhook secret não configurado'); return; }
      const sig = req.headers['stripe-signature'] as string;
      let event: ReturnType<typeof stripe.webhooks.constructEvent>;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: unknown) {
        res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : err}`);
        return;
      }
      // Log event — Firestore update via Firebase Admin SDK can be added here
      const orderId = (event.data.object as { metadata?: { orderId?: string } }).metadata?.orderId;
      console.log(`Stripe: ${event.type} | order: ${orderId ?? 'n/a'}`);
      res.json({ received: true });
    });
  }

  app.use(express.json());

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

  // Lightweight diagnostics for the admin/debug UI.
  app.get("/api/debug/markers", (_req, res) => {
    res.json({
      active_integrations: ["Firebase Auth", "Firestore"],
      pending_integrations: ["Mercado Pago Pix/Webhook"],
      ui_version: "2.0.0-refined",
      theme: "industrial-dark",
    });
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

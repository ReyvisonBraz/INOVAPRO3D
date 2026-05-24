import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

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

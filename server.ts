import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 🕵️ STATUS & DIAGNOSTICS ENDPOINT
  app.get("/api/health", (req, res) => {
    res.json({
      status: "online",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      checks: {
        firebase: "pending", // Será atualizado após setup
        storage: "online",
        memoryUsage: process.memoryUsage(),
      }
    });
  });

  // Proxy para logs ou depuração futura
  app.get("/api/debug/markers", (req, res) => {
    res.json({
      active_integrations: ["Firebase Auth", "Firestore", "Mercado Pago (Sandbox)"],
      ui_version: "2.0.0-refined",
      theme: "industrial-dark"
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Impressão 3D Engine rodando em http://localhost:${PORT}`);
  });
}

startServer();

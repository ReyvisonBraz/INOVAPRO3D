import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const DIRECT_MODEL_FILE_PATTERN = /\.(stl|3mf|obj|step|stp|iges|igs|zip)(\?.*)?$/i;
const DEFAULT_MODEL_IMPORT_HOSTS = ["makerworld.com", "bambulab.com", "bambulab.cn"];

function getAllowedModelImportHosts() {
  return (process.env.MODEL_IMPORT_ALLOWED_HOSTS || DEFAULT_MODEL_IMPORT_HOSTS.join(","))
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedImportHost(hostname: string) {
  const normalizedHost = hostname.toLowerCase();
  return getAllowedModelImportHosts().some((allowedHost) =>
    normalizedHost === allowedHost || normalizedHost.endsWith(`.${allowedHost}`),
  );
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function findMetaContent(html: string, names: string[]) {
  for (const name of names) {
    const propertyPattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    );
    const contentPattern = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`,
      "i",
    );
    const match = html.match(propertyPattern) || html.match(contentPattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }
  return "";
}

function findTitle(html: string) {
  const title = findMetaContent(html, ["og:title", "twitter:title"]);
  if (title) return title;
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : "";
}

function resolveUrl(candidate: string, baseUrl: string) {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return "";
  }
}

function findDirectModelUrl(html: string, baseUrl: string, originalUrl: string) {
  if (DIRECT_MODEL_FILE_PATTERN.test(originalUrl)) {
    return originalUrl;
  }

  const hrefPattern = /href=["']([^"']+\.(?:stl|3mf|obj|step|stp|iges|igs|zip)(?:\?[^"']*)?)["']/i;
  const match = html.match(hrefPattern);
  return match?.[1] ? resolveUrl(match[1], baseUrl) : "";
}

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

  app.get("/api/model-metadata", async (req, res) => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";

    try {
      const targetUrl = new URL(rawUrl);
      if (!["http:", "https:"].includes(targetUrl.protocol)) {
        res.status(400).json({ error: "Informe uma URL publica http ou https." });
        return;
      }
      if (!isAllowedImportHost(targetUrl.hostname)) {
        res.status(400).json({
          error: `Host nao permitido para importacao: ${targetUrl.hostname}`,
          allowedHosts: getAllowedModelImportHosts(),
        });
        return;
      }

      const response = await fetch(targetUrl, {
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "user-agent": "INOVAPRO3D catalog metadata importer",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        res.status(502).json({ error: `Nao foi possivel ler o link. Status ${response.status}.` });
        return;
      }

      const finalUrl = response.url || targetUrl.toString();
      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("text/html")) {
        res.json({
          title: path.basename(new URL(finalUrl).pathname) || "Modelo importado",
          description: "",
          images: [],
          sourceUrl: finalUrl,
          modelUrl: DIRECT_MODEL_FILE_PATTERN.test(finalUrl) ? finalUrl : "",
          sourceHost: new URL(finalUrl).hostname,
        });
        return;
      }

      const html = await response.text();
      const image = findMetaContent(html, ["og:image", "twitter:image", "image"]);
      const description = findMetaContent(html, ["og:description", "twitter:description", "description"]);
      const title = findTitle(html);
      const canonical = findMetaContent(html, ["og:url"]) || finalUrl;

      res.json({
        title,
        description,
        images: image ? [resolveUrl(image, finalUrl)] : [],
        sourceUrl: canonical,
        modelUrl: findDirectModelUrl(html, finalUrl, finalUrl),
        sourceHost: new URL(finalUrl).hostname,
      });
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

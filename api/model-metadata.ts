import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readModelMetadata } from "../server/_modelMetadata.js";
import { verifyAdminRequest } from "../server/_adminAuth.js";
import { checkRateLimit, clientIp } from "../server/_rateLimit.js";

// Admin-only: só é chamado por
// src/pages/admin/hooks/useProductAdmin.ts, ao importar um modelo por link.
// Anônimo, era um proxy de leitura de URL aberto a qualquer visitante — o
// servidor buscava a URL informada (checada contra uma allowlist de host,
// mas sem revalidar o destino final após redirect) e devolvia o conteúdo.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  const { allowed, retryAfterSeconds } = await checkRateLimit("model-metadata", clientIp(req), 20);
  if (!allowed) {
    res.setHeader("Retry-After", String(retryAfterSeconds || 60));
    res.status(429).json({ error: "Muitas requisições. Tente novamente em instantes." });
    return;
  }

  if (!(await verifyAdminRequest(req))) {
    res.status(403).json({ error: "Apenas administradores podem importar links de modelo." });
    return;
  }

  const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
  if (!rawUrl.trim()) {
    res.status(400).json({ error: "Informe a URL do modelo." });
    return;
  }

  try {
    const result = await readModelMetadata(rawUrl);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Nao foi possivel importar este link.",
    });
  }
}

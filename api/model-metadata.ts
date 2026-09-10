import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readModelMetadata } from "../server/_modelMetadata.js";
import { applyLegacyGuards } from "../server/_middleware/vercelGuards.js";

// Admin-only: só é chamado por
// src/pages/admin/hooks/useProductAdmin.ts, ao importar um modelo por link.
// Anônimo, era um proxy de leitura de URL aberto a qualquer visitante — o
// servidor buscava a URL informada (checada contra uma allowlist de host,
// mas sem revalidar o destino final após redirect) e devolvia o conteúdo.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const identity = await applyLegacyGuards(req, res, {
    methods: ["GET"],
    rateLimit: { bucket: "model-metadata", maxPerMinute: 20 },
    auth: "admin",
  });
  if (identity === false) return;

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

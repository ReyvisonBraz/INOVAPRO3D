import type { VercelRequest, VercelResponse } from "@vercel/node";
import { extractSlicerImageWithGemini } from "../../server/_slicerImage.js";
import { applyLegacyGuards } from "../../server/_middleware/vercelGuards.js";

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BASE64_LENGTH = 4_000_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // O espelho Express (server.ts) sempre teve `rateLimit(12)` nesta rota;
  // esta função — o runtime de produção na Vercel — nunca teve limite algum.
  // Achado durante a Onda 2, mesmo formato do A2 (ver PLANO_REMEDIACAO.md).
  const identity = await applyLegacyGuards(req, res, {
    methods: ["POST"],
    rateLimit: { bucket: "calculator-extract-slicer", maxPerMinute: 12 },
    auth: "admin",
  });
  if (identity === false) return;

  const imageData = typeof req.body?.imageData === "string" ? req.body.imageData : "";
  const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType : "";
  if (!imageData || imageData.length > MAX_BASE64_LENGTH || !ALLOWED_MIME_TYPES.has(mimeType)) {
    res.status(400).json({ error: "Imagem inválida ou muito grande." });
    return;
  }

  try {
    res.status(200).json(await extractSlicerImageWithGemini({ imageData, mimeType }));
  } catch (error) {
    if (error instanceof Error && error.message === "GEMINI_NOT_CONFIGURED") {
      res.status(503).json({ error: "Leitura de imagem ainda não configurada no servidor." });
      return;
    }
    console.error("[extract-slicer] falha na leitura:", error);
    res.status(502).json({ error: "Não foi possível interpretar o recorte. Tente novamente." });
  }
}

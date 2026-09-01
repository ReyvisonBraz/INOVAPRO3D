import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminAuth, getAdminDb } from "../../server/firebaseAdmin.js";
import { extractSlicerImageWithGemini } from "../../server/_slicerImage.js";

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BASE64_LENGTH = 4_000_000;

async function isAdmin(req: VercelRequest): Promise<boolean> {
  const header = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  if (!header.startsWith("Bearer ")) return false;
  try {
    const decoded = await getAdminAuth().verifyIdToken(header.slice(7));
    const user = await getAdminDb().collection("users").doc(decoded.uid).get();
    return user.data()?.role === "ADMIN";
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não permitido." });
    return;
  }
  if (!(await isAdmin(req))) {
    res.status(403).json({ error: "Apenas administradores podem ler recortes." });
    return;
  }

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

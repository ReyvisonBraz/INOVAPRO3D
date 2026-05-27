import { readModelMetadata } from "./_modelMetadata.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Metodo nao permitido." });
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

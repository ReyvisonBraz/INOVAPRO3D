import { auth } from "./firebase";
import { slicerImageExtractionToPasteText } from "../lib/bambuPaste";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_ENCODED_BYTES = 4_000_000;

async function optimizeForOcr(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
      element.src = objectUrl;
    });
    const maxDimension = 2400;
    const scale = Math.min(
      1,
      maxDimension / Math.max(image.naturalWidth || 1, image.naturalHeight || 1),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar o recorte.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Não foi possível comprimir a imagem.")),
        "image/webp",
        0.95,
      ),
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export async function extractSlicerImage(file: File): Promise<{
  text: string;
  warnings: string[];
}> {
  if (!file.type.startsWith("image/")) throw new Error("Cole ou selecione uma imagem.");
  if (file.size > MAX_SOURCE_BYTES)
    throw new Error("Imagem muito grande. Use um recorte de até 10 MB.");
  const user = auth.currentUser;
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");

  // Recortes de tela costumam vir como PNG grande. WebP reduz bastante o
  // payload sem perder a nitidez necessária para ler números e unidades.
  const optimized = await optimizeForOcr(file);
  const imageData = await blobToBase64(optimized);
  if (imageData.length > MAX_ENCODED_BYTES) {
    throw new Error("O recorte ainda ficou grande. Recorte somente o painel de resumo.");
  }

  const response = await fetch("/api/calculator/extract-slicer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ imageData, mimeType: "image/webp" }),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : "Não foi possível ler o recorte.",
    );
  }
  return slicerImageExtractionToPasteText(payload);
}

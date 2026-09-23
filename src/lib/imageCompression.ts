/**
 * Redimensionamento e conversão de imagens para WebP, no navegador.
 *
 * Sem dependência de React: este módulo é usado tanto pelo admin quanto pela
 * calculadora pública, e importar `adminHelpers.tsx` de lá arrastaria
 * componentes para dentro do caminho público sem necessidade.
 *
 * WebP preserva canal alfa, então PNG com fundo transparente continua
 * transparente depois da conversão.
 */

export const WEBP_MAX_DIMENSION = 1200;
export const WEBP_QUALITY = 0.85;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("cors"));
    img.src = src;
  });
}

export function toWebpBlob(img: HTMLImageElement): Promise<Blob> {
  const scale = Math.min(
    1,
    WEBP_MAX_DIMENSION / Math.max(img.naturalWidth || 1, img.naturalHeight || 1),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((img.naturalWidth || WEBP_MAX_DIMENSION) * scale);
  canvas.height = Math.round((img.naturalHeight || WEBP_MAX_DIMENSION) * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas"));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/webp", WEBP_QUALITY),
  );
}

/** Redimensiona e converte um arquivo local para WebP. */
export async function fileToWebpBlob(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    return await toWebpBlob(img);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

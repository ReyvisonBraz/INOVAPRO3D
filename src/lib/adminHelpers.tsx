/* eslint-disable react-refresh/only-export-components -- módulo de helpers do admin que também exporta um componente (NumInput); separar não traria ganho de runtime. */
import { memo, useState, useEffect } from "react";
import type { FirebaseStorage } from "firebase/storage";

export type AdminTabId =
  | "overview"
  | "orders"
  | "quotes"
  | "products"
  | "categories"
  | "materials"
  | "showcase"
  | "coupons"
  | "crm"
  | "support"
  | "faqs"
  | "reviews"
  | "settings"
  | "logs";

export const PT_LOWERCASE_WORDS = new Set([
  "de",
  "da",
  "do",
  "dos",
  "das",
  "a",
  "o",
  "as",
  "os",
  "e",
  "ou",
  "em",
  "com",
  "para",
  "por",
  "sem",
  "sob",
  "sobre",
  "num",
  "numa",
  "no",
  "na",
  "nos",
  "nas",
]);

export const STATIC_CATEGORIES = [
  "DECORAÇÃO",
  "UTILITÁRIOS",
  "ACTION FIGURES",
  "ORGANIZADORES",
  "MODA",
  "GAMES",
  "PERSONALIZADO",
  "OUTROS",
];

export function formatCatalogTitle(raw: string): string {
  if (!raw) return raw;
  const cleaned = raw
    .replace(
      /\s*[|\-–—]\s*(Thingiverse|Printables|MakerWorld|Cults3D|MyMiniFactory|GrabCAD|Free 3D Models?|3D Models?|STL Files?|Free Download).*$/i,
      "",
    )
    .replace(/^(3D Printed?|Printable|FDM)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i === 0 || !PT_LOWERCASE_WORDS.has(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word,
    )
    .join(" ");
}

export function formatCatalogDescription(raw: string): string {
  if (!raw) return raw;
  const cleaned = raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length <= 500) return cleaned;
  const truncated = cleaned.slice(0, 500);
  const lastBreak = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf(".\n"),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? "),
  );
  return (lastBreak > 200 ? truncated.slice(0, lastBreak + 1) : truncated + "...").trim();
}

function isExternalUrl(url: string): boolean {
  try {
    return new URL(url).hostname !== window.location.hostname;
  } catch {
    return false;
  }
}

/** URL externa que ainda não passou pela otimização (não está no nosso Storage). */
export function isUnoptimizedExternalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host !== window.location.hostname && host !== "firebasestorage.googleapis.com";
  } catch {
    return false;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("cors"));
    img.src = src;
  });
}

const WEBP_MAX_DIMENSION = 1200;
const WEBP_QUALITY = 0.85;

function toWebpBlob(img: HTMLImageElement): Promise<Blob> {
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

/** Redimensiona e converte um arquivo local (upload do admin) para WebP. */
export async function fileToWebpBlob(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    return await toWebpBlob(img);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function importAndConvertImage(
  url: string,
  storageBucket: FirebaseStorage,
): Promise<{ url: string; converted: boolean }> {
  // Try direct load first (works for CORS-friendly hosts); fall back to the
  // server proxy for hosts that block cross-origin canvas access.
  let img: HTMLImageElement;
  try {
    img = await loadImage(url);
  } catch (err) {
    if (!isExternalUrl(url)) throw err;
    img = await loadImage(`/api/proxy-image?url=${encodeURIComponent(url)}`);
  }

  const blob = await toWebpBlob(img);

  const { ref: storageRef, uploadBytes, getDownloadURL } = await import("firebase/storage");
  const path = `products/imports/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
  const fileRef = storageRef(storageBucket, path);
  await uploadBytes(fileRef, blob, { contentType: "image/webp" });
  const downloadUrl = await getDownloadURL(fileRef);
  return { url: downloadUrl, converted: true };
}

const translationCache = new Map<string, string>();

export async function translateToBR(text: string, signal?: AbortSignal): Promise<string> {
  if (translationCache.has(text)) return translationCache.get(text)!;
  if (!text.trim()) return text;
  const sentences: string[] = [];
  let current = "";
  for (const part of text.split(/(?<=[.!?])\s+/)) {
    if ((current + " " + part).length > 490 && current) {
      sentences.push(current.trim());
      current = part;
    } else {
      current = current ? current + " " + part : part;
    }
  }
  if (current) sentences.push(current.trim());

  const translated = await Promise.all(
    sentences.map(async (chunk) => {
      try {
        const r = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|pt-BR`,
          { signal },
        );
        const d = (await r.json()) as {
          responseStatus?: number;
          responseData?: { translatedText?: string };
        };
        return d.responseStatus === 200 && d.responseData?.translatedText
          ? d.responseData.translatedText
          : chunk;
      } catch {
        return chunk;
      }
    }),
  );
  const result = translated.join(" ").trim();
  translationCache.set(text, result);
  return result;
}

export const NumInput = memo(function NumInput({
  value,
  onChange,
  min,
  max,
  step,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft}
      className={className}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== "" && Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        const n = Number(draft);
        if (draft === "" || !Number.isFinite(n)) {
          const fallback = min ?? 0;
          setDraft(String(fallback));
          onChange(fallback);
        }
      }}
    />
  );
});

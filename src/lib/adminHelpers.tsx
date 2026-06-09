import { memo, useState, useEffect } from "react";

export type AdminTabId = 'overview' | 'orders' | 'quotes' | 'products' | 'materials' | 'showcase' | 'crm' | 'support' | 'faqs' | 'settings' | 'logs';

export const PT_LOWERCASE_WORDS = new Set(["de", "da", "do", "dos", "das", "a", "o", "as", "os", "e", "ou", "em", "com", "para", "por", "sem", "sob", "sobre", "num", "numa", "no", "na", "nos", "nas"]);

export const STATIC_CATEGORIES = ["DECORAÇÃO", "UTILITÁRIOS", "ACTION FIGURES", "ORGANIZADORES", "MODA", "GAMES", "PERSONALIZADO", "OUTROS"];

export function formatCatalogTitle(raw: string): string {
  if (!raw) return raw;
  const cleaned = raw
    .replace(/\s*[|\-–—]\s*(Thingiverse|Printables|MakerWorld|Cults3D|MyMiniFactory|GrabCAD|Free 3D Models?|3D Models?|STL Files?|Free Download).*$/i, "")
    .replace(/^(3D Printed?|Printable|FDM)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned
    .toLowerCase()
    .split(" ")
    .map((word, i) => (i === 0 || !PT_LOWERCASE_WORDS.has(word)) ? word.charAt(0).toUpperCase() + word.slice(1) : word)
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
  const lastBreak = Math.max(truncated.lastIndexOf(". "), truncated.lastIndexOf(".\n"), truncated.lastIndexOf("! "), truncated.lastIndexOf("? "));
  return (lastBreak > 200 ? truncated.slice(0, lastBreak + 1) : truncated + "...").trim();
}

export async function importAndConvertImage(
  url: string,
  storageBucket: any
): Promise<{ url: string; converted: boolean }> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("cors"));
    img.src = url;
  });

  const MAX = 1200;
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((img.naturalWidth || 1200) * scale);
  canvas.height = Math.round((img.naturalHeight || 1200) * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error("blob"))), "image/webp", 0.85)
  );

  const { ref: storageRef, uploadBytes, getDownloadURL } = await import("firebase/storage");
  const path = `products/imports/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
  const fileRef = storageRef(storageBucket, path);
  await uploadBytes(fileRef, blob, { contentType: "image/webp" });
  const downloadUrl = await getDownloadURL(fileRef);
  return { url: downloadUrl, converted: true };
}

export async function translateToBR(text: string): Promise<string> {
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

  const translated = await Promise.all(sentences.map(async chunk => {
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|pt-BR`);
      const d = await r.json() as { responseStatus?: number; responseData?: { translatedText?: string } };
      return (d.responseStatus === 200 && d.responseData?.translatedText) ? d.responseData.translatedText : chunk;
    } catch { return chunk; }
  }));
  return translated.join(" ").trim();
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
  useEffect(() => { setDraft(String(value)); }, [value]);
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

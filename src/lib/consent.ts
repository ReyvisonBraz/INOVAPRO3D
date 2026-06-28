// Consentimento de cookies (LGPD). Analytics/marketing só carregam após "aceitar".
const KEY = "inovapro3d:cookie-consent";

export type ConsentValue = "accepted" | "rejected";

export function getConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* modo privado / quota — ignora */
  }
}

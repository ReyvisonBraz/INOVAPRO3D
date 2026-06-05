// Central contact config — set VITE_WHATSAPP_PHONE and VITE_CONTACT_EMAIL in .env.local
export const CONTACT = {
  whatsapp: (import.meta as any).env?.VITE_WHATSAPP_PHONE ?? "5591999999999",
  email: (import.meta as any).env?.VITE_CONTACT_EMAIL ?? "contato@inovapro3d.com.br",
  businessName: "INOVAPRO3D",
};

export function waLink(message: string): string {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}

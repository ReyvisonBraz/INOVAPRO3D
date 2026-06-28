// Central contact config — set VITE_WHATSAPP_PHONE and VITE_CONTACT_EMAIL in .env.local
export const CONTACT = {
  // Formato wa.me: 55 (Brasil) + DDD + número, só dígitos.
  whatsapp: (import.meta as any).env?.VITE_WHATSAPP_PHONE ?? "5591980774776",
  email: (import.meta as any).env?.VITE_CONTACT_EMAIL ?? "vendas@inovapro3d.com.br",
  businessName: "INOVAPRO3D",
};

// Redes sociais oficiais — fonte única usada no Footer, na tela de boas-vindas,
// botão flutuante etc. Deixe vazio ("") para esconder um canal automaticamente.
export const SOCIAL = {
  instagram: "https://www.instagram.com/inovapro3d",
  instagramHandle: "@inovapro3d",
  facebook: "https://www.facebook.com/profile.php?id=61591133682774",
  tiktok: "", // em breve — cole o link aqui que ele aparece sozinho
  kwai: "",   // em breve — cole o link aqui que ele aparece sozinho
};

export function waLink(message: string): string {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}

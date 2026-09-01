// Lógica compartilhada do sitemap (pura, sem imports) — usada pela função
// serverless da Vercel e pelo server.ts local.

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

export const SITEMAP_STATIC_PATHS = ["", "/catalogo", "/calculadora", "/conhecimento", "/sobre"];

export function siteBaseUrl(): string {
  return (process.env.APP_URL || "https://www.inovapro3d.com.br").replace(/\/+$/, "");
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildSitemapXml(urls: SitemapUrl[]): string {
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

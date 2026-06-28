import { buildSitemapXml, siteBaseUrl, SITEMAP_STATIC_PATHS, type SitemapUrl } from "./_sitemap.js";
import { getAdminDb, isAdminSdkConfigured } from "./firebaseAdmin.js";

export default async function handler(_req: any, res: any) {
  const base = siteBaseUrl();
  const urls: SitemapUrl[] = SITEMAP_STATIC_PATHS.map((p) => ({ loc: base + p }));

  try {
    if (isAdminSdkConfigured()) {
      const snap = await getAdminDb().collection("products").get();
      snap.forEach((doc) => {
        const d = doc.data() as { active?: boolean; updatedAt?: { toDate?: () => Date } };
        if (d.active === false) return;
        let lastmod: string | undefined;
        try {
          lastmod = d.updatedAt?.toDate?.().toISOString();
        } catch {
          /* ignora data inválida */
        }
        urls.push({ loc: `${base}/produto/${doc.id}`, lastmod });
      });
    }
  } catch (err) {
    console.error("[sitemap] falha ao listar produtos:", err);
  }

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  res.status(200).send(buildSitemapXml(urls));
}

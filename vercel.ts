import type { VercelConfig } from "@vercel/config/v1";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildCspPolicy, reportingEndpointsHeader } from "./shared/security/cspPolicy.js";

// A CLI compila vercel.ts em `.vercel/vercel-temp.mjs`; `import.meta.url`
// apontaria para essa cópia temporária. O cwd permanece na raiz do projeto.
const indexHtml = readFileSync(path.join(process.cwd(), "index.html"), "utf8");
const cspReportOnly = buildCspPolicy(indexHtml);

export const config: VercelConfig = {
  headers: [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), payment=(self)",
        },
        { key: "Reporting-Endpoints", value: reportingEndpointsHeader() },
        { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
      ],
    },
    {
      source: "/assets/(.*)",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      source: "/catalogo/(.*)",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
  ],
  redirects: [
    {
      source: "/:path*",
      has: [{ type: "host", value: "inovapro3d.com.br" }],
      destination: "https://www.inovapro3d.com.br/:path*",
      permanent: true,
    },
  ],
  rewrites: [
    { source: "/api/:path*", destination: "/api/:path*" },
    { source: "/sitemap.xml", destination: "/api/sitemap" },
    { source: "/:path*", destination: "/index.html" },
  ],
};

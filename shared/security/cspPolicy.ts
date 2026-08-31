import { createHash } from "node:crypto";

export const CSP_REPORT_GROUP = "csp";
export const CSP_REPORT_PATH = "/api/csp-report";
export const CSP_PRODUCTION_REPORT_ENDPOINT = "https://www.inovapro3d.com.br/api/csp-report";

const EXTERNAL_SCRIPT_SOURCES = [
  "https://js.stripe.com",
  "https://apis.google.com",
  "https://www.googletagmanager.com",
  "https://connect.facebook.net",
  "https://analytics.tiktok.com",
  "https://web.webpushs.com",
] as const;

/** Conteúdo exato dos scripts inline executáveis, na ordem em que aparecem. */
export function extractInlineScripts(html: string): string[] {
  const scripts: string[] = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (const match of html.matchAll(scriptPattern)) {
    const attributes = match[1] ?? "";
    if (/\bsrc\s*=/i.test(attributes)) continue;
    scripts.push(match[2] ?? "");
  }
  return scripts;
}

export function hashInlineScript(script: string): string {
  return `'sha256-${createHash("sha256").update(script, "utf8").digest("base64")}'`;
}

export function inlineScriptHashes(html: string): string[] {
  return extractInlineScripts(html).map(hashInlineScript);
}

/**
 * Handlers HTML como `onload="..."` não são cobertos pelos hashes de
 * `<script>`. A política os proíbe com `script-src-attr 'none'`, portanto o
 * verificador pós-build precisa recusar qualquer regressão desse tipo.
 */
export function findInlineEventHandlers(html: string): string[] {
  return [...html.matchAll(/\s(on[a-z]+)\s*=/gi)].map((match) => match[1].toLowerCase());
}

function directive(name: string, values: readonly string[]): string {
  return `${name} ${values.join(" ")}`;
}

export function buildCspPolicy(html: string): string {
  const hashes = inlineScriptHashes(html);
  if (hashes.length === 0) {
    throw new Error("Nenhum script inline foi encontrado para gerar a CSP.");
  }

  return [
    directive("default-src", ["'self'"]),
    directive("script-src", ["'self'", ...hashes, ...EXTERNAL_SCRIPT_SOURCES]),
    directive("script-src-attr", ["'none'"]),
    directive("style-src", ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]),
    directive("font-src", ["'self'", "https://fonts.gstatic.com", "data:"]),
    directive("img-src", ["'self'", "data:", "blob:", "https:"]),
    directive("media-src", ["'self'", "blob:", "https:"]),
    directive("connect-src", [
      "'self'",
      "https://*.googleapis.com",
      "https://firestore.googleapis.com",
      "https://identitytoolkit.googleapis.com",
      "https://securetoken.googleapis.com",
      "https://firebasestorage.googleapis.com",
      "https://api.stripe.com",
      "https://www.google-analytics.com",
      "https://*.google-analytics.com",
      "https://analytics.tiktok.com",
      "https://connect.facebook.net",
      "https://www.facebook.com",
      "https://web.webpushs.com",
      "wss://*.firestore.googleapis.com",
    ]),
    directive("frame-src", [
      "'self'",
      "https://js.stripe.com",
      "https://hooks.stripe.com",
      "https://accounts.google.com",
      "https://*.firebaseapp.com",
    ]),
    directive("worker-src", ["'self'", "blob:"]),
    directive("manifest-src", ["'self'"]),
    directive("object-src", ["'none'"]),
    directive("base-uri", ["'self'"]),
    directive("form-action", ["'self'"]),
    directive("frame-ancestors", ["'none'"]),
    directive("report-uri", [CSP_REPORT_PATH]),
    directive("report-to", [CSP_REPORT_GROUP]),
  ].join("; ");
}

export function reportingEndpointsHeader(endpoint = CSP_PRODUCTION_REPORT_ENDPOINT): string {
  const url = new URL(endpoint);
  if (url.protocol !== "https:") {
    throw new Error("O endpoint de relatórios CSP precisa usar HTTPS.");
  }
  return `${CSP_REPORT_GROUP}="${url.href}"`;
}

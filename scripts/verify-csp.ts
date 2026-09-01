import { readFileSync } from "node:fs";
import {
  buildCspPolicy,
  findInlineEventHandlers,
  inlineScriptHashes,
} from "../shared/security/cspPolicy.js";

const sourceHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const builtHtml = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const vercelConfig = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
) as {
  headers?: Array<{
    headers?: Array<{ key?: string; value?: string }>;
    source?: string;
  }>;
};
const sourceHashes = inlineScriptHashes(sourceHtml);
const builtHashes = inlineScriptHashes(builtHtml);
const inlineHandlers = findInlineEventHandlers(builtHtml);

if (JSON.stringify(sourceHashes) !== JSON.stringify(builtHashes)) {
  throw new Error(
    `Os scripts inline mudaram durante o build (fonte=${sourceHashes.length}, dist=${builtHashes.length}).`,
  );
}
if (inlineHandlers.length > 0) {
  throw new Error(
    `O build gerou handlers inline proibidos pela CSP: ${inlineHandlers.join(", ")}.`,
  );
}

const policy = buildCspPolicy(builtHtml);
const configuredPolicy = vercelConfig.headers
  ?.find((entry) => entry.source === "/(.*)")
  ?.headers?.find((header) => header.key === "Content-Security-Policy-Report-Only")?.value;
if (configuredPolicy !== buildCspPolicy(sourceHtml)) {
  throw new Error("A CSP do vercel.json está desatualizada. Execute `npm run csp:sync`.");
}
const scriptDirective = policy.split("; ").find((value) => value.startsWith("script-src "));
if (!scriptDirective || scriptDirective.includes("'unsafe-inline'")) {
  throw new Error("A diretiva script-src ainda permite unsafe-inline.");
}

console.info(
  `[csp] ${builtHashes.length} scripts inline cobertos; nenhum handler HTML; política Report-Only válida.`,
);

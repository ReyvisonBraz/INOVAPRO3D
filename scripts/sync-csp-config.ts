import { readFileSync, writeFileSync } from "node:fs";
import { buildCspPolicy } from "../shared/security/cspPolicy.js";

interface VercelHeader {
  key: string;
  value: string;
}

interface VercelConfigFile {
  headers?: Array<{
    headers?: VercelHeader[];
    source?: string;
  }>;
}

const configUrl = new URL("../vercel.json", import.meta.url);
const indexUrl = new URL("../index.html", import.meta.url);
const config = JSON.parse(readFileSync(configUrl, "utf8")) as VercelConfigFile;
const globalHeaders = config.headers?.find((entry) => entry.source === "/(.*)")?.headers;
const cspHeader = globalHeaders?.find(
  (header) => header.key === "Content-Security-Policy-Report-Only",
);

if (!cspHeader) {
  throw new Error("Header Content-Security-Policy-Report-Only ausente em vercel.json.");
}

cspHeader.value = buildCspPolicy(readFileSync(indexUrl, "utf8"));
writeFileSync(configUrl, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.info("[csp] vercel.json sincronizado com os scripts inline atuais.");

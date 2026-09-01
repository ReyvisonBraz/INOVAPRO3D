import { createHash } from "node:crypto";

const MAX_REPORTS_PER_REQUEST = 10;
const MAX_PATH_SEGMENTS = 6;

const TRUSTED_DOCUMENT_HOSTS = new Set([
  "inovapro3d.com.br",
  "www.inovapro3d.com.br",
  "inovapro3d.vercel.app",
]);

const SENSITIVE_PATH_SEGMENT =
  /^(?:\d{6,}|[a-f\d]{20,}|[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12})$/i;

export interface CspReportSummary {
  documentUri: string;
  blockedUri: string;
  effectiveDirective: string;
  sourceFile: string | null;
  disposition: "report" | "enforce" | "unknown";
  statusCode: number | null;
  lineNumber: number | null;
  columnNumber: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, ...names: string[]): string | null {
  for (const name of names) {
    const value = record[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function finiteInteger(record: Record<string, unknown>, ...names: string[]): number | null {
  for (const name of names) {
    const value = record[name];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.trunc(value));
    }
  }
  return null;
}

function sanitizePathSegment(segment: string): string {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Segmentos percent-encoded inválidos são tratados como identificadores.
    return ":id";
  }

  if (decoded.length > 40 || SENSITIVE_PATH_SEGMENT.test(decoded)) return ":id";
  const sanitized = decoded.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 40);
  return encodeURIComponent(sanitized) || ":empty";
}

/**
 * Remove query/hash e reduz identificadores de rota antes de persistir ou
 * registrar uma URL enviada pelo navegador.
 */
export function sanitizeCspUrl(value: string | null): string {
  if (!value) return "unknown";
  const normalized = value.trim().toLowerCase();
  if (["inline", "eval", "self", "none"].includes(normalized)) return normalized;
  if (normalized.startsWith("data:")) return "data:";
  if (normalized.startsWith("blob:")) return "blob:";

  try {
    const url = new URL(value);
    if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) return "unknown";
    const segments = url.pathname
      .split("/")
      .filter(Boolean)
      .slice(0, MAX_PATH_SEGMENTS)
      .map(sanitizePathSegment);
    return `${url.origin}${segments.length > 0 ? `/${segments.join("/")}` : ""}`;
  } catch {
    return "unknown";
  }
}

function sanitizeDirective(value: string | null): string {
  if (!value) return "unknown";
  const normalized = value.toLowerCase();
  return /^[a-z][a-z0-9-]{0,63}$/.test(normalized) ? normalized : "unknown";
}

function sanitizeDisposition(value: string | null): CspReportSummary["disposition"] {
  return value === "report" || value === "enforce" ? value : "unknown";
}

function normalizeReport(record: Record<string, unknown>): CspReportSummary {
  return {
    documentUri: sanitizeCspUrl(stringField(record, "document-uri", "documentURL", "document-url")),
    blockedUri: sanitizeCspUrl(stringField(record, "blocked-uri", "blockedURL", "blocked-url")),
    effectiveDirective: sanitizeDirective(
      stringField(
        record,
        "effective-directive",
        "effectiveDirective",
        "violated-directive",
        "violatedDirective",
      ),
    ),
    sourceFile: (() => {
      const source = sanitizeCspUrl(stringField(record, "source-file", "sourceFile"));
      return source === "unknown" ? null : source;
    })(),
    disposition: sanitizeDisposition(stringField(record, "disposition")),
    statusCode: finiteInteger(record, "status-code", "statusCode"),
    lineNumber: finiteInteger(record, "line-number", "lineNumber"),
    columnNumber: finiteInteger(record, "column-number", "columnNumber"),
  };
}

/** Aceita tanto `report-uri` legado quanto lotes da Reporting API. */
export function parseCspReportPayload(payload: unknown): CspReportSummary[] {
  if (isRecord(payload) && isRecord(payload["csp-report"])) {
    return [normalizeReport(payload["csp-report"])];
  }

  if (!Array.isArray(payload)) return [];
  const reports: CspReportSummary[] = [];
  for (const item of payload.slice(0, MAX_REPORTS_PER_REQUEST)) {
    if (!isRecord(item) || item.type !== "csp-violation" || !isRecord(item.body)) continue;
    reports.push(normalizeReport(item.body));
  }
  return reports;
}

function normalizeHostname(host: string): string | null {
  const value = host.trim().toLowerCase();
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname;
  } catch {
    return null;
  }
}

export function isTrustedCspDocument(
  report: CspReportSummary,
  additionalHosts: readonly string[] = [],
): boolean {
  let hostname: string;
  try {
    const url = new URL(report.documentUri);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    hostname = url.hostname.toLowerCase();
  } catch {
    return false;
  }

  if (TRUSTED_DOCUMENT_HOSTS.has(hostname)) return true;
  if (hostname.startsWith("inovapro3d-") && hostname.endsWith(".vercel.app")) return true;

  return additionalHosts.some((host) => normalizeHostname(host) === hostname);
}

function blockedResourceBucket(blockedUri: string): string {
  if (["inline", "eval", "self", "none", "data:", "blob:", "unknown"].includes(blockedUri)) {
    return blockedUri;
  }
  try {
    return new URL(blockedUri).origin;
  } catch {
    return "unknown";
  }
}

/** Chave estável e de baixa cardinalidade para agregar violações equivalentes. */
export function cspReportFingerprint(report: CspReportSummary): string {
  const input = [
    report.effectiveDirective,
    blockedResourceBucket(report.blockedUri),
    report.disposition,
  ].join("|");
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

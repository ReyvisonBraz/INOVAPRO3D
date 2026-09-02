import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isTrustedCspDocument, parseCspReportPayload } from "../server/_cspReport.js";
import { recordCspReports } from "../server/_cspReportRecorder.js";
import { createRequestContext } from "../server/_observability/context.js";
import { logEvent } from "../server/_observability/logger.js";
import { checkRateLimit, clientIp } from "../server/_rateLimit.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_BODY_BYTES = 32 * 1024;
const MAX_REQUESTS_PER_MINUTE = 60;
const ALLOWED_CONTENT_TYPES = new Set([
  "application/csp-report",
  "application/reports+json",
  "application/json",
]);

class BodyTooLargeError extends Error {}

function firstHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function readBody(req: VercelRequest): Promise<string> {
  const declaredLength = Number(firstHeader(req.headers["content-length"]));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new BodyTooLargeError();
  }

  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.byteLength;
    if (length > MAX_BODY_BYTES) throw new BodyTooLargeError();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function allowedEnvironmentHosts(): string[] {
  return [
    process.env.APP_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter((value): value is string => !!value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const context = createRequestContext(req, "security", "csp-report");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }

  const contentType = firstHeader(req.headers["content-type"]).split(";", 1)[0].toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    res.status(415).end();
    return;
  }
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    "csp-report",
    clientIp(req),
    MAX_REQUESTS_PER_MINUTE,
    context,
  );
  if (!allowed) {
    res.setHeader("Retry-After", String(retryAfterSeconds || 60));
    res.status(429).end();
    return;
  }

  try {
    const rawBody = await readBody(req);
    const reports = parseCspReportPayload(JSON.parse(rawBody));
    if (reports.length === 0) {
      res.status(400).end();
      return;
    }

    const trustedReports = reports.filter((report) =>
      isTrustedCspDocument(report, allowedEnvironmentHosts()),
    );
    if (trustedReports.length > 0) await recordCspReports(trustedReports, context);
    res.status(204).end();
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      res.status(413).end();
      return;
    }
    logEvent("warn", context, "Relatório CSP inválido descartado");
    res.status(400).end();
  }
}

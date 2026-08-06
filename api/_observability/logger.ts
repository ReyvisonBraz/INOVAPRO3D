import type { AppError } from "./appError.js";
import type { RequestContext } from "./context.js";

type LogLevel = "info" | "warn" | "error";

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY =
  /authorization|access.?token|secret|password|private.?key|pix.?code|qr.?code|credential/i;

function sanitizeString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/APP_USR-[A-Za-z0-9_-]+/gi, "[REDACTED_CREDENTIAL]")
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, "[REDACTED_PRIVATE_KEY]");
}

export function sanitizeLogData(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[MAX_DEPTH]";
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      stack: value.stack ? sanitizeString(value.stack) : undefined,
    };
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeLogData(item, depth + 1));
  if (typeof value === "string") return sanitizeString(value);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : sanitizeLogData(item, depth + 1),
    ]),
  );
}

export function logEvent(
  level: LogLevel,
  context: RequestContext,
  message: string,
  data: Record<string, unknown> = {},
): void {
  const entry = sanitizeLogData({
    timestamp: new Date().toISOString(),
    level,
    ...context,
    message,
    ...data,
  });
  const serialized = JSON.stringify(entry);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.info(serialized);
}

export function logAppError(
  context: RequestContext,
  error: AppError,
  data: Record<string, unknown> = {},
): void {
  const level: LogLevel = error.httpStatus >= 500 ? "error" : "warn";
  logEvent(level, context, error.message, {
    errorCode: error.code,
    retryable: error.retryable,
    details: error.details,
    cause: error.cause,
    ...data,
  });
}

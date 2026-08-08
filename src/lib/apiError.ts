import { isErrorCode, type ErrorCode, type PublicErrorResponse } from "../../shared/errors/catalog";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code?: ErrorCode,
    readonly correlationId?: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function isPublicErrorResponse(value: unknown): value is PublicErrorResponse {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = (value as { error?: unknown }).error;
  return Boolean(
    error &&
    typeof error === "object" &&
    isErrorCode((error as { code?: unknown }).code) &&
    typeof (error as { message?: unknown }).message === "string" &&
    typeof (error as { correlationId?: unknown }).correlationId === "string" &&
    typeof (error as { retryable?: unknown }).retryable === "boolean",
  );
}

export async function readApiError(
  response: Response,
  fallbackMessage: string,
): Promise<ApiClientError> {
  const body: unknown = await response.json().catch(() => null);
  if (isPublicErrorResponse(body)) {
    return new ApiClientError(
      body.error.message,
      body.error.code,
      body.error.correlationId,
      body.error.retryable,
    );
  }

  // Compatibilidade temporária enquanto os demais endpoints migram para o
  // contrato novo. Não exibimos mensagens legadas cruas ao cliente.
  return new ApiClientError(
    fallbackMessage,
    undefined,
    response.headers.get("X-Correlation-Id") ?? undefined,
  );
}

export function formatSupportCode(correlationId?: string): string | null {
  if (!correlationId) return null;
  const normalized = correlationId.replace(/^req_/, "");
  return `PAY-${normalized.slice(0, 8).toUpperCase()}`;
}

import { ERROR_CATALOG, type ErrorCode } from "../../shared/errors/catalog.js";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly cause?: unknown;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    options: {
      cause?: unknown;
      details?: Record<string, unknown>;
      technicalMessage?: string;
    } = {},
  ) {
    const definition = ERROR_CATALOG[code];
    super(options.technicalMessage ?? definition.message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = definition.httpStatus;
    this.retryable = definition.retryable;
    this.cause = options.cause;
    this.details = options.details;
  }
}

export function asAppError(error: unknown, fallback: ErrorCode = "INTERNAL_ERROR"): AppError {
  return error instanceof AppError ? error : new AppError(fallback, { cause: error });
}

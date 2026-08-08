import type { VercelResponse } from "@vercel/node";
import { createPublicErrorResponse } from "../../shared/errors/catalog.js";
import { asAppError } from "./appError.js";
import type { RequestContext } from "./context.js";
import { logAppError } from "./logger.js";

export function sendApiError(
  res: VercelResponse,
  context: RequestContext,
  error: unknown,
  data: Record<string, unknown> = {},
): void {
  const appError = asAppError(error);
  logAppError(context, appError, data);
  res.setHeader("X-Correlation-Id", context.correlationId);
  res
    .status(appError.httpStatus)
    .json(createPublicErrorResponse(appError.code, context.correlationId));
}

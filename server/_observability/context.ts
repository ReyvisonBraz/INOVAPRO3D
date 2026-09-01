import { randomUUID } from "node:crypto";

export interface RequestContext {
  correlationId: string;
  service: string;
  operation: string;
  platformRequestId?: string;
}

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function createRequestContext(
  req: RequestLike,
  service: string,
  operation: string,
): RequestContext {
  return {
    correlationId: `req_${randomUUID()}`,
    service,
    operation,
    platformRequestId: firstHeader(req.headers["x-vercel-id"]),
  };
}

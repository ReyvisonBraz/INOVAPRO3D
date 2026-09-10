// ============================================================================
// ADAPTADOR VERCEL — traduz `GuardDecision` para as respostas HTTP existentes.
// ----------------------------------------------------------------------------
// Duas rotas de resposta, porque as funções serverless já divergem entre si
// de propósito e nenhuma das duas deveria virar a outra nesta onda:
//
//   - `applyCatalogGuards`: para as rotas que já respondem com
//     `sendApiError`/`AppError` a partir de `shared/errors/catalog.ts`
//     (orders/create, mercadopago/*). Mantém `X-Correlation-Id`, log
//     estruturado e o corpo público padronizado que essas rotas já expõem.
//   - `applyLegacyGuards`: para as rotas que respondem `{ error: "..." }`
//     avulso (model-metadata, report-error, notify/new-order,
//     calculator/extract-slicer). Mesmo formato que cada uma já devolvia —
//     o frontend só lê `data.error` como texto, nunca um código, então
//     trocar a MENSAGEM por uma genérica não quebra nada (confirmado nos
//     3 chamadores: useProductAdmin.ts, slicerImage.ts, Checkout.tsx).
//
// Nenhum dos dois adaptadores decide sozinho — ambos só formatam o que
// `runGuards`/`decideGuards` já decidiu.
// ============================================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ERROR_CATALOG } from "../../shared/errors/catalog.js";
import { AppError } from "../_observability/appError.js";
import type { RequestContext } from "../_observability/context.js";
import { sendApiError } from "../_observability/http.js";
import { runGuards, type GuardDecision, type GuardOptions, type Identity } from "./guards.js";

/** `false` = a resposta já foi enviada; a chamada deve retornar imediatamente. */
export type GuardResult = Identity | null | false;

type GuardFailure = Extract<GuardDecision, { ok: false }>;

function applyFailureHeaders(res: VercelResponse, decision: GuardFailure): void {
  if (decision.reason === "METHOD_NOT_ALLOWED" && decision.allow) {
    res.setHeader("Allow", decision.allow);
  }
  if (decision.reason === "RATE_LIMITED") {
    res.setHeader("Retry-After", String(decision.retryAfterSeconds ?? 60));
  }
}

export async function applyCatalogGuards(
  req: VercelRequest,
  res: VercelResponse,
  context: RequestContext,
  options: GuardOptions,
): Promise<GuardResult> {
  const decision = await runGuards(req, options, context);
  if (decision.ok) return decision.identity;

  applyFailureHeaders(res, decision);
  sendApiError(res, context, new AppError(decision.reason));
  return false;
}

/**
 * Para as rotas que respondem `{ error: "texto" }` avulso, sem o envelope
 * `{ error: { code, message, ... } }` do catálogo — os três chamadores
 * (`useProductAdmin.ts`, `slicerImage.ts`, `Checkout.tsx`) leem `data.error`
 * como string; devolver o objeto do catálogo ali quebraria a leitura.
 * A mensagem em si vem do catálogo (`ERROR_CATALOG[reason].message`) para
 * não ter o mesmo erro com texto diferente em rota diferente — outra face
 * da mesma duplicação que esta onda existe para eliminar.
 */
export async function applyLegacyGuards(
  req: VercelRequest,
  res: VercelResponse,
  options: GuardOptions,
  context?: RequestContext,
): Promise<GuardResult> {
  const decision = await runGuards(req, options, context);
  if (decision.ok) return decision.identity;

  applyFailureHeaders(res, decision);
  const definition = ERROR_CATALOG[decision.reason];
  res.status(definition.httpStatus).json({ error: definition.message });
  return false;
}

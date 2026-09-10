// ============================================================================
// ADAPTADOR EXPRESS — traduz `GuardDecision` para as respostas do server.ts.
// ----------------------------------------------------------------------------
// Diferente das funções serverless, uma rota Express já tem seu método
// verificado pelo próprio `app.post(...)`/`app.get(...)` no registro — não
// existe aqui o caso "handler único despachando por `req.method`" que
// justifica a checagem de método nas funções da Vercel. Por isso `methods`
// não é uma opção neste adaptador.
//
// `rateLimit(n)` continua como middleware separado ([server.ts]) — ele já
// delega a `checkRateLimit`/`clientIp`, sem duplicação a resolver ali. O que
// se repetia rota a rota era o par "Admin SDK configurado? → Bearer válido?",
// que é o que `requireIdentity` substitui.
// ============================================================================

import type express from "express";
import { ERROR_CATALOG } from "../../shared/errors/catalog.js";
import { runGuards, type AuthLevel, type Identity } from "./guards.js";

export type ExpressGuardResult = Identity | null | false;

/**
 * Verifica Admin SDK (quando exigido) + identidade do Bearer token, no mesmo
 * formato `{ error: "texto" }` que `server.ts` já usa. A mensagem vem do
 * catálogo (`ERROR_CATALOG`) — mesmo texto que as funções da Vercel agora
 * devolvem para o mesmo motivo, fechando uma divergência que só existia
 * porque as duas implementações nunca dividiram uma fonte.
 *
 * `auth: "none"` devolve `null` sem checar nada — cobre rotas como o webhook
 * do Mercado Pago, que valida por assinatura HMAC, não por Bearer.
 */
export async function requireIdentity(
  req: express.Request,
  res: express.Response,
  options: { auth?: AuthLevel; requireAdminSdk?: boolean } = {},
): Promise<ExpressGuardResult> {
  const decision = await runGuards(req, {
    auth: options.auth ?? "user",
    requireAdminSdk: options.requireAdminSdk,
  });
  if (decision.ok) return decision.identity;

  const definition = ERROR_CATALOG[decision.reason];
  res.status(definition.httpStatus).json({ error: definition.message });
  return false;
}

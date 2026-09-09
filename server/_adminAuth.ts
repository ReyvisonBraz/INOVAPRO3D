// Verificação de admin compartilhada entre o Express (server.ts) e as
// funções serverless da Vercel (api/).
//
// Extraído ao endurecer as rotas de importação de modelo (`/api/proxy-image`,
// `/api/model-metadata`): as duas eram anônimas e repassavam a URL do
// visitante para um `fetch` do servidor, cujo destino final não é
// revalidado após redirect (SSRF condicionado a um open redirect em algum
// host da allowlist). As duas só têm um chamador — telas de admin
// (`src/lib/adminHelpers.tsx`, `src/pages/admin/hooks/useProductAdmin.ts`) —
// então exigir admin fecha o acesso anônimo sem tirar função de ninguém.
// `api/calculator/extract-slicer.ts` faz exatamente esta checagem hoje,
// duplicada; fica para quando a duplicação for revisitada de propósito.

import { getAdminAuth, getAdminDb } from "./firebaseAdmin.js";

export interface AuthorizedRequest {
  headers: { authorization?: string | string[] };
}

/**
 * Verifica o Bearer token e confirma `role === "ADMIN"` em `users/{uid}`.
 * Retorna o uid em caso de sucesso; `null` em qualquer falha — header
 * ausente, token inválido ou expirado, usuário sem o papel. Falha sempre
 * fechado, mesmo padrão de `verifyToken`/`verifyTokenWithClaims` em
 * server.ts: nenhuma dessas falhas deve degradar para "deixa passar".
 */
export async function verifyAdminRequest(req: AuthorizedRequest): Promise<string | null> {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith("Bearer ")) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(value.slice(7));
    const user = await getAdminDb().collection("users").doc(decoded.uid).get();
    return user.data()?.role === "ADMIN" ? decoded.uid : null;
  } catch {
    return null;
  }
}

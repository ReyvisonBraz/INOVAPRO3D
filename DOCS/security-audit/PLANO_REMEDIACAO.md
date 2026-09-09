# Plano de Remediação — Auditoria de Segurança INOVAPRO3D

> Documento vivo. Atualize a tabela de status e o changelog a cada onda
> concluída. Este arquivo é o que permite retomar o trabalho em qualquer
> sessão futura sem depender de histórico de conversa — se você (humano ou
> Claude) está lendo isso para continuar o trabalho, comece pela seção
> **"Como retomar"** no fim.

Relatório completo dos achados: [`relatorio-auditoria-seguranca.pdf`](./relatorio-auditoria-seguranca.pdf)
(gerado por `gerar_relatorio.py` a partir de `dados_auditoria.py` — ver `README.md` desta pasta).

Branch de trabalho: `security/quotes-storage-lockdown` (criada a partir de `main`,
nunca commitar direto na `main`). PR ainda não aberto:
https://github.com/ReyvisonBraz/INOVAPRO3D/pull/new/security/quotes-storage-lockdown

---

## Status dos achados

| ID  | Categoria                                                                                   | Severidade  | Status                                                                 | Onda   |
| --- | ------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------- | ------ |
| A1  | Storage `quotes/` público (list+get)                                                        | Alta        | ✅ Corrigido e **deployado em produção** (04/09/2026)                  | Onda 0 |
| A2  | Rate limit ausente no runtime Vercel                                                        | Média       | ✅ Corrigido                                                           | Onda 1 |
| A3  | SSRF anônimo (proxy-image, model-metadata)                                                  | Média       | ✅ Corrigido (fechado por auth admin, não por revalidação de redirect) | Onda 1 |
| A4  | Rate limit em memória (inefetivo em serverless)                                             | Baixa       | ✅ Corrigido (causa raiz do A2)                                        | Onda 1 |
| A5  | Personificação de identidade em avaliações (`userName`/`userPhoto` não vinculados ao token) | Baixa       | ⬜ Aberto                                                              | Onda 4 |
| A6  | CSP em `Report-Only`, nunca promovida a enforce                                             | Baixa       | ⬜ Aberto                                                              | Onda 3 |
| A7  | Webhook Stripe sem conferência de valor (existe no código, não em produção)                 | Baixa       | ⬜ Aberto — decisão pendente (consertar ou remover)                    | Onda 2 |
| A8  | `GITHUB_TOKEN` sem `permissions: contents: read` explícito no CI                            | Informativa | ✅ Corrigido                                                           | Onda 0 |

**Zero críticas, zero altas, zero médias em aberto.** Restam 3 baixas.

## Itens operacionais (não são código)

| Item                                                    | Status                                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Deploy de `storage.rules`/`firestore.rules` em produção | ✅ Feito 04/09/2026 — ver changelog                                                                                     |
| Política de TTL em `rateLimits.resetAt` (Firestore)     | ✅ Criada 04/09/2026 via API Admin do Firestore (`ttlConfig` state `CREATING` → `ACTIVE` é automático, não requer ação) |
| Abrir o PR da branch para `main`                        | ⬜ Pendente — link acima                                                                                                |

---

## As ondas (plano completo)

### Onda 0 — concluída

Achados de exposição imediata e baixo custo: A1 (storage rules), A8 (permissions do CI),
mais o relatório em PDF da auditoria completa. Criado `tests/rules/storage.rules.test.ts`
(9 testes, primeira suíte de Storage do projeto).

### Onda 1 — concluída

A2 + A4 juntos (fazer A2 sem A4 seria fazer duas vezes — o limitador em memória não
funciona em serverless) e A3 (SSRF fechado por autenticação admin, já que ambas as
rotas têm exatamente um chamador cada, e são telas de admin).

Criado: `server/_rateLimitDecision.ts` (puro, testado) + `server/_rateLimit.ts`
(Firestore transacional, falha aberto) + `server/_adminAuth.ts` (`verifyAdminRequest`).
Migrados os 4 limitadores em memória existentes; adicionado rate limit onde não
existia (`api/report-error.ts`, `api/orders/create.ts`, `api/notify/new-order.ts`,
`api/model-metadata.ts`, Express `/api/mercadopago/payment-status`). Gate de admin em
`/api/proxy-image` e `/api/model-metadata`, com correção nos dois callers do frontend
(`adminHelpers.tsx`, `useProductAdmin.ts`) para enviar Bearer token — sem isso o painel
admin quebraria.

Commit: `bf372a6`.

### Onda 2 — não iniciada

**Objetivo:** eliminar a _classe_ de falha "a defesa existe num runtime só"
(Express vs. Vercel serverless), não só os sintomas já corrigidos.

- Extrair `withAuth` / `withRateLimit` / `withAdmin` para `server/_middleware/`,
  consumidos pelos dois runtimes (hoje `server.ts` e `api/*.ts` duplicam a lógica
  de auth/rate-limit/admin-gate ponto a ponto).
- Decidir o destino do webhook Stripe (A7): ele existe em código mas não está em
  produção hoje. Duas saídas — (a) publicar `api/stripe/webhook.ts` com o mesmo
  rigor de conferência de valor que o Mercado Pago já tem, ou (b) remover o
  caminho Express morto para não deixar código de pagamento não testado/não
  usado no repositório.

### Onda 3 — não iniciada

**Objetivo:** promover a CSP de `Content-Security-Policy-Report-Only` para
enforce (A6), sem quebrar terceiros que só carregam pós-consentimento de cookies.

- Fechar o loop de feedback do Report-Only primeiro: hoje `cspReports` não tem
  regra de leitura no Firestore nem painel no admin — os relatórios são
  gravados e nunca lidos por ninguém.
- Medir com tráfego real **incluindo aceitar cookies** — GTM/Meta/TikTok só
  carregam pós-consentimento e são os scripts que injetam `<script>` inline que
  o `script-src` baseado em hash bloquearia.
- Promover publicando os dois headers juntos (enforce + Report-Only), preview
  antes de produção. Toca `vercel.json`, `scripts/verify-csp.ts`,
  `scripts/sync-csp-config.ts` e `server.ts` no mesmo commit.

### Onda 4 — não iniciada

**Objetivo:** A5 — `firestore.rules` linhas ~127-136 (`isValidReview`) não
vincula `userName`/`userPhoto` ao usuário autenticado, permitindo gravar uma
avaliação com nome/foto de terceiro.

- Opção A: vincular `userName`/`userPhoto` ao token no momento da escrita.
- Opção B (mais limpa, remove duplicação, mas exige migração de dados
  existentes): resolver esses campos em tempo de leitura a partir de
  `users/{userId}`, em vez de duplicá-los no documento da avaliação.

---

## Changelog

- **2026-09-04** — Firebase CLI conectado (`littlefigther50@gmail.com`, projeto
  `inovapro3d`). Deploy manual de `firestore:rules` + `storage` rules — revelou
  que `storage.rules` (fix do A1) estava commitado desde a Onda 0 mas nunca
  tinha sido publicado; corrigido no ato. TTL criado em `rateLimits.resetAt`
  via API Admin do Firestore (CLI não tem esse comando; `gcloud` não instalado
  — reaproveitado o token OAuth já em cache do `firebase-tools`, descartado
  após uso).
- **2026-09-03/04** — Onda 1 concluída, commit `bf372a6`.
- **2026-09-03** — Onda 0 concluída (commits `25764b6`, `7e47e52`), relatório
  PDF gerado.

---

## Como retomar

Se você está voltando a este trabalho depois de uma pausa (sessão nova, outro
dia, outra pessoa):

1. Leia a tabela **"Status dos achados"** acima — ela é a fonte da verdade de
   o que falta.
2. Confira `git log --oneline main..security/quotes-storage-lockdown` para ver
   exatamente o que já foi commitado nesta branch.
3. Rode `npm run check && npm run test:rules` para confirmar que o estado
   local ainda passa em tudo antes de continuar.
4. Escolha a próxima onda pela tabela (Onda 2 é a próxima, na ordem
   combinada) e comece por ela — cada onda é independente o suficiente para
   ser feita isolada, mas Onda 2 (middleware compartilhado) facilita a Onda 3
   (CSP mexe nos mesmos arquivos de edge/middleware).
5. Ao terminar uma onda: atualize a tabela de status, adicione uma linha no
   changelog com a data, e comite este arquivo junto com o código da onda.

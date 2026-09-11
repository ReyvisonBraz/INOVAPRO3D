# Plano de Remediação — Auditoria de Segurança INOVAPRO3D

> Documento vivo. Atualize a tabela de status e o changelog a cada onda
> concluída. Este arquivo é o que permite retomar o trabalho em qualquer
> sessão futura sem depender de histórico de conversa — se você (humano ou
> Claude) está lendo isso para continuar o trabalho, comece pela seção
> **"Como retomar"** no fim.

Relatório completo dos achados: [`relatorio-auditoria-seguranca.pdf`](./relatorio-auditoria-seguranca.pdf)
(gerado por `gerar_relatorio.py` a partir de `dados_auditoria.py` — ver `README.md` desta pasta).

Branch de trabalho atual: `security/onda2-middleware-compartilhado`.
A branch da Onda 0/1 (`security/quotes-storage-lockdown`) **já foi mergeada
na `main`** no commit `9a5797f` — não há PR pendente dela.

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
| A7  | Webhook Stripe sem conferência de valor (existe no código, não em produção)                 | Baixa       | ✅ Corrigido — caminho Stripe **removido** por inteiro                 | Onda 2 |
| A9  | `api/calculator/extract-slicer` sem rate limit na Vercel (espelho Express tinha)            | Baixa       | ✅ Corrigido — achado durante a Onda 2, fora do relatório original     | Onda 2 |
| A8  | `GITHUB_TOKEN` sem `permissions: contents: read` explícito no CI                            | Informativa | ✅ Corrigido                                                           | Onda 0 |

**Zero críticas, zero altas, zero médias em aberto.** Restam 2 baixas (A5 e A6).

## Itens operacionais (não são código)

| Item                                                    | Status                                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Deploy de `storage.rules`/`firestore.rules` em produção | ✅ Feito 04/09/2026 — ver changelog                                                                                     |
| Política de TTL em `rateLimits.resetAt` (Firestore)     | ✅ Criada 04/09/2026 via API Admin do Firestore (`ttlConfig` state `CREATING` → `ACTIVE` é automático, não requer ação) |
| Abrir o PR da branch da Onda 0/1 para `main`            | ✅ Obsoleto — a branch já foi mergeada em `9a5797f`                                                                     |

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

### Onda 2 — concluída

**Objetivo:** eliminar a _classe_ de falha "a defesa existe num runtime só"
(Express vs. Vercel serverless), não só os sintomas já corrigidos.

Criado `server/_middleware/`, seguindo o padrão de `_rateLimitDecision.ts` —
decisão pura separada do I/O:

- `_guardDecision.ts` — `decideGuards()`, pura. Ordem método → taxa → Admin SDK
  → identidade → papel. 11 testes, cobrindo a ordem e, sobretudo, que o
  fail-open do rate limit **nunca** vaza para a autenticação, que falha fechado.
- `guards.ts` — `runGuards()`, o I/O. Uma `verifyBearerIdentity()` no lugar das
  **7 cópias** manuais de verificação de Bearer que existiam.
- `vercelGuards.ts` — `applyCatalogGuards` (envelope `{error:{code,message}}`)
  e `applyLegacyGuards` (`{error:"texto"}`). Os dois formatos já existiam na
  Vercel e nenhum foi unificado: mudaria o contrato que o frontend consome.
- `expressGuards.ts` — `requireIdentity()` para o `server.ts`.

Migrados os 11 chamadores em 4 commits, por risco crescente (rotas sem
pagamento → Express → notificação → pagamento), com o gate completo entre
cada grupo. `server/_adminAuth.ts` ficou sem chamador e foi removido.

**A7 — decisão: remover, não consertar.** `StripePaymentForm.tsx` e
`src/lib/stripe.ts` tinham zero importadores, o `Checkout.tsx` usa só Mercado
Pago e nunca existiu `api/stripe/*` na Vercel. Mas com `STRIPE_SECRET_KEY`
definida o Express registrava `/api/stripe/webhook` — que marcava pedido
`PAID` a partir de `metadata.orderId`, sem conferir valor — sempre que subia.
Removidas as 2 rotas, os 2 arquivos órfãos, as 3 dependências, as entradas
`*.stripe.com` da CSP e as variáveis `STRIPE_*` da documentação. Mantidos só
os 2 rótulos `"stripe"` em `_orderNotification.ts`/`_emailTemplates.ts`, que
exibem `paymentMethod` de pedidos **históricos**.

**A9 (novo).** Ao migrar, apareceu o mesmo formato do A2 ainda vivo:
`api/calculator/extract-slicer.ts` — o runtime de produção — não tinha rate
limit nenhum, enquanto o espelho Express tinha `rateLimit(12)`. A rota chama a
API Gemini. Corrigido junto (12/min), e ela ainda reimplementava o admin-gate
à mão, duplicação que o próprio `_adminAuth.ts` documentava como dívida.

Efeito colateral, no sentido de fechar divergência: as mensagens de erro de
auth/rate-limit passam a vir de `shared/errors/catalog.ts` nos dois runtimes —
antes o mesmo erro tinha texto diferente em rota diferente. E
`process-payment`/`payment-status` no Express, que **não** checavam
`isAdminSdkConfigured()` antes de autenticar (o espelho da Vercel checava),
passaram a checar.

Commits: `9cc8afd`, `fa12152`, `e0afffc`, `b369289`, `1c717c0`.

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

- **2026-09-10/11** — Onda 2 concluída (commits `9cc8afd`, `fa12152`,
  `e0afffc`, `b369289`, `1c717c0`). Guardas compartilhados em
  `server/_middleware/`, 7 cópias de verificação de token reduzidas a uma,
  11 rotas migradas. A7 resolvido por remoção do caminho Stripe. Achado e
  corrigido o A9 (`extract-slicer` sem rate limit na Vercel), que não estava
  no relatório original — mesmo formato do A2, o que confirma que tratar a
  classe, e não só os sintomas, era a leitura certa para esta onda.
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
2. Confira `git log --oneline main..<branch de trabalho>` para ver exatamente
   o que já foi commitado fora da `main`.
3. Rode `npm run check && npm run test:rules` para confirmar que o estado
   local ainda passa em tudo antes de continuar.
4. **A próxima é a Onda 3 (CSP enforce).** A Onda 2 entregou o
   `server/_middleware/` que ela ia precisar de qualquer forma, e já removeu
   as entradas `*.stripe.com` da política — permissão morta que a Onda 3
   herdaria e teria de decidir o que fazer.
5. Ao terminar uma onda: atualize a tabela de status, adicione uma linha no
   changelog com a data, e comite este arquivo junto com o código da onda.

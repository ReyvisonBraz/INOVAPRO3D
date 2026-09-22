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
| A5  | Personificação de identidade em avaliações (`userName`/`userPhoto` não vinculados ao token) | Baixa       | ✅ Corrigido — identidade vem do token                                 | Onda 4 |
| A6  | CSP em `Report-Only`, nunca promovida a enforce                                             | Baixa       | ✅ Corrigido — política em **enforce**                                 | Onda 3 |
| A7  | Webhook Stripe sem conferência de valor (existe no código, não em produção)                 | Baixa       | ✅ Corrigido — caminho Stripe **removido** por inteiro                 | Onda 2 |
| A9  | `api/calculator/extract-slicer` sem rate limit na Vercel (espelho Express tinha)            | Baixa       | ✅ Corrigido — achado durante a Onda 2, fora do relatório original     | Onda 2 |
| A8  | `GITHUB_TOKEN` sem `permissions: contents: read` explícito no CI                            | Informativa | ✅ Corrigido                                                           | Onda 0 |
| A10 | `materials` com leitura pública — custo de compra, saldo, fornecedor e lote do filamento    | Média       | ✅ Corrigido — `read: if isAdmin()`                                    | Onda 5 |
| A11 | Storage: `read: if true` concede `list`, e o bucket inteiro da vitrine era enumerável       | Baixa       | ✅ Corrigido — `get` público, `list` admin                             | Onda 5 |
| A12 | Campos internos no documento público do produto (`sourceUrl`, `productionMaterial`)         | Baixa       | ✅ Corrigido — movidos para `productsInternal`                         | Onda 5 |
| A13 | Rascunho (`active: false`) e `settings/global` legíveis por visitante                       | Baixa       | ✅ Corrigido — regra de `list` e `settings` fechadas                   | Onda 5 |

**Todos os achados do relatório estão fechados**, e os quatro da Onda 5 —
levantados fora do relatório, ao inventariar a superfície anônima — também.
Restam apenas itens operacionais, fora do código; ver a tabela abaixo, e o
**risco aceito** registrado na seção da Onda 5.

## Itens operacionais (não são código)

| Item                                                        | Status                                                                                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Deploy de `storage.rules`/`firestore.rules` em produção     | ✅ Feito 04/09/2026 — ver changelog                                                                                     |
| Política de TTL em `rateLimits.resetAt` (Firestore)         | ✅ Criada 04/09/2026 via API Admin do Firestore (`ttlConfig` state `CREATING` → `ACTIVE` é automático, não requer ação) |
| Abrir o PR da branch da Onda 0/1 para `main`                | ✅ Obsoleto — a branch já foi mergeada em `9a5797f`                                                                     |
| Desligar o Web Analytics no painel do Cloudflare            | ⬜ **Pendente — só o dono do projeto pode fazer.** Ver Onda 3.                                                          |
| Revogar a `STRIPE_SECRET_KEY` e limpar `STRIPE_*` na Vercel | ⬜ **Pendente — só o dono do projeto pode fazer.** O código foi removido na Onda 2, a credencial continua válida.       |

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

### Onda 3 — concluída

**Objetivo:** promover a CSP de `Report-Only` para enforce (A6).

**A espera que o plano previa não era mais necessária.** Ele mandava medir com
tráfego real e cookies aceitos, porque GTM/Meta/TikTok só carregam
pós-consentimento. Mas `VITE_GA4_ID`, `VITE_META_PIXEL_ID` e
`VITE_TIKTOK_PIXEL_ID` estão **os três vazios** — esses scripts nunca carregam,
não havia o que medir.

**O painel de `cspReports` também não foi necessário.** O plano pedia fechar o
loop de feedback antes. Na prática, um script pontual com o Admin SDK leu a
coleção em segundos: eram só **2 fingerprints, 65 violações**, ambas de
produção. Construir uma tela de admin para dois documentos seria
sobre-engenharia; a decisão foi tomada com o dado na mão.

Os dois violadores, e o que foi feito:

| Violação                | Origem                                       | Decisão                                                                                                                                     |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `style-src-elem` (28x)  | `web.webpushs.com` — CSS do prompt SendPulse | **Liberado.** O host já estava em `script-src`/`connect-src`, faltava em `style-src`. Sem isso, o enforce deixaria o prompt sem formatação. |
| `script-src-elem` (37x) | `static.cloudflareinsights.com`              | **Não liberado**, por decisão do dono (não usa a estatística). Há teste garantindo que uma inclusão futura seja deliberada.                 |

**Correção ao plano original: NÃO publicar os dois headers juntos.** O plano
dizia "publicando os dois headers juntos (enforce + Report-Only)". Isso está
errado: em modo enforce, `report-uri`/`report-to` **já enviam relatório** do que
é bloqueado. O par com a mesma política duplicaria cada violação no coletor —
dobro de requisições em `/api/csp-report` e contadores inflados em 2×. Publicar
dois só faria sentido com o Report-Only carregando uma política _mais estrita_,
como candidata ao passo seguinte. Há teste travando isso.

Criada a constante `CSP_HEADER_NAME` em `cspPolicy.ts`: o nome do header estava
repetido em texto em 5 lugares (`vercel.json`, `server.ts`, os dois scripts de
CSP e o teste) — a mesma classe de duplicação que a Onda 2 atacou.

Corrigido de passagem: o `<script>` do SendPulse no `index.html` usava URL
protocolo-relativa (`//web.webpushs.com`). Em produção resolvia para HTTPS e
funcionava, mas em teste local sobre HTTP virava `http://` e era bloqueado pela
política. Fixado em `https://`. Não afeta os hashes (a tag tem `src`).

### Onda 4 — concluída (18/09/2026)

**Objetivo:** A5 — `isValidReview` não vinculava `userName`/`userPhoto` ao
usuário autenticado: qualquer cliente logado podia assinar a avaliação como
"InovaPro3D Oficial" e apontar a foto para uma URL arbitrária, que a vitrine
pública carrega em `<img>` para todo visitante.

Escolhida a **opção A** (vincular ao token). A opção B — resolver os campos em
tempo de leitura a partir de `users/{userId}` — foi descartada porque
`users/{uid}` só é legível pelo dono e por admin, e a lista de avaliações é
pública: ninguém conseguiria ler o nome do autor.

Duas mudanças que se sustentam mutuamente:

- `firestore.rules` — `isOwnReviewIdentity()` exige `userPhoto` idêntico à
  claim `picture` e `userName` dentro do conjunto que o token autoriza
  (`name` → parte local do `email` → `"Cliente"`), espelhando o fallback do
  cliente. Campo ausente/`null` continua aceito.
- `useReviews.submit` — a identidade passa a vir de `getIdTokenResult(u, true)`,
  não de `user.displayName`/`user.photoURL`. O SDK atualiza esses dois
  localmente no ato de um `updateProfile`, mas a claim do token só muda no
  refresh; ler do objeto local faria a regra negar a avaliação de quem tivesse
  acabado de trocar o nome.

4 testes novos em `tests/rules/firestore.rules.test.ts` (nome do token aceito,
nome forjado negado, foto de fora negada, fallback do e-mail aceito).

### Onda 5 — concluída (19/09/2026)

**Origem:** não veio do relatório. Veio de inventariar a pergunta que o
relatório não fazia — _o que exatamente um visitante deslogado consegue ler?_ —
e de responder com requisição real, sem token, contra produção (Firestore e
Storage REST). O relatório procurava vetores de ataque; sobrou o que estava
aberto por configuração, não por vulnerabilidade.

O que a sonda anônima devolveu antes da onda:

| Superfície          | Antes                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------- |
| `materials`         | 200 — 3 documentos com `pricePerKg`, `stockGrams`, `reservedGrams`, `supplier`, `batch` |
| Storage `products/` | 11 arquivos enumerados, com o UID do admin no caminho                                   |
| `products`          | 20 documentos com `sourceUrl` (procedência do modelo) e `productionMaterial`            |
| `settings/global`   | legível, e sem nenhum leitor público no código                                          |

**A10 — `materials`.** Mesma natureza de `printers` e `calculatorTemplates`,
fechados na Onda 1: ficha de estoque, não item de vitrine. Passou batido
porque o nome sugere catálogo. Os únicos leitores são a calculadora
(`/calculadora`, rota `requireAdmin`) e o painel; o servidor usa o Admin SDK.

**A11 — enumeração do bucket.** `read` no Storage concede `get` **e** `list` —
a mesma lição que fechou `quotes/` na Onda 0, só não aplicada aos prefixos de
vitrine. `get` segue público (é dele que depende todo `getDownloadURL`) e
`list` virou admin. Não há um único `list`/`listAll` no app.

**A12 — campos internos do produto.** Firestore não tem segurança por campo:
para fechar um campo, ele sai do documento. `sourceUrl` e `productionMaterial`
passaram a morar em `productsInternal/{id}`, admin-only. `src/services/products.ts`
é o único lugar que divide (na gravação) e junta (na leitura) as duas metades,
com `PRODUCT_INTERNAL_FIELDS` como lista única — então o resto do painel não
mudou. A migração roda sozinha no carregamento do painel: é idempotente e vira
no-op depois que o último produto migra.

**A13 — rascunhos e `settings/global`.** `global` saiu da lista de leitura
pública: nenhum caminho público o lê, e o tipo `GlobalSettings` tem índice
livre `[key: string]: unknown` — qualquer campo novo ali viraria público sem
ninguém notar. Já `products` passou a negar `active: false`.

**O que aprendemos sobre `list` e que vale para a próxima regra** (está
comentado em `firestore.rules`, mas registrado aqui porque custou um teste
vermelho para aparecer): `get` e `list` não são avaliados do mesmo jeito.
`get` roda contra o documento real; `list` é analisado contra a **consulta**, e
só passa quando as restrições dela provam a condição. Escrever
`resource.data.get('active', true) != false` no `list` não é conservador — a
análise não liga esse `get()` ao `where` da consulta, e o resultado observado
no emulador foi a **consulta sem filtro nenhum ser aceita**, devolvendo os
rascunhos. Só a forma direta `resource.data.active == true` é reconhecida. A
contrapartida é que documento sem o campo não volta em listagem (igualdade não
casa com campo ausente), embora continue abrindo por id.

**Risco aceito — avaliações ocultadas.** `hidden: true` some da vitrine por
filtro de UI (`useReviews.ts`), mas o documento continua legível por consulta
direta. Fechar exigiria backfill do campo (hoje ele não existe nos documentos),
`where('hidden','==',false)` na consulta e índice composto — e um backfill que
falhe num único documento derruba a lista de avaliações do produto inteiro. A
decisão foi não pagar esse preço agora. Fica aqui para não ser confundido com
esquecimento.

**Ordem de deploy (importa):** a aplicação **antes** das regras. A regra nova de
`list` exige `where('active','==',true)`, que só existe na versão nova do
front; publicar as regras primeiro deixa o catálogo vazio para todo visitante.

11 testes novos entre as duas suítes de regra (`materials`, `products` com
rascunho e legado, `productsInternal`, `settings`, enumeração do Storage).

---

## Changelog

- **2026-09-19** — Onda 5 concluída; A10–A13 fechados. Achados novos, vindos do
  inventário da superfície anônima (o relatório original não fazia essa
  pergunta). Registrados também o risco aceito das avaliações ocultadas e a
  diferença de avaliação entre `get` e `list` nas regras, que decidiu a forma
  da regra de `products`. **Deploy em duas etapas: aplicação antes das regras.**
- **2026-09-18** — Onda 4 concluída; A5 fechado. Com isso **todos os achados do
  relatório de auditoria estão corrigidos**. O que resta é operacional e fora do
  código: desligar o Web Analytics no Cloudflare e revogar/remover as variáveis
  `STRIPE_*` (o caminho Stripe saiu do código na Onda 2, mas a chave em si
  continua válida até ser revogada no painel).
- **2026-09-13** — Onda 3 concluída. CSP promovida a **enforce**; A6 fechado.
  Decisão tomada a partir dos relatórios reais de produção (2 fingerprints),
  não de uma campanha de medição — que o plano previa mas que os pixels
  desligados tornaram desnecessária. Fica **pendente e fora do código**:
  desligar o Web Analytics no painel do Cloudflare. Enquanto isso não for
  feito, o Cloudflare segue injetando o beacon em toda página, o navegador
  segue bloqueando e o relatório segue sendo gravado — ruído permanente no
  canal que serve justamente para enxergar violações reais.
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
4. **Não resta nenhuma onda de código.** O que está pendente são os itens
   operacionais da tabela acima — o do Cloudflare afeta a qualidade dos
   relatórios de CSP daqui em diante, e a chave da Stripe segue válida até ser
   revogada no painel. A Onda 5 também deixou um pendente de deploy: se as
   regras dela ainda não subiram, **publique a aplicação primeiro** (ver a
   seção da Onda 5).
5. Se for procurar achado novo, o método da Onda 5 rendeu quatro: em vez de
   ler o código procurando vulnerabilidade, consulte a produção **sem token**
   (Firestore e Storage REST com a chave pública do front) e confira coleção
   por coleção o que volta 200. O que está aberto por configuração não aparece
   numa leitura de código; aparece na resposta.
6. Ao terminar uma onda: atualize a tabela de status, adicione uma linha no
   changelog com a data, e comite este arquivo junto com o código da onda.

# Plano de endurecimento de segurança

## Objetivo

Fechar as falhas encontradas na auditoria de 29 de agosto de 2026 e eliminar a classe de erro que
as produziu. Este documento registra a evidência de cada problema, a decisão tomada, os passos de
execução e o critério de aceite — para que qualquer retomada comece pela leitura do plano, e não
por uma nova investigação do repositório.

Complementa `MERCADO_PAGO_HARDENING_UX_PLAN.md`, que já rastreia CSP bloqueante (item 9) e rate
limiting distribuído (item 7). Onde houver sobreposição, este documento é a fonte de detalhe e
aquele permanece como índice do checkout.

## Princípios do trabalho

- **Falhar fechado.** Ausência de configuração, de token ou de credencial nega o acesso. Nunca
  degrada para "sem verificação".
- **Nada que sai em e-mail ou Telegram vem do corpo da requisição.** Identidade vem do token
  verificado; valores vêm do documento gravado pelo servidor.
- **Todo canal que renderiza markup recebe dado escapado.** E-mail e Telegram são canais de HTML.
- **Paridade entre runtimes.** O que vale para o Express (`server.ts`) vale para a função da Vercel
  (`api/`). Lógica compartilhada mora em um módulo único.
- **Regra de segurança que o código não exerce é comentário.** O que o comentário promete, a regra
  precisa impor.
- **Mudança de segurança entra com teste.** A regressão silenciosa é o risco real.

## Estado atual comprovado

A Fase 1 foi executada e revisada em 30 de agosto de 2026: `npm run check` completo, 348 testes
passando (23 neste pacote), build limpo. O smoke test local confirmou que as rotas de notificação,
criação de pedido e Stripe recusam chamadas anônimas com `401`; o Mercado Pago, desabilitado no
ambiente local, falha fechado com `503`. Nenhum pedido ou pagamento real foi criado.

A revisão também ampliou a regra de identidade para os provedores de pagamento: Stripe e Mercado
Pago ignoram e-mails recebidos no corpo ou preservados em pedidos legados. Recibos e dados do
pagador só usam a claim atual `email_verified` do token Firebase.

Três fatos levantados na auditoria mudam a prioridade do que resta e precisam ficar registrados:

1. **A integração Stripe não existe na Vercel.** Não há `api/stripe/`. Em produção,
   `/api/stripe/create-payment-intent` e `/api/stripe/webhook` retornam 404 — o rewrite de
   `vercel.json` aponta para uma função que não foi escrita. O Stripe só funciona no Express
   auto-hospedado. Consequência: o endurecimento do webhook Stripe (item 6) é **pré-requisito para
   ativar Stripe em produção**, não correção de algo em uso.
2. **O recurso de cupom é código morto no fluxo do cliente.** `src/hooks/useCoupon.ts` não é
   importado em lugar nenhum, e tanto `server.ts` quanto `api/orders/create.ts` gravam
   `couponCode: null` fixo. Restringir a leitura da coleção é risco zero hoje.
3. **A inscrição na newsletter está quebrada para todo visitante.**
   `src/components/layout/Footer.tsx` faz `getDocs` em `newsletter` para checar duplicidade, mas a
   regra é `allow read: if isAdmin()`. A leitura é negada, o `catch` engole a exceção e o visitante
   recebe "Não foi possível concluir". É um bug funcional descoberto pela análise de segurança.

## Estado de execução

Atualizar esta tabela no mesmo commit que muda o código.

| #   | Ponto                                      | Estado    | Onde vive no código                                            |
| --- | ------------------------------------------ | --------- | -------------------------------------------------------------- |
| 1   | Relay de e-mail em `notify/new-order`      | Concluído | `api/notify/new-order.ts` + `api/_orderNotification.ts`        |
| 2   | Identidade em pedidos e pagamentos         | Concluído | `api/orders/create.ts`, `api/mercadopago/`, `server.ts`        |
| 3   | Injeção de HTML em e-mail/Telegram         | Concluído | `api/_escapeHtml.ts` + `_emailTemplates.ts`, `_reportError.ts` |
| 4   | Fail-open do sentinela `"unchecked"`       | Concluído | `server.ts` (`verifyToken`)                                    |
| 5   | Auditar credenciais órfãs e remover `.env` | Concluído | auditoria dos provedores + `.env.example`                      |
| 6   | Webhook Stripe sem valor/idempotência      | Pendente  | `server.ts`; falta `api/stripe/`                               |
| 7   | CSP em `Report-Only` na produção           | Pendente  | `vercel.json`                                                  |
| 8   | SSRF por redirecionamento nos proxies      | Pendente  | `server.ts`, `api/_modelMetadata.ts`                           |
| 9   | Regras do Firestore com lacunas            | Pendente  | `firestore.rules`                                              |
| 10  | Guarda explícita do modo do Express        | Pendente  | `server.ts`                                                    |
| 11  | Leitura pública de orçamentos no Storage   | Pendente  | `storage.rules`                                                |
| 12  | Rate limiting distribuído                  | Pendente  | — (espelha item 7 do plano do checkout)                        |
| 13  | Dependências vulneráveis                   | Pendente  | `firebase-admin` e cadeia `gaxios`/`uuid`                      |
| 14  | Cabeçalhos e limites do Express            | Pendente  | `server.ts`                                                    |
| 15  | `role` em custom claims                    | Pendente  | `firestore.rules`, `storage.rules`, admin                      |

---

# FASE 1.7 — Auditoria e remoção de credenciais legadas (concluída)

Concluída em 30 de agosto de 2026. A validação dos valores, feita sem registrá-los em logs, corrigiu
uma premissa da auditoria inicial: não havia credencial Supabase válida a rotacionar e o token
Mercado Pago legado já estava revogado.

## Problema

O arquivo `.env` misturava placeholders de uma antiga stack Supabase/Postgres, um segredo JWT local
sem consumidor no código e um segundo par de credenciais Mercado Pago com nomes que a aplicação
não lê. Mesmo ignorado pelo Git, manter esse arquivo tornava ambígua a origem da configuração e
permitia que `NODE_ENV=development` alterasse silenciosamente o runtime auto-hospedado.

## Evidência

Evidência verificada:

- `.env` e `.env.local` nunca foram versionados; ambos são ignorados por `.gitignore`.
- `DATABASE_URL`, `DB_HOST` e `DB_PASSWORD` continham marcadores de exemplo, e a service-role key
  Supabase estava vazia. A listagem oficial de projetos não possui a referência `xxxxx` do arquivo.
- O token `MERCADO_PAGO_ACCESS_TOKEN` legado respondeu `403` em `GET /users/me`; o token ativo de
  `.env.local`, com o nome correto `MERCADOPAGO_ACCESS_TOKEN`, respondeu `200`. Eles são distintos.
- `vercel env ls` não contém `SUPABASE_*`, `JWT_SECRET`, `DATABASE_URL`, `DB_*` nem as variáveis
  legadas de SendPulse. Firebase e GitHub permanecem corretamente vinculados a `inovapro3d`.
- A configuração realmente consumida pelo projeto vive em `.env.local` e nas variáveis cifradas da
  Vercel. O arquivo local passou a ter permissão `0600`.
- `npm run check` passou com 348 testes e o smoke local respondeu `200` na aplicação/health e `401`
  na notificação anônima. Sem `NODE_ENV=development`, o build voltou a minificar corretamente — o
  chunk React caiu de aproximadamente 469 kB para 264 kB e o painel admin de 655 kB para 341 kB.

## Passos

1. Validar cada valor sem expô-lo e identificar o provedor de origem.
2. Confirmar que nenhuma variável legada existe na Vercel.
3. Consultar os provedores oficiais antes de revogar: Supabase era placeholder e Mercado Pago já
   estava revogado, portanto nenhuma credencial ativa precisou ser alterada.
4. Apagar o `.env`; a configuração local passa a viver exclusivamente em `.env.local`.
5. Alinhar `.env.example` às variáveis realmente lidas e restringir `.env.local` a `0600`.

## Critério de aceite

- `.env` não existe e nenhum arquivo de ambiente versionado contém as variáveis legadas.
- `.env.example` documenta configuração cliente/servidor sem exemplos que pareçam segredos reais.
- `npm run check` e o smoke test local passam usando somente `.env.local`.

---

# FASE 2 — Alto

## Item 10 · Guarda explícita do modo do Express (parcialmente concluído)

O arquivo que forçava `development` já foi removido na Fase 1.7. Resta tornar a escolha do modo
explícita no servidor auto-hospedado.

### Problema

`server.ts` só aplica os cabeçalhos de segurança (CSP, HSTS, X-Frame-Options, Referrer-Policy,
Permissions-Policy) no ramo `NODE_ENV === "production"`. No ramo contrário ele monta o **middleware
de desenvolvimento do Vite**. Antes da Fase 1.7, o `.env` forçava esse modo. Esse risco imediato foi
removido, mas qualquer host auto-hospedado que não exporte `NODE_ENV` ainda assume desenvolvimento
sem emitir um aviso específico.

Na Vercel a plataforma define a variável, então o risco é do caminho auto-hospedado (`npm start`).

### Passos

1. **Concluído:** remover `NODE_ENV` do `.env` junto com o próprio arquivo na Fase 1.7.
2. Em `server.ts`, tornar a escolha explícita e ruidosa: derivar `isProduction` uma única vez e
   registrar no log qual modo foi escolhido e de onde veio a variável.
3. Adicionar guarda: se `SERVE_STATIC=true` ou se existir `dist/` e `NODE_ENV` não for
   `production`, emitir aviso claro na saída em vez de subir o Vite silenciosamente.

### Critério de aceite

- `NODE_ENV=production npm start` responde com os cinco cabeçalhos.
- Subir sem `NODE_ENV` definido imprime aviso explícito informando o modo.

---

## Item 7 · CSP bloqueante

### Problema

`vercel.json` publica a política como `Content-Security-Policy-Report-Only` — que reporta e não
bloqueia. Na produção real não há CSP em vigor. A versão enforced existe apenas no ramo
auto-hospedado do `server.ts`. Ambas trazem `'unsafe-inline'` em `script-src`, o que esvazia a
proteção contra XSS mesmo quando ativa.

### Evidência

`index.html` tem **três blocos de script inline** que precisam continuar rodando antes do primeiro
paint:

| Linha | Script                 | Por que é inline                                        |
| ----- | ---------------------- | ------------------------------------------------------- |
| 10    | Recuperação de origem  | Limpa `localStorage` legado antes de qualquer navegação |
| 71    | Bootstrap de tema      | Evita flash de tema errado no primeiro paint            |
| 144   | Oculta `initial-shell` | Decide o shell inicial pela rota antes do React montar  |

Há também um `<style>` inline com o CSS crítico do shell.

### Decisão

**Hashes, não nonce.** A Vercel serve `index.html` como arquivo estático — não há servidor por
requisição para injetar um nonce. Hash SHA-256 de cada script inline é a única opção que funciona
em host estático.

**Manter `'unsafe-inline'` em `style-src`.** O React aplica estilos via atributo `style` em vários
componentes e há CSS crítico inline. Remover exigiria refatoração ampla com retorno baixo — estilo
inline não executa código. Registrar como decisão consciente, não como pendência.

**Nunca calcular os hashes à mão.** Hash escrito manualmente apodrece em silêncio: alguém edita o
script inline, o hash não bate, a CSP bloqueia o bootstrap de tema e o site quebra em produção sem
erro óbvio. A geração precisa ser automática no build.

### Passos

1. Criar `scripts/generate-csp.mjs`: lê `dist/index.html` após o build do Vite, extrai cada
   `<script>` sem `src`, calcula `sha256-<base64>` e monta a diretiva `script-src`.
2. Emitir o resultado em `dist/_headers` ou reescrever a chave em `vercel.json` — decidir na
   execução qual mecanismo a Vercel honra para o projeto. Encadear no `npm run build`.
3. Criar `api/csp-report.ts`: recebe relatórios de violação, aplica rate limit, grava resumo
   (diretiva violada + URI bloqueada, sem dado pessoal) e registra via `logEvent`.
4. Adicionar `report-uri /api/csp-report; report-to csp` à política **Report-Only** e publicar.
5. **Observar tráfego real** por pelo menos sete dias. Cada violação é ou um script legítimo faltando
   na política, ou um problema real.
6. Verificar explicitamente os pontos de terceiro que a política precisa cobrir: pixels (GA4, Meta,
   TikTok), `web.webpushs.com` e o service worker `public/sp-push-worker-fb.js` — confirmar se
   `worker-src`/`manifest-src` precisam de diretiva própria em vez de herdar `default-src 'self'`.
7. Com o relatório limpo, publicar `Content-Security-Policy` enforced **em preview primeiro**.
   Validar navegação, login Google, checkout Pix e painel admin.
8. Promover para produção e remover o cabeçalho `Report-Only`.
9. Sincronizar a constante `CSP` do `server.ts` com a política final.

### Critério de aceite

- `script-src` sem `'unsafe-inline'`, com um hash por script inline.
- Sete dias de relatório sem violação atribuível a script legítimo.
- Fluxo completo validado em preview com a política enforced.
- `curl -sI https://www.inovapro3d.com.br | grep -i content-security-policy` retorna o cabeçalho
  enforced e nenhum `Report-Only`.

### Risco e reversão

Quebra de pixel de terceiro é o risco provável. A reversão é publicar novamente como `Report-Only`
— mudança de uma linha em `vercel.json`, sem redeploy de código.

---

## Item 6 · Webhook Stripe

### Problema

Em `server.ts`, `payment_intent.succeeded` marca o pedido como `PAID` sem validar que o valor pago
corresponde ao total, sem idempotência (o mesmo evento reprocessado reescreve o pedido), sem
transação e sem máquina de estados. Nenhum outro tipo de evento é tratado — falha e estorno passam
despercebidos.

O contraste é interno: `api/mercadopago/_webhookService.ts` faz **tudo isso corretamente**. A
assimetria é o problema, não a ausência de conhecimento no time.

### Decisão

Reaproveitar o padrão do Mercado Pago em vez de inventar outro. A decisão de transição já está
isolada em `api/mercadopago/_webhookDecision.ts` como função pura testável — o Stripe ganha um
equivalente com a mesma forma, e a máquina de estados de `shared/payments/paymentStateMachine.ts`
é reutilizada.

Como o Stripe hoje **não existe na Vercel**, este item tem duas metades. Fazer a primeira sempre; a
segunda apenas se o Stripe for realmente ativado em produção.

### Passos — parte A (endurecer o que existe)

1. Criar `api/stripe/_webhookDecision.ts`, função pura espelhando a do Mercado Pago: recebe o evento
   e o pedido, devolve `updated` / `already_processed` / `amount_mismatch` / `ignored_stale`.
2. Validar `paymentIntent.amount === Math.round(order.total * 100)` e `currency === "brl"`.
   Divergência grava evento de auditoria em `paymentEvents` e **não** altera o pedido.
3. Idempotência por `event.id`: dentro de uma transação, verificar se já existe registro em
   `paymentEvents` para aquele id; se existir, sair como `already_processed`.
4. Envolver leitura e escrita em `runTransaction`, como no Mercado Pago.
5. Tratar `payment_intent.payment_failed` e `charge.refunded`, hoje ignorados.
6. Testes espelhando `_webhookDecision.test.ts`: evento repetido, valor divergente, notificação
   atrasada, transição válida.

### Passos — parte B (somente se ativar Stripe em produção)

7. Criar `api/stripe/webhook.ts` e `api/stripe/create-payment-intent.ts` reaproveitando a decisão
   pura da parte A. Atenção ao corpo cru: a verificação de assinatura exige o payload sem parse, e
   na Vercel isso requer desabilitar o body parser (`export const config = { api: { bodyParser: false } }`).
8. Registrar a URL do webhook no painel do Stripe e validar com evento de teste.

### Critério de aceite

- Reenviar o mesmo evento duas vezes atualiza o pedido uma vez só.
- Evento com valor divergente deixa o pedido intacto e grava `amount_mismatch` em `paymentEvents`.
- Suíte de testes da decisão cobre os quatro desfechos.
- Se a parte B for feita: `/api/stripe/webhook` responde 400 a assinatura inválida e 200 a evento
  legítimo.

---

## Item 8 · SSRF por redirecionamento

### Problema

`/api/proxy-image` (`server.ts`) e `readModelMetadata` (`api/_modelMetadata.ts`) validam o host
**antes** do fetch, mas usam `redirect: "follow"`. Um host permitido — ou comprometido, ou que
aceite URL de redirecionamento aberto — pode devolver 302 para `169.254.169.254` (metadados de
nuvem) ou para um IP interno, e a requisição segue com a validação já vencida.

Agravantes: `api/_modelMetadata.ts` aceita `http:` além de `https:`, e `/api/model-metadata` não tem
rate limit nem autenticação.

### Decisão

Um módulo único de fetch seguro, usado pelos dois pontos. Seguir redirecionamento manualmente,
revalidando o host a cada salto.

### Passos

1. Criar `api/_safeFetch.ts` exportando `safeFetch(url, { isAllowedHost, maxRedirects: 3 })`:
   - aceitar apenas `https:`;
   - `redirect: "manual"`, seguindo em laço próprio;
   - revalidar o host contra a allowlist **a cada salto**;
   - resolver o hostname e recusar faixas privadas e especiais: `10/8`, `172.16/12`, `192.168/16`,
     `127/8`, `169.254/16`, `::1`, `fc00::/7`, `fe80::/10`;
   - limite de tamanho e timeout explícitos.
2. Trocar os dois `fetch` por `safeFetch`.
3. Remover `http:` da lista aceita em `api/_modelMetadata.ts`.
4. Aplicar `rateLimit` a `/api/model-metadata` no Express e checar o equivalente na função
   serverless `api/model-metadata.ts`.
5. Testes: host permitido que redireciona para IP privado → bloqueado; cadeia acima de 3 saltos →
   bloqueada; `http:` → recusado.

### Critério de aceite

- Teste automatizado cobrindo redirecionamento para `169.254.169.254` com verdicto de bloqueio.
- Importação legítima do MakerWorld continua funcionando (regressão manual).

---

## Item 9 · Regras do Firestore

Quatro correções independentes. Todas de baixo risco — a investigação confirmou que o cliente já se
comporta como as regras deveriam exigir.

### 9a · Cupons deixam de ser públicos

`allow read: if true` expõe todos os códigos, percentuais, limites e validades a qualquer visitante.

`src/hooks/useCoupon.ts` é o único leitor no fluxo do cliente e **não é importado em lugar nenhum**;
`couponCode` é `null` fixo nos dois criadores de pedido. Trocar por `allow read: if isAdmin()` não
afeta nada em uso.

Quando o recurso for construído, a validação precisa ser **server-side**, dentro de
`orders/create`, junto do recálculo do total — não uma consulta do cliente.

### 9b · Tickets exigem autenticação

`allow create: if isValidTicketCreate(incoming())` não exige `isSignedIn()`. Escrita anônima
ilimitada — spam e custo de Firestore.

Nenhum ponto do cliente cria tickets hoje (só leitura e atualização pelo admin), então adicionar
`isSignedIn() &&` é risco zero. Se um formulário de contato anônimo entrar no roadmap, o caminho
correto é um endpoint com rate limit e verificação anti-abuso, não a abertura da regra.

### 9c · Newsletter — corrigir a regra e o bug junto

Estado atual: `allow create` sem autenticação, `createdAt` não validado, e a checagem de duplicidade
do `Footer.tsx` **é negada pela regra de leitura**, quebrando a inscrição para todo visitante.

Decisão: usar o e-mail normalizado como ID do documento. A unicidade passa a ser garantida pelo
próprio Firestore, sem necessidade de leitura prévia.

Passos: trocar `addDoc` por `setDoc(doc(db, "newsletter", idDerivadoDoEmail))` e remover o
`getDocs`; na regra, exigir `createdAt == request.time`, validar formato de e-mail e permitir apenas
`create` (sem `update`, para que reinscrever não sobrescreva o registro original).

### 9d · IDs determinísticos em avaliações e votos

Os comentários prometem "1 avaliação por usuário por produto" e "1 voto por usuário por avaliação",
mas as regras não impõem o ID. Como estão, dá para criar avaliações e votos ilimitados variando o ID
do documento — review bombing e vote stuffing.

O cliente **já usa o esquema determinístico** (`src/hooks/useReviews.ts`): `${productId}_${uid}`
para avaliações e `${reviewId}__${uid}` (dois underscores) para votos. Basta a regra passar a exigir
o que o cliente já faz — nenhuma mudança de cliente é necessária:

```
// reviews
allow create: if ... && reviewId == incoming().productId + '_' + request.auth.uid;
// reviewVotes
allow create, update: if ... && voteId == incoming().reviewId + '__' + request.auth.uid;
```

Aplicar o mesmo raciocínio a `reviewReports`, hoje sem limite por denunciante.

### Critério de aceite (item 9)

- Suíte do emulador (`@firebase/rules-unit-testing`) cobrindo: leitura de cupom por anônimo negada;
  criação de ticket anônimo negada; segunda avaliação do mesmo usuário no mesmo produto negada;
  voto com ID divergente negado; inscrição na newsletter por anônimo aceita e reinscrição não
  sobrescreve.
- Inscrição na newsletter funcionando de ponta a ponta pela interface.
- Avaliar, editar e remover avaliação continuam funcionando.

---

## Item 11 · Orçamentos no Storage

`storage.rules` publica `/quotes/{allPaths=**}` com `allow read: if true`. Leitura pública inclui
listagem — dá para enumerar imagens de orçamento de clientes.

**Verificar antes de fechar:** as imagens entram nos documentos impressos
(`src/components/print/`). Confirmar se a renderização usa URL assinada ou leitura direta
autenticada; se depender de leitura pública, migrar para URL assinada de validade curta antes de
restringir a regra. Fechar sem essa verificação quebra a ficha de produção.

---

# FASE 3 — Estrutural

## Item 12 · Rate limiting distribuído

O limitador atual é um `Map` em memória. Na Vercel cada invocação tem processo próprio, então **não
limita nada em produção**. Sem `app.set('trust proxy')`, `req.ip` é o IP do proxy: ou todos os
usuários compartilham o mesmo balde, ou o valor vem de `X-Forwarded-For` e é forjável. O `Map`
também cresce sem limite.

Espelha o item 7 de `MERCADO_PAGO_HARDENING_UX_PLAN.md` — executar de forma coordenada.

Passos: adotar armazenamento compartilhado (Upstash Redis ou equivalente); configurar `trust proxy`
com o número correto de saltos; derivar a chave de `uid` quando houver token e de IP quando não
houver; aplicar às rotas hoje descobertas (`/api/model-metadata`, webhooks, `/api/csp-report`).

## Item 13 · Dependências

`npm audit` reporta 9 vulnerabilidades (8 moderadas, 1 alta) na cadeia
`firebase-admin` → `@google-cloud/firestore` → `google-gax` → `gaxios` → `uuid`.

Tentar `npm audit fix` sem `--force` primeiro. `--force` propõe `firebase-admin@10.3.0`, uma
regressão de versão maior que quebraria a API em uso — **não aceitar**. Se o transitivo não
resolver, usar `overrides` no `package.json` fixando `uuid` e `gaxios` em versões corrigidas, e
validar com a suíte completa.

## Item 14 · Cabeçalhos e limites do Express

- Adicionar `helmet` e política de CORS explícita (hoje não há nenhuma; `/api/proxy-image` responde
  `Access-Control-Allow-Origin: *`).
- Definir `limit` no `express.json()` global.
- Reduzir `/api/health`: hoje devolve `process.memoryUsage()` e `NODE_ENV` sem autenticação.
- Parar de repassar `err.message` cru do Stripe ao cliente em
  `/api/stripe/create-payment-intent` — usar o catálogo de erros de `shared/errors/`.

## Item 15 · `role` em custom claims

Hoje `isAdmin()` faz um `get()` em `users/{uid}` a cada avaliação de regra — custo de leitura por
operação, no Firestore e no Storage.

Migração sem downtime:

1. Ao alterar papel no admin, gravar também o custom claim via Admin SDK.
2. Backfill dos usuários existentes por script único.
3. Regras passam a aceitar `request.auth.token.role == "ADMIN"` **ou** o `get()` atual.
4. Após a expiração natural dos tokens (uma hora) e confirmação por telemetria, remover o `get()`.
5. Manter `users/{uid}.role` como espelho de exibição, nunca como fonte de autorização.

Ganho adicional: o papel deixa de ser um documento que outra regra poderia expor a escrita.

---

## Ordem de execução recomendada

1. **Fase 1.7** — rotação. Bloqueia tudo; é a única com credencial viva em jogo.
2. **Item 10** — `NODE_ENV`. Menor esforço, protege os demais.
3. **Item 9** — regras do Firestore. Risco zero confirmado e corrige um bug funcional (9c).
4. **Item 8** — SSRF. Contido, com teste objetivo.
5. **Item 7** — CSP. Tem janela de observação de sete dias; começar cedo para não virar gargalo.
6. **Item 6 parte A** — decisão do webhook Stripe.
7. **Item 11** — Storage, após a verificação do fluxo de impressão.
8. **Fase 3** — itens 12 a 15, na ordem que a operação permitir.

Itens 7 e 6A podem correr em paralelo: tocam arquivos distintos e não compartilham dependência.

## Registro de decisões

| Data       | Decisão                                                             | Motivo                                                                                                |
| ---------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 2026-08-29 | Hash em vez de nonce na CSP                                         | `index.html` é servido estaticamente; não há injeção por requisição                                   |
| 2026-08-29 | Manter `'unsafe-inline'` em `style-src`                             | Estilo inline não executa código; remover exigiria refatoração ampla                                  |
| 2026-08-29 | Não subir `firebase-admin` via `audit fix --force`                  | Proposta rebaixa para a versão 10.x e quebra a API em uso                                             |
| 2026-08-29 | Endurecer o webhook Stripe antes de ativá-lo em produção            | Não existe na Vercel; ativar sem transação e idempotência repete a falha já resolvida no Mercado Pago |
| 2026-08-29 | Validação de cupom será server-side quando o recurso for construído | Consulta pelo cliente exige leitura pública da coleção                                                |

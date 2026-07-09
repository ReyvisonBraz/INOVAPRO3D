# Etapa 3 — Content-Security-Policy + Hardening

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` ou `superpowers:executing-plans`. Passos com checkbox (`- [ ]`).

**Goal:** Adicionar `Content-Security-Policy` (a defesa que falta contra XSS/injeção), começando em **modo report-only** para não quebrar Firebase/Stripe/analytics, medindo violações e só então **passando a enforce**. Fechar `base-uri`, `object-src`, `form-action` e `frame-ancestors`.

**Architecture:** A produção roda na **Vercel** — os headers vêm de [vercel.json](../../../vercel.json) (o `server.ts` Express é só dev/self-host). Por isso a CSP principal vai no `vercel.json`, e uma cópia espelhada é adicionada ao ramo de produção do `server.ts` para paridade em self-host. **Não** mexemos no dev (Vite middleware) para não brigar com o HMR. A estratégia é: (1) subir CSP **Report-Only** com um allowlist realista; (2) coletar violações reais; (3) endurecer e trocar para `Content-Security-Policy` enforce.

**Tech Stack:** Vercel headers, Express.

## Restrições globais (resumo — ver [README](README.md))

- Não quebrar login Google, Firestore, Stripe nem os pixels de analytics.
- `npx tsc --noEmit` e `npm run lint` limpos ao final.

## Contexto necessário (para não perder o fio)

**Hosts externos que a app usa hoje** (levantados do código):

- **Fontes:** `fonts.googleapis.com`, `fonts.gstatic.com` ([index.html:17-25](../../../index.html#L17-L25)).
- **Push SendPulse:** script inline de `//web.webpushs.com/...` ([index.html:61](../../../index.html#L61)). ⚠️ Carrega antes do consentimento — **decisão de negócio documentada** na memória do projeto (o verificador do SendPulse lê o HTML cru; o navegador pede permissão de notificação). **Fora de escopo remover** — apenas permitir na CSP.
- **Firebase:** Auth (popup Google → `apis.google.com`, `accounts.google.com`, `*.firebaseapp.com`), Firestore (`firestore.googleapis.com`, `*.googleapis.com`), Storage (`firebasestorage.googleapis.com`), Installations.
- **Stripe:** `js.stripe.com` (script + frame), `api.stripe.com` (connect), `hooks.stripe.com` (frame). Ver [src/lib/stripe.ts](../../../src/lib/stripe.ts) e [StripePaymentForm.tsx](../../../src/components/checkout/StripePaymentForm.tsx).
- **Analytics/pixels** ([src/lib/analytics.ts](../../../src/lib/analytics.ts)): Google (`googletagmanager.com`, `google-analytics.com`), Facebook (`connect.facebook.net`, `facebook.com`), TikTok (`analytics.tiktok.com`).
- **Imagens de produto:** Firebase Storage + fotos de perfil Google (`lh3.googleusercontent.com`) + imagens externas **servidas via proxy same-origin** (`/api/proxy-image`).

**Inline scripts existentes:** o script anti-flash de tema em [index.html:8-14](../../../index.html#L8-L14) é inline → a CSP de script precisa de `'unsafe-inline'` (ou hash) nesta fase. Endurecer para hash/nonce fica como follow-up anotado no fim.

**Headers de segurança atuais:** já existem em [vercel.json:3-12](../../../vercel.json#L3-L12) (HSTS, X-Frame-Options, etc.), mas **sem CSP**. O `server.ts` **não** replica esses headers hoje.

---

## File Structure

- Modify: `vercel.json` — adicionar `Content-Security-Policy-Report-Only` (fase 1) e depois trocar para `Content-Security-Policy` (fase 3).
- Modify: `server.ts` — middleware que aplica os mesmos headers de segurança + CSP no ramo `NODE_ENV === 'production'`.
- Create (temporário): nenhum arquivo novo; violações são lidas no console do navegador.

---

## Task 1: CSP em modo Report-Only no Vercel

**Files:**
- Modify: `vercel.json:5-11` (array de headers da rota `/(.*)`)

**Interfaces:**
- Produces: header `Content-Security-Policy-Report-Only` em todas as respostas de produção. **Não bloqueia nada** — só reporta violações no console.

- [ ] **Step 1: Adicionar o header report-only**

Em [vercel.json](../../../vercel.json), no primeiro objeto de `headers` (source `"/(.*)"`), acrescentar ao array `headers` este item (valor em uma linha só — o JSON não aceita quebra):

```json
        { "key": "Content-Security-Policy-Report-Only", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://apis.google.com https://www.googletagmanager.com https://connect.facebook.net https://analytics.tiktok.com https://web.webpushs.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebasestorage.googleapis.com https://api.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.tiktok.com https://connect.facebook.net https://www.facebook.com wss://*.firestore.googleapis.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com https://*.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" }
```

- [ ] **Step 2: Validar o JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('json ok')"`
Expected: `json ok`.

- [ ] **Step 3: Commit + deploy de preview**

```bash
git add vercel.json
git commit -m "security(csp): add report-only Content-Security-Policy

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Publicar em **preview** (não produção ainda). Report-only não quebra nada, mas confirmar no ambiente real.

---

## Task 2: Coletar e resolver violações

**Files:** nenhum (observação + ajuste do valor da CSP conforme achados).

- [ ] **Step 1: Exercitar todos os fluxos com o DevTools aberto (aba Console)**

No deploy de preview, percorrer **cada** fluxo e anotar toda mensagem `[Report Only] Refused to ... because it violates the following Content Security Policy directive`:
1. Home, catálogo, detalhe de produto (imagens).
2. Login com Google (popup).
3. Adicionar ao carrinho → checkout → confirmar pedido (Firestore + endpoint da Etapa 2).
4. Calculadora, visualizador STL (three.js).
5. Admin (`/admin`): dashboard, upload de imagem (Storage), gráficos (recharts).
6. Notificação push (permitir).

- [ ] **Step 2: Para cada violação, decidir**

- Host legítimo esquecido → **adicionar** o host à diretiva certa (`connect-src`/`img-src`/`script-src`/`frame-src`).
- `eval`/`inline` inesperado de lib → avaliar se precisa de `'wasm-unsafe-eval'` (three.js em alguns navegadores) ou hash; anotar.
- Host que **não** deveria estar ali → é exatamente o que a CSP protege; não adicionar.

Atualizar o `value` do header em `vercel.json` a cada host legítimo faltante e re-publicar o preview. Repetir até o console ficar limpo em todos os fluxos.

- [ ] **Step 3: Commit dos ajustes (se houver)**

```bash
git add vercel.json
git commit -m "security(csp): allowlist real hosts found during report-only pass

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Passar a CSP para enforce

**Files:**
- Modify: `vercel.json`

**Interfaces:**
- Produces: header `Content-Security-Policy` (enforce) com o valor já validado na Task 2.

- [ ] **Step 1: Renomear o header**

Só depois do console **limpo** em todos os fluxos: trocar a `key` de `"Content-Security-Policy-Report-Only"` para `"Content-Security-Policy"` (mesmo `value` validado).

- [ ] **Step 2: Validar JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('json ok')"`
Expected: `json ok`.

- [ ] **Step 3: Publicar preview e refazer o smoke test da Task 2 (agora em enforce)**

Confirmar que **nenhum** fluxo quebrou. Se algo quebrar, voltar para report-only, ajustar, repetir.

- [ ] **Step 4: Commit**

```bash
git add vercel.json
git commit -m "security(csp): enforce Content-Security-Policy

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 5 (MANUAL — operador): promover para produção**

⚠️ Ação externa: publicar o deploy de produção na Vercel só após o preview em enforce passar 100%.

---

## Task 4: Paridade de headers no servidor Express (self-host)

**Files:**
- Modify: `server.ts:316-322` (ramo de produção)

**Interfaces:**
- Produces: mesmos headers de segurança + CSP quando o app roda via `npm start` (fora da Vercel).

- [ ] **Step 1: Adicionar middleware de headers no ramo de produção**

Em [server.ts](../../../server.ts), dentro do `else` de produção (onde hoje está `app.use(express.static(distPath))`, [linha 316](../../../server.ts#L316)), **antes** do `express.static`, inserir:

```typescript
    // Paridade com vercel.json para quando o app é auto-hospedado (npm start).
    const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://apis.google.com https://www.googletagmanager.com https://connect.facebook.net https://analytics.tiktok.com https://web.webpushs.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://api.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.tiktok.com https://connect.facebook.net https://www.facebook.com wss://*.firestore.googleapis.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com https://*.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
    app.use((_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
      res.setHeader('Content-Security-Policy', CSP);
      next();
    });
```

> Manter o valor de `CSP` sincronizado com o `vercel.json` (Task 3). Se divergirem, o `vercel.json` é a fonte de verdade (produção real).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Smoke test em modo produção local**

```bash
npm run build && npm run start
```
Abrir `http://localhost:3000`, confirmar no DevTools (aba Network → resposta do documento) que o header `Content-Security-Policy` aparece e o app funciona.

- [ ] **Step 4: Commit**

```bash
git add server.ts
git commit -m "security(csp): mirror security headers + CSP in Express production branch

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

1. **Cobertura:** CSP report-only → enforce ✔️; `base-uri`/`object-src`/`form-action`/`frame-ancestors` fechados ✔️; paridade Express ✔️.
2. **Sem quebrar funcionalidade:** metodologia report-only garante que só se faz enforce após console limpo. ✔️
3. **Sem placeholder:** valores de CSP completos e comandos de validação concretos. ✔️

## Follow-ups anotados (não bloqueiam esta etapa)

- Remover `'unsafe-inline'` de `script-src` movendo o script anti-flash de tema ([index.html:8-14](../../../index.html#L8-L14)) para um hash SHA-256 na CSP (ou nonce injetado pelo build).
- Reavaliar o push SendPulse pré-consentimento se a política de privacidade mudar (hoje é decisão de negócio aceita).

## Definição de pronto

- Produção com header `Content-Security-Policy` (enforce) e nenhum fluxo quebrado.
- `server.ts` aplica os mesmos headers em `npm start`.
- Diretivas restritivas (`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`) presentes.

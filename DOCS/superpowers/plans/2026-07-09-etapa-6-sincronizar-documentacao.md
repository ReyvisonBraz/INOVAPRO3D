# Etapa 6 — Sincronização da Documentação

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` ou `superpowers:executing-plans`. Passos com checkbox (`- [ ]`).
> **Ordem:** de preferência **por último**, para que o README reflita o estado real após as Etapas 1–5.

**Goal:** Alinhar a documentação ao código real. Hoje o [README.md](../../../README.md) contradiz o projeto em pontos concretos (config Firebase, comando de lint, estado validado). `.env.example` e `CONFIGURACAO.md` estão corretos — o foco é o README + uma pequena divergência de contato.

**Architecture:** Documentação é verdade sobre o código; onde diverge, custa a quem entra no projeto. Corrigimos o que está **factualmente errado** e adicionamos o que passou a existir (scripts de teste, endpoint de pedido, CSP), sem inventar processo que não roda.

## Restrições globais (resumo — ver [README](README.md do projeto))

- Nada de afirmação não verificável: cada linha nova precisa bater com o código/`package.json`.
- Etapa sem código de app → verificação é `grep` (não sobra referência velha) + leitura humana.

## Contexto necessário — divergências mapeadas (2026-07-09)

**README.md (fonte de verdade errada):**
- [README:26](../../../README.md#L26): "Projeto Firebase configurado em `firebase-applet-config.json`." → **Errado.** O app lê `import.meta.env.VITE_FIREBASE_*` ([src/services/firebase.ts:5-12](../../../src/services/firebase.ts#L5-L12)).
- [README:41](../../../README.md#L41): "`npm run lint` executa `tsc --noEmit`." → **Errado.** Hoje `lint` = `eslint .` ([package.json:11](../../../package.json#L11)).
- [README:47-57](../../../README.md#L47-L57) (seção Configuracao): repete o erro do `firebase-applet-config.json`.
- [README:30-37](../../../README.md#L30-L37) (Comandos): **não** lista `npm test` / `npm run test:run` (existirão após a Etapa 1).
- [README:140-147](../../../README.md#L140-L147) (Estado Validado): datado de 2026-05-24, desatualizado.
- [README:89-97](../../../README.md#L89-L97) (Simulado ou Pendente): o item "Validacao profunda de total e itens ainda deve migrar para backend" foi **resolvido** na Etapa 2 — precisa refletir isso.
- `IMAGE_PROXY_ALLOWED_HOSTS` (usado em [server.ts:14](../../../server.ts#L14)) **não** está documentado.

**Divergência de contato:**
- [CONFIGURACAO.md:17](../../../CONFIGURACAO.md#L17) diz `contato@inovapro3d.com.br`; [.env.example:13](../../../.env.example#L13) e o default em [src/lib/config.ts:5](../../../src/lib/config.ts#L5) usam `vendas@inovapro3d.com.br`. Decidir **um** e alinhar.

**Corretos (não mexer):** `.env.example`, `CONFIGURACAO.md` (fora a linha de contato).

---

## File Structure

- Modify: `README.md` — Requisitos, Stack, Comandos, Configuracao, Simulado/Pendente, Estado Validado.
- Modify: `CONFIGURACAO.md:17` — alinhar e-mail de contato (após decisão).

---

## Task 1: Corrigir a config Firebase e o comando de lint no README

**Files:**
- Modify: `README.md:22-26,40-45,47-57`

- [ ] **Step 1: Requisitos — trocar a referência ao arquivo de config**

Em [README.md:26](../../../README.md#L26), substituir:
```
- Projeto Firebase configurado em `firebase-applet-config.json`
```
por:
```
- Projeto Firebase configurado via variáveis `VITE_FIREBASE_*` (ver `.env.example`)
```

- [ ] **Step 2: Comandos — corrigir a descrição do lint e adicionar testes**

Em [README.md:40-45](../../../README.md#L40-L45), trocar o bloco de descrição por:
```
`npm run dev` sobe o servidor Express com Vite em `http://localhost:3000`.

`npm run lint` roda o ESLint (`eslint .`). A checagem de tipos é `npx tsc --noEmit`.

`npm test` roda a suíte Vitest em modo watch; `npm run test:run` roda uma vez (CI).

`npm run build` gera o frontend Vite e o bundle do servidor em `dist/`.
```
E no bloco de comandos ([README.md:30-37](../../../README.md#L30-L37)) acrescentar `npm run test:run` à lista.

- [ ] **Step 3: Seção Configuracao — remover o `firebase-applet-config.json`**

Em [README.md:47-49](../../../README.md#L47-L49), substituir:
```
O app le a configuracao Firebase de `firebase-applet-config.json`.
```
por:
```
O app lê a configuração Firebase das variáveis `VITE_FIREBASE_*` (Vite as injeta no navegador). Localmente ficam no `.env`; em produção, no painel da Vercel. Veja `.env.example` e `CONFIGURACAO.md`.
```

- [ ] **Step 4: Documentar `IMAGE_PROXY_ALLOWED_HOSTS`**

Na lista de "Variaveis conhecidas" ([README.md:53-57](../../../README.md#L53-L57)), acrescentar:
```
- `IMAGE_PROXY_ALLOWED_HOSTS`: hosts extras permitidos no proxy de imagem (`/api/proxy-image`), além dos hosts de importação de modelo. Separados por vírgula.
```

- [ ] **Step 5: Verificar que não sobrou referência velha**

Run: `grep -n "firebase-applet-config\|lint.*tsc\|executa .tsc" README.md`
Expected: nenhuma ocorrência.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: fix Firebase config source and lint command in README

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Atualizar Stack, "Simulado/Pendente" e "Estado Validado"

**Files:**
- Modify: `README.md:7-21,89-97,140-147`

> **Só aplicar as linhas que já forem verdade.** Se a Etapa 2 (integridade de preço) ainda não foi mergeada, não escrever que ela existe.

- [ ] **Step 1: Stack — adicionar o que falta**

Em [README.md:7-21](../../../README.md#L7-L21), acrescentar à lista: `Express (server.ts)`, `Stripe`, `Vitest (testes)`. (React, Vite, Firestore etc. já estão.)

- [ ] **Step 2: "Simulado ou Pendente" — refletir a Etapa 2**

Em [README.md:89-97](../../../README.md#L89-L97), **remover** a linha:
```
- Validacao profunda de total e itens ainda deve migrar para backend ou regras mais restritivas.
```
e **adicionar** em uma nova seção "Resolvido":
```
## Resolvido

- Total do pedido é recalculado no servidor a partir do catálogo (`/api/orders/create`); o cliente não define mais preço. Regra de `create` de `orders` fechada.
- Motor de precificação (`src/lib/pricing.ts`) coberto por testes Vitest.
- Content-Security-Policy aplicada em produção (ver `vercel.json`).
```
Manter as demais pendências reais (Storage de arquivos 3D, smoke visual, etc.).

- [ ] **Step 3: "Estado Validado" — atualizar a data e os checks**

Em [README.md:140-147](../../../README.md#L140-L147), substituir o bloco por um novo com a **data real** da execução e os comandos verdes:
```
## Estado Validado

Em <DATA-DA-EXECUÇÃO>:

- `npm run lint` passou (0 erros).
- `npm run test:run` passou.
- `npx tsc --noEmit` passou.
- `npm run build` passou.
```
(Preencher `<DATA-DA-EXECUÇÃO>` com a data real após rodar os quatro comandos.)

- [ ] **Step 4: Rodar os quatro comandos para validar o que se afirma**

```bash
npm run lint && npm run test:run && npx tsc --noEmit && npm run build
```
Expected: os quatro verdes. Só então preencher a data no README.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: update stack, resolved items and validated state in README

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Alinhar o e-mail de contato

**Files:**
- Modify: `CONFIGURACAO.md:17` (ou `.env.example` + `src/lib/config.ts`, conforme a decisão)

- [ ] **Step 1: Confirmar o e-mail correto**

O default de código e o `.env.example` usam `vendas@inovapro3d.com.br`; a `CONFIGURACAO.md` diz `contato@`. **Decisão** (default recomendado, por já ser o do código e o remetente verificado no SendPulse): usar `vendas@inovapro3d.com.br`. Se o dono preferir `contato@`, alinhar nos três lugares em vez de só na doc.

- [ ] **Step 2: Corrigir a `CONFIGURACAO.md`**

Em [CONFIGURACAO.md:17](../../../CONFIGURACAO.md#L17), trocar `contato@inovapro3d.com.br` por `vendas@inovapro3d.com.br` (mantendo consistência com o código).

- [ ] **Step 3: Verificar consistência**

Run: `grep -rn "contato@inovapro3d\|vendas@inovapro3d" README.md CONFIGURACAO.md .env.example src/lib/config.ts`
Expected: todas as ocorrências de contato apontando para o mesmo endereço.

- [ ] **Step 4: Commit**

```bash
git add CONFIGURACAO.md
git commit -m "docs: align contact email with code default (vendas@)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

1. **Cobertura:** todas as divergências mapeadas têm tarefa. ✔️
2. **Sem placeholder:** textos de substituição concretos; `<DATA-DA-EXECUÇÃO>` é o único campo a preencher, e há passo que o gera. ✔️
3. **Honestidade:** Task 2 condiciona as afirmações ao que já foi mergeado — não documenta o que não existe. ✔️
4. **Consistência:** e-mail de contato reconciliado em código + docs. ✔️

## Definição de pronto

- README não contém mais referência a `firebase-applet-config.json` nem "lint = tsc".
- README lista os comandos de teste e reflete a integridade de preço/CSP (se já mergeadas).
- E-mail de contato consistente entre código e documentação.
- Os quatro comandos de validação citados no README realmente passam na data informada.

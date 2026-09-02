# Roteiro de execução — quem faz o quê

Companheiro operacional de `ENDURECIMENTO_SEGURANCA_2026-08-29.md`. **Aquele documento continua sendo
a fonte técnica única**: o porquê, o código e o critério de aceite de cada item vivem lá. Aqui só se
responde a uma pergunta: _de quem é a próxima ação_.

Duas etiquetas:

- **`H-n`** — só você consegue fazer. Exige console de terceiro, credencial que a IA não tem, ou uma
  decisão de negócio.
- **`IA-n`** — a IA executa mediante sua autorização. São mudanças de código, teste, documento e git.

Atualizado em 1 de setembro de 2026.

---

## Onde estamos agora

Situação em 1 de setembro de 2026, ao fim do dia:

1. **As regras do Firestore estão valendo em produção.** Publicadas via
   `firebase deploy --only firestore:rules`.
2. **O código está publicado e sadio.** `main` e `origin/main` estão ambos em `e099126`.
   `npm run check` roda verde: typecheck, lint, formato, 374 testes, build e `verify-csp`.
3. **O deploy da Vercel chegou à produção.** Confirmado por `curl`: os três hashes `sha256-` servidos
   pelo site são exatamente os do `vercel.json` do commit publicado.
4. **A CSP endurecida está no ar.** `script-src` traz os hashes e **não contém mais
   `'unsafe-inline'`**. A política segue em modo `Report-Only`, como planejado para esta etapa.

**A janela de observação de 7 dias da CSP começou em 1 de setembro de 2026 e fecha em 8 de setembro
de 2026.** É a partir dessa data que `IA-8` (ler os relatos acumulados) e `H-6` (decidir promover a
política a bloqueante) fazem sentido.

Ponto em aberto: **a newsletter ainda não foi conferida no site.** O `Footer.tsx` corrigido entrou
neste deploy, então a inscrição deve ter voltado a funcionar — mas isso é `H-9` e ninguém verificou
ainda.

Histórico, para não se repetir o engano: uma versão anterior deste documento afirmava que havia 3
commits sem push e que por isso a Vercel não fazia deploy. Os commits já estavam em `origin/main`; o
sintoma observado (política fraca no ar) vinha de um deployment que ainda não havia sido atualizado,
não de falta de push. Antes de atribuir causa a um sintoma de produção, conferir
`git rev-list --left-right --count origin/main...main`.

---

## Bloco H — só você

| Tag         | O que fazer                                                                                                                                                                                            | Onde               | Destrava | Quando              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | -------- | ------------------- |
| ~~**H-1**~~ | ~~Descobrir por que o deploy não chegou à produção.~~ **Concluído em 1 de setembro.** O build da Vercel passou; só houve um aviso de versão, sem falha. A CSP por hash foi confirmada no ar por `curl` | Painel Vercel      | tudo     | ✅ feito            |
| **H-2**     | Fixar o PATH do JDK no `~/.zshrc`: `export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"`                                                                                                                 | Seu shell          | `IA-*`   | qualquer momento    |
| **H-3**     | **Decidir: o Stripe vai ser ativado?** Hoje não existe função Stripe na Vercel. Se a resposta for "não por enquanto", o item 6 encolhe para só a parte A (lógica pura + teste)                         | Decisão de negócio | item 6B  | antes de `IA-6`     |
| **H-4**     | Se H-3 = sim: registrar a URL do webhook no console do Stripe, gerar o signing secret e cadastrá-lo como variável de ambiente na Vercel                                                                | Console Stripe     | item 6B  | depois de H-3       |
| **H-5**     | **Decidir: os arquivos de orçamento precisam ser lidos por quem não está logado?** (link enviado ao cliente, ficha impressa aberta fora do painel...)                                                  | Decisão de produto | item 11  | antes de `IA-9`     |
| **H-6**     | Ler os relatos de violação de CSP acumulados na janela e **decidir promover a política a bloqueante**                                                                                                  | Você + `IA-8`      | item 7   | 7 dias após `IA-2`  |
| **H-7**     | Criar a instância Upstash Redis (ou equivalente) e me passar as variáveis de ambiente                                                                                                                  | Painel Upstash     | item 12  | Fase 3              |
| **H-8**     | Rodar o script de backfill de custom claims contra a base real de usuários                                                                                                                             | Sua máquina        | item 15  | Fase 3, por último  |
| **H-9**     | Conferir no site, com um e-mail seu, que a inscrição na newsletter voltou a funcionar. O `Footer.tsx` corrigido já está no ar desde o deploy de 1 de setembro                                          | Navegador          | —        | **liberado, agora** |

Sobre **H-9**: a IA consegue fazer isso pelo Playwright, mas o teste grava uma linha de verdade no
banco de produção. Se preferir que eu faça, é só autorizar — só quis que a escolha fosse sua.

---

## Bloco IA — eu faço, você autoriza

Cada linha é um passo autônomo: sai com a suíte verde, um commit e a tabela de estado do plano
atualizada no mesmo commit.

| Tag          | O que faço                                                                                                                                                                                                      | Item | Depende de        | Toca produção?                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------- | ------------------------------------------------------------------- |
| ~~**IA-1**~~ | ~~`git push origin main`~~ **Concluído.** `origin/main` está em `e099126` e o deploy chegou à produção                                                                                                          | 7, 9 | —                 | ✅ feito                                                            |
| ~~**IA-2**~~ | ~~Confirmar por `curl` que a política por hash chegou ao ar.~~ **Concluído em 1 de setembro:** os três hashes servidos batem com os do `vercel.json` publicado. **Janela de 7 dias: 1 → 8 de setembro de 2026** | 7    | IA-1              | ✅ feito                                                            |
| **IA-3**     | Anotar o recorte dev/runtime do `npm audit` no plano técnico. (A parte do item 7 já foi feita: o estado da tabela reflete a política no ar desde 1 de setembro)                                                 | 13   | —                 | Não                                                                 |
| **IA-4**     | **Item 8 — SSRF por redirecionamento.** Criar `server/_safeFetch.ts` revalidando o host a cada salto, ligar em `server.ts` e `server/_modelMetadata.ts`, com testes                                             | 8    | —                 | No próximo deploy                                                   |
| **IA-5**     | **Item 14 — cabeçalhos e limites do Express.** `helmet`, CORS explícito, `limit` no `express.json()`, enxugar `/api/health`, parar de vazar `err.message` do Stripe                                             | 14   | —                 | No próximo deploy                                                   |
| **IA-6**     | **Item 6A — decisão do webhook Stripe.** Extrair `server/stripe/_webhookDecision.ts` como lógica pura (valor conferido, idempotência) e cobrir com teste. Não exige conta Stripe                                | 6    | H-3               | Não (só lógica, ainda solta)                                        |
| **IA-7**     | **Item 13 — dependências.** `npm audit fix` sem `--force` primeiro; se não resolver, `overrides` fixando `gaxios`/`uuid`. Valido com `npm run check` completo                                                   | 13   | —                 | No próximo deploy                                                   |
| **IA-8**     | Ler e resumir os relatos de violação de CSP acumulados, separando ruído de extensão de navegador do que é script real do site                                                                                   | 7    | **8 de setembro** | Não                                                                 |
| **IA-9**     | **Item 11 — orçamentos no Storage.** Auditar `src/components/print/` e reportar se a ficha depende de leitura pública; só então mexer em `storage.rules`                                                        | 11   | H-5               | Publicação de regra                                                 |
| **IA-10**    | **Item 7 — promover a CSP a bloqueante.** Trocar `Report-Only` pelo cabeçalho real, validar em preview antes de produção                                                                                        | 7    | H-6               | **Sim, com risco de quebrar o site se houver script fora da lista** |
| **IA-11**    | **Item 12 — rate limiting distribuído.** Trocar o `Map` em memória por Redis compartilhado, configurar `trust proxy`, chavear por `uid` quando houver token                                                     | 12   | H-7               | No próximo deploy                                                   |
| **IA-12**    | **Item 15 — `role` em custom claims.** Gravar o claim no admin, regras aceitando claim **ou** `get()`, e escrever o script de backfill para você rodar                                                          | 15   | —                 | Publicação de regra + H-8                                           |

---

## Ordem sugerida

O bloqueio inicial saiu: o deploy chegou à produção em 1 de setembro e a CSP endurecida está no ar.
Com `H-1`, `IA-1` e `IA-2` fechados, o caminho crítico agora é o **relógio de 7 dias** — nada o
acelera, então o que faz sentido é preencher a espera com os itens independentes.

```
feito        H-1 → IA-1 → IA-2         (deploy, confirmação por curl, janela aberta)
                     ↓
agora        H-9  conferir newsletter no site
                     ↓
esta semana  IA-4  SSRF          ─┐
             IA-5  Express       ─┤ independentes entre si,
             IA-7  dependências  ─┘ podem ir em qualquer ordem
                     ↓
             H-3 decidir Stripe → IA-6  webhook (parte A)
             H-5 decidir orçamentos → IA-9  Storage
                     ↓
8 de set     IA-8 ler relatos → H-6 decidir → IA-10  CSP bloqueante
                     ↓
Fase 3       H-7 Upstash → IA-11  rate limiting
             IA-12 custom claims → H-8 backfill
```

Os itens 7 e 6A tocam arquivos distintos e não compartilham dependência — podem correr em paralelo,
como o plano já registrava.

---

## Regras que valem para todo passo

- **Nunca `npm audit fix --force`.** Ele propõe `firebase-admin@10.3.0`, regressão de versão maior
  que quebra a API em uso.
- **Nunca disparar `/api/notify/new-order` contra a produção** em teste: manda e-mail e mensagem de
  Telegram de verdade.
- **`npm run test:rules` a cada mudança em `firestore.rules`.** Não entra no `npm run check` porque
  precisa de Java (ver `H-2`).
- A tabela de estado do plano técnico é atualizada **no mesmo commit** que muda o código.
- **Módulo interno novo nasce em `server/`, não em `api/`.** Desde `3adb45d`, `api/` contém apenas os
  endpoints implantáveis; toda lógica compartilhada (`_observability/`, `firebaseAdmin.ts`,
  `_orderPricing.ts`, `mercadopago/_*`) vive em `server/`. Os caminhos citados neste roteiro e no
  plano técnico já seguem esse layout.

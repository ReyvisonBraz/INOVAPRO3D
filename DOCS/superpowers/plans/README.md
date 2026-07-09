# Plano de Remediação INOVAPRO3D — Índice Mestre

> Gerado a partir da revisão crítica do projeto em **2026-07-09**. Nota geral atribuída: **7.8/10**.
> Objetivo do plano: subir para a faixa de **9/10** atacando, em etapas isoladas, os pontos que seguram a nota — com **foco em qualidade de código**.

Cada etapa é um **documento independente e autossuficiente**: repete o contexto necessário (arquivos, estado atual, decisões) para que um agente/sessão possa executá-la sem ter lido as outras. Não há dependência de contexto entre os docs — apenas uma **ordem recomendada** de execução.

---

## Ordem recomendada de execução

| # | Etapa | Por que nesta ordem | Risco | Doc |
|---|-------|---------------------|-------|-----|
| 1 | Infraestrutura de testes + testes do motor de pricing | Rede de segurança primeiro. Funções puras, risco zero, desbloqueia todas as refatorações seguintes. | 🟢 Baixo | [etapa-1](2026-07-09-etapa-1-infra-testes-pricing.md) |
| 2 | Integridade de preço no servidor | Correção de segurança **#1**. Com a rede de testes já pronta, dá para cobrir a lógica de recálculo. | 🔴 Alto | [etapa-2](2026-07-09-etapa-2-integridade-preco-servidor.md) |
| 3 | Content-Security-Policy + hardening | Fecha a maior lacuna de defesa contra XSS/injeção. Isolado do resto. | 🟡 Médio | [etapa-3](2026-07-09-etapa-3-csp-hardening.md) |
| 4 | Limpeza de ESLint + código morto | Mecânico, baixo risco, eleva a base de qualidade antes da refatoração grande. | 🟢 Baixo | [etapa-4](2026-07-09-etapa-4-limpeza-eslint-codigo-morto.md) |
| 5 | Refatoração dos god-components | Maior e mais arriscada. Feita **por último**, já com rede de testes e base limpa. | 🟠 Médio-Alto | [etapa-5](2026-07-09-etapa-5-refatorar-god-components.md) |
| 6 | Sincronização da documentação | Fecha o ciclo: README/CONFIGURACAO passam a refletir o código real. | 🟢 Baixo | [etapa-6](2026-07-09-etapa-6-sincronizar-documentacao.md) |

> As etapas **podem** ser executadas fora de ordem (são independentes), mas 2→depois de 1 e 5→depois de 1 são fortemente recomendadas, porque a rede de testes reduz o risco dessas duas.

---

## Restrições globais (valem para TODAS as etapas)

Copie mentalmente este bloco no topo de cada tarefa:

- **Node.js:** validado com `v24.x`. Gerenciador: `npm`.
- **TypeScript `strict` está ligado** ([tsconfig.json](../../../tsconfig.json)). Toda etapa deve terminar com `npx tsc --noEmit` **sem erros**.
- **ESLint deve permanecer em 0 erros.** Rode `npm run lint` ao final de cada etapa. (Hoje: 0 erros, 59 warnings — a Etapa 4 reduz os warnings; as demais **não podem aumentá-los**.)
- **Idioma:** todo texto voltado ao usuário final é **pt-BR**. Comentários de código podem ser pt-BR (padrão do projeto).
- **Segredos:** nunca commitar segredo. Config sensível vai por `.env` (local) / painel Vercel. `.gitignore` já cobre `.env*` exceto `.env.example`.
- **Regras Firestore:** o `match /{document=**} { allow read, write: if false }` (default-deny) em [firestore.rules](../../../firestore.rules) **nunca** pode ser afrouxado.
- **Fonte única de precificação:** toda matemática de dinheiro do lado *maker* mora **só** em [src/lib/pricing.ts](../../../src/lib/pricing.ts). Não duplicar fórmulas.
- **Commits:** frequentes, formato Conventional Commits, mensagem terminando com:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```
- **Branch:** trabalhar fora da `main`. Criar uma branch por etapa (ex.: `git checkout -b etapa-1-testes`).

---

## Mapa do projeto (referência rápida)

- **Frontend:** React 19 + TypeScript + Vite 6 + Tailwind 4. Rotas em [src/App.tsx](../../../src/App.tsx), todas `lazy()`.
- **Backend:** Express custom em [server.ts](../../../server.ts) (dev usa Vite middleware; prod serve `dist/`). Endpoints auxiliares em [api/](../../../api/).
- **Dados:** Firestore. Regras em [firestore.rules](../../../firestore.rules) e [storage.rules](../../../storage.rules). Admin SDK em [api/firebaseAdmin.ts](../../../api/firebaseAdmin.ts) (bypassa regras).
- **Auth:** Firebase Auth (Google). Papéis em `users/{uid}.role` (`CUSTOMER` | `ADMIN` | `OPERATOR`).
- **Pagamento:** Stripe (hoje `PAYMENT_DISABLED = true` em [src/pages/public/Checkout.tsx](../../../src/pages/public/Checkout.tsx)). Webhook em [server.ts](../../../server.ts).
- **Tipos de domínio:** [src/types/domain.ts](../../../src/types/domain.ts).

---

## Como executar cada etapa

Cada doc segue o formato da skill `superpowers:writing-plans`: cabeçalho, restrições, mapa de arquivos e **tarefas em passos de 2–5 min** com checkbox `- [ ]`. Para executar:

- **Recomendado:** `superpowers:subagent-driven-development` — um subagente novo por tarefa, com revisão entre tarefas.
- **Alternativa:** `superpowers:executing-plans` — execução em lote na mesma sessão, com checkpoints.

Progresso é rastreado marcando os checkboxes `- [x]` dentro de cada doc.

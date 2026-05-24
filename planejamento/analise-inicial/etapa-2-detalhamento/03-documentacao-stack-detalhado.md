# 03 - Documentacao e Stack Real - Subplano Detalhado

## Escopo

Alinhar a documentacao com o que o projeto realmente usa hoje, sem apagar historico util.

## Evidencias no Codigo

Stack real observada:

- Vite;
- React 19;
- React Router;
- Firebase Auth;
- Firestore;
- Express em `server.ts`;
- Tailwind CSS 4;
- Three.js / React Three Fiber;
- Framer Motion;
- Recharts;
- Sonner.

Documentos existentes:

- `README.md` parece conter uma especificacao/prompt amplo do produto.
- `ROADMAP.md` existe, mas ainda precisa ser confrontado com o codigo.
- `DOCS/REFINEMENT_PLAN.md` tem plano de refinamento do admin.
- `planejamento/` contem planos por area.

## Problema

O README pode estar funcionando mais como prompt de produto do que como guia operacional. Isso precisa ser explicitado. Um README principal deve ajudar alguem a rodar e entender o projeto atual.

## Plano de Investigacao

- [ ] Comparar README com `package.json`.
- [ ] Verificar se `.env.example` cobre todas as variaveis usadas.
- [ ] Verificar se `GEMINI_API_KEY` ainda e usado.
- [ ] Documentar Firebase config e Firestore database id.
- [ ] Mapear scripts reais: `dev`, `build`, `start`, `lint`, `clean`.
- [ ] Identificar recursos implementados, simulados e planejados.

## Estrutura Recomendada do README Novo

1. Visao geral.
2. Stack atual.
3. Requisitos.
4. Instalacao.
5. Variaveis de ambiente.
6. Rodando em desenvolvimento.
7. Build e producao.
8. Estrutura de pastas.
9. Firebase: Auth, Firestore e rules.
10. Funcionalidades atuais.
11. Simulacoes e pendencias.
12. Planos detalhados.

## O Que Fazer com o README Atual

Opcoes:

- mover para `DOCS/product-spec-original.md`;
- manter uma secao "Especificacao original";
- ou transformar em documento de visao de produto.

Nao e recomendado apagar sem preservar, porque ele contem bastante regra de negocio e escopo desejado.

## Criterios de Aceite

- README principal reflete a stack real.
- Instalar e rodar o projeto fica claro.
- Pendencias como pagamento real ficam marcadas.
- Documentos antigos sao preservados com nome correto.
- Nao ha conflito entre roadmap e codigo atual sem observacao.

## Execucao Parcial - 2026-05-24

### Alteracoes Aplicadas

- README principal foi substituido por um guia operacional da stack real.
- O README antigo foi preservado em `DOCS/product-spec-original.md`.
- O novo README documenta comandos, stack, Firebase, rotas de smoke test, funcionalidades atuais e pendencias simuladas.
- `.env.example` deixou de mencionar AI Studio como premissa operacional e passou a listar `DISABLE_HMR`.
- `index.html` recebeu `lang="pt-BR"` e titulo `INOVAPRO3D`.

### Validacao

- `DOCS/product-spec-original.md` existe e preserva o conteudo anterior.
- Busca por stack antiga (`Next.js 14`, `Supabase`, `Prisma`, `NextAuth`) nao retornou ocorrencias no README operacional.
- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.

### Pendencias

- Confrontar `ROADMAP.md` com o codigo atual.
- Documentar o processo oficial de bootstrap do primeiro admin.
- Documentar variaveis reais quando houver backend de pagamento/webhook.

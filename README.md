# INOVAPRO3D

Plataforma web para operacao de um servico de impressao 3D, com vitrine publica, catalogo, checkout, solicitacao de orcamento, area do cliente e painel administrativo.

O README antigo era uma especificacao/prompt amplo de produto e foi preservado em `DOCS/product-spec-original.md`.

## Stack Atual

- Vite 6
- React 19
- TypeScript
- React Router
- Tailwind CSS 4
- Firebase Auth
- Firestore
- Express custom server em `server.ts`
- Three.js / React Three Fiber
- Framer Motion
- Recharts
- Sonner

## Requisitos

- Node.js: validado localmente com `v24.12.0`
- npm
- Projeto Firebase configurado em `firebase-applet-config.json`

## Comandos

```bash
npm install
npm run dev
npm run lint
npm run build
npm run clean
npm run start
```

`npm run dev` sobe o servidor Express com Vite em `http://localhost:3000`.

`npm run lint` executa `tsc --noEmit`.

`npm run build` gera o frontend Vite e o bundle do servidor em `dist/`.

`npm run clean` remove `dist/` de forma compativel com Windows.

## Configuracao

O app le a configuracao Firebase de `firebase-applet-config.json`.

Variaveis conhecidas:

- `GEMINI_API_KEY`: exposta pelo Vite como `process.env.GEMINI_API_KEY` para recursos de IA quando usados.
- `APP_URL`: URL publica da aplicacao, quando houver deploy.
- `DISABLE_HMR`: quando `true`, desativa HMR/file watching no Vite.
- `NODE_ENV`: controla modo de desenvolvimento/producao do servidor Express.

## Firebase

O projeto usa:

- Firebase Auth para autenticacao.
- Firestore como banco principal.
- Regras em `firestore.rules`.

As roles ficam em `users/{uid}.role`, com valores esperados:

- `CUSTOMER`
- `ADMIN`
- `OPERATOR`

Bootstrap do primeiro admin ainda precisa ser definido operacionalmente. Por enquanto, trate como pendencia critica antes de producao.

## Funcionalidades Atuais

- Home publica.
- Catalogo de produtos.
- Detalhe de produto.
- Carrinho.
- Checkout com criacao de pedido no Firestore.
- Solicitacao de orcamento customizado.
- Area "Meus pedidos".
- Painel admin com pedidos, orcamentos, produtos, materiais, vitrine, CRM, suporte, FAQ, logs e configuracoes.
- Regras Firestore endurecidas para usuarios, pedidos, orcamentos e tickets.
- Tipos de dominio em `src/types/domain.ts`.

## Simulado ou Pendente

- Pagamento Pix ainda nao cria cobranca real.
- Confirmacao de pagamento ainda precisa de backend/webhook confiavel.
- Pix exibido no admin e mensagens de cobranca ainda sao operacionais/simulados.
- Validacao profunda de total e itens ainda deve migrar para backend ou regras mais restritivas.
- Storage real para arquivos 3D ainda precisa ser definido.
- Smoke test visual no navegador ainda precisa ser executado.
- Bundle principal ainda esta grande e pede code splitting futuro.

## Rotas Para Smoke Test

- `/`
- `/catalogo`
- `/produto/:id`
- `/upload`
- `/calculadora`
- `/checkout`
- `/meus-pedidos`
- `/admin`
- `/conhecimento`

## Planejamento

Os planos de evolucao ficam em `planejamento/`.

Documentos mais relevantes:

- `planejamento/analise-inicial/09-plano-mestre-projeto-completo-funcional.md`
- `planejamento/analise-inicial/etapa-2-detalhamento/00-etapa-2-indice.md`
- `planejamento/analise-inicial/etapa-2-detalhamento/01-seguranca-firestore-auth-detalhado.md`
- `planejamento/analise-inicial/etapa-2-detalhamento/07-build-qualidade-detalhado.md`

## Estado Validado

Em 2026-05-24:

- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.
- `npm.cmd run clean` passou.
- Rotas principais responderam HTTP 200 via `http://127.0.0.1:3000`.

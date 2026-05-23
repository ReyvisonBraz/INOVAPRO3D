# 03 - Documentacao e Stack Real

## Prioridade

Prioridade 1. Sem documentacao correta, toda manutencao futura fica instavel.

## Arquivos Envolvidos

- `README.md`
- `ROADMAP.md`
- `package.json`
- `.env.example`
- `firebase-applet-config.json`
- `server.ts`
- `DOCS/`
- `planejamento/`

## Diagnostico Inicial

O README descreve uma stack diferente da implementada.

README atual menciona:

- Next.js 14
- Supabase
- Prisma
- NextAuth
- Mercado Pago
- Resend

Codigo atual usa:

- Vite
- React Router
- Firebase Auth
- Firestore
- Express
- Tailwind CSS 4

## Risco Principal

Essa divergencia cria um mapa falso do projeto. Qualquer pessoa que entrar para manter, corrigir deploy ou implementar pagamento pode seguir direcao errada.

## Analise Necessaria

Verificar:

- Se README e um prompt original e nao documentacao viva.
- Se ROADMAP ainda representa o projeto real.
- Se `DOCS/REFINEMENT_PLAN.md` contem planos ja implementados parcialmente.
- Se `.env.example` representa as variaveis realmente usadas.
- Se ha decisoes de arquitetura registradas ou apenas prompts.

## Resultado Esperado

Documentacao deve explicar:

- Como instalar dependencias.
- Como rodar desenvolvimento.
- Como rodar build.
- Como configurar Firebase.
- Quais colecoes existem no Firestore.
- Como funciona auth/admin.
- Quais recursos estao reais, simulados ou pendentes.
- Como fazer deploy.

## Plano de Execucao

- [ ] Renomear ou mover o README antigo para documento historico, se for prompt.
- [ ] Criar README operacional com stack real.
- [ ] Atualizar `.env.example` com variaveis realmente utilizadas.
- [ ] Criar mapa de colecoes Firestore.
- [ ] Criar secao "Funcionalidades implementadas vs pendentes".
- [ ] Registrar decisoes tecnicas principais em `DOCS/`.

## Criterios de Aceite

- Um novo dev consegue rodar o projeto seguindo o README.
- O README nao menciona stack inexistente como se fosse atual.
- As variaveis de ambiente estao documentadas.
- As limitacoes atuais estao explicitas.


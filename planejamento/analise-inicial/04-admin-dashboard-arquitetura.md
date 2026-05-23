# 04 - Arquitetura do Admin Dashboard

## Prioridade

Prioridade 2. Nao e necessariamente o primeiro bug, mas e o maior risco de manutencao.

## Arquivos Envolvidos

- `src/pages/admin/AdminDashboard.tsx`
- Componentes atuais em `src/components/`
- Possiveis novos diretorios:
  - `src/pages/admin/tabs/`
  - `src/pages/admin/components/`
  - `src/pages/admin/hooks/`
  - `src/types/`

## Diagnostico Inicial

`AdminDashboard.tsx` concentra praticamente todo o painel administrativo em um unico arquivo grande.

Ele inclui:

- Estados de pedidos
- Estados de orcamentos
- Produtos
- Materiais
- Vitrine
- Clientes/CRM
- Suporte
- FAQs
- Logs
- Graficos
- Modais
- Funcoes de CRUD
- Exportacao CSV
- WhatsApp
- Calculadoras
- Confirmacoes

## Risco Principal

Arquivo muito grande dificulta:

- Encontrar bugs.
- Testar mudancas.
- Reaproveitar componentes.
- Evitar regressao.
- Inserir novos fluxos com seguranca.

Tambem aumenta chance de estados interferirem uns nos outros.

## Analise Necessaria

Mapear:

- Quais abas existem.
- Quais estados pertencem a cada aba.
- Quais funcoes escrevem no Firestore.
- Quais modais dependem de qual entidade.
- Quais partes sao UI pura e quais sao regra de negocio.
- Quais colecoes precisam de tipos.

## Resultado Esperado

Uma arquitetura em blocos:

- `AdminDashboard` como casca de layout e roteamento de abas.
- Um componente por aba.
- Hooks por entidade: pedidos, produtos, materiais, clientes, etc.
- Tipos compartilhados.
- Modais isolados.
- Funcoes Firestore centralizadas.

## Plano de Execucao

- [ ] Criar inventario de secoes dentro do arquivo atual.
- [ ] Extrair tipos de dominio antes de mover UI.
- [ ] Extrair componentes sem mudar comportamento.
- [ ] Separar hooks de leitura/escrita do Firestore.
- [ ] Reduzir props com contextos locais ou objetos de controller.
- [ ] Rodar typecheck/build a cada extracao.
- [ ] Manter commits pequenos por aba.

## Ordem de Refatoracao Recomendada

1. Extrair tipos.
2. Extrair componentes pequenos e puros.
3. Extrair modais.
4. Extrair hooks de dados.
5. Separar abas maiores.
6. Revisar performance e subscriptions.

## Criterios de Aceite

- `AdminDashboard.tsx` fica responsavel apenas por layout, navegacao e composicao.
- Cada aba pode ser alterada sem mexer nas demais.
- Funcoes de Firestore ficam testaveis ou pelo menos centralizadas.
- Nenhum comportamento existente e perdido durante a modularizacao.


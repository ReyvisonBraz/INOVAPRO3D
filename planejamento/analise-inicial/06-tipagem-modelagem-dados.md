# 06 - Tipagem e Modelagem de Dados

## Prioridade

Prioridade 2. Deve acompanhar as correcoes de seguranca e refatoracao.

## Arquivos Envolvidos

- `src/contexts/AuthContext.tsx`
- `src/contexts/CartContext.tsx`
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/public/*.tsx`
- Futuro `src/types/`
- Futuro `src/services/firestore/`

## Diagnostico Inicial

Ha uso amplo de `any`, especialmente no painel admin e em entidades vindas do Firestore.

Entidades que precisam de tipos:

- UserProfile
- Product
- Material
- ShowcaseItem
- CartItem
- Order
- Quote
- Customer
- Ticket
- FAQ
- AuditLog
- Settings

## Risco Principal

Sem tipos de dominio, erros importantes passam despercebidos:

- Status escrito diferente em lugares diferentes.
- Campo opcional usado como obrigatorio.
- Preco nulo ou string tratado como number.
- Datas Firestore acessadas sem protecao.
- Cliente e usuario autenticado confundidos.

## Analise Necessaria

Mapear:

- Campos gravados por cada fluxo.
- Campos lidos por cada tela.
- Status usados em pedidos/orcamentos/tickets.
- Datas Firestore e formato exibido.
- Diferenca entre `users` e `customers`.
- Quais dados sao publicos, privados e administrativos.

## Resultado Esperado

Criar uma camada minima de dominio:

- `src/types/domain.ts`
- `src/types/firestore.ts`
- helpers para converter documentos Firestore
- enums/constantes para status
- validadores simples antes de gravar dados criticos

## Plano de Execucao

- [ ] Criar tipos centrais para entidades principais.
- [ ] Definir status como union types ou const arrays.
- [ ] Tipar `AuthContext`.
- [ ] Tipar `CartContext`.
- [ ] Tipar leitura de produtos, pedidos e orcamentos.
- [ ] Substituir `any` aos poucos, com prioridade para fluxos de dinheiro e permissao.
- [ ] Criar helpers `fromDoc` para reduzir repeticao.

## Criterios de Aceite

- Fluxos de pedido, produto e usuario nao usam `any`.
- Status invalidos falham em tempo de TypeScript.
- Campos monetarios sao tratados como number.
- Conversao de Timestamp e feita de forma padronizada.


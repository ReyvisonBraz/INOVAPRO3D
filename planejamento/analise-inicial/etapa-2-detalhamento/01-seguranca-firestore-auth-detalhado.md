# 01 - Seguranca Firestore/Auth - Subplano Detalhado

## Escopo

Revisar a seguranca de autenticacao, autorizacao e regras Firestore antes de qualquer evolucao visual ou operacional.

## Evidencias no Codigo

- `firestore.rules` usa `isAdmin()` lendo `users/{uid}.role`.
- `firestore.rules` permite criacao de usuario admin se `incoming().email == "littlefigther50@gmail.com"`.
- `firestore.rules` nao evidencia comparacao entre `incoming().email` e `request.auth.token.email`.
- `src/contexts/AuthContext.tsx` tambem promove admin por email fixo.
- `tickets` permite `allow create: if true`.
- `orders` permite `create` pelo cliente se `incoming().userId == request.auth.uid`.
- `quotes` permite `create` pelo cliente se `incoming().userId == request.auth.uid`.

## Ameacas Concretas

### Escalada de privilegio

Um cliente nao pode conseguir criar ou alterar seu documento para `role: "ADMIN"`. A regra atual precisa ser validada e ajustada para impedir que o email salvo no documento seja diferente do email real autenticado.

### Manipulacao de pedidos

Pedido criado pelo frontend nao pode confiar cegamente em:

- `total`;
- `items`;
- `status`;
- `shippingAddress`;
- `userName`.

### Spam ou payload abusivo em tickets

`allow create: if true` abre a porta para criacao anonima. Se isso for necessario, precisa de schema minimo, tamanho maximo dos campos e campos permitidos.

### Listagem com query incorreta

As regras de `list` para `orders` e `quotes` usam `resource.data`. Em Firestore rules, list/query exige que a query seja compativel com a regra. Precisa validar se a regra funciona como esperado com `where("userId", "==", uid)`.

## Decisoes Necessarias

- Admin sera controlado por custom claims ou por documento `users/{uid}.role`?
- O primeiro admin sera criado manualmente no console Firebase?
- Operadores terao permissoes menores que admin?
- Tickets podem ser anonimos ou exigem login?
- Criacao de pedido continuara no frontend ou passara por backend?

## Plano de Investigacao

- [ ] Enumerar todas as colecoes usadas no codigo.
- [ ] Para cada colecao, listar campos gravados e campos lidos.
- [ ] Criar tabela de permissao por papel: anonimo, customer, operator, admin.
- [ ] Validar se `request.auth.token.email` esta disponivel no provedor Google.
- [ ] Simular tentativa de criar usuario com email falso e role admin.
- [ ] Simular tentativa de criar order para outro usuario.
- [ ] Simular tentativa de escrever status `PAID` pelo cliente.

## Plano de Correcao

- [ ] Exigir `incoming().email == request.auth.token.email` no create de `users`.
- [ ] Bloquear role diferente de `CUSTOMER` em create pelo proprio usuario.
- [ ] Permitir role admin apenas por admin existente ou bootstrap manual seguro.
- [ ] Impedir usuario comum de alterar `email`, `role`, `loyaltyPoints` e campos criticos.
- [ ] Adicionar schema para tickets publicos.
- [ ] Em orders, permitir apenas campos esperados na criacao.
- [ ] Em orders, forcar status inicial permitido.
- [ ] Em quotes, validar status inicial e campos principais.
- [ ] Revisar `allow list` de orders/quotes com queries reais.

## Criterios de Aceite

- Cliente comum nao consegue virar admin.
- Cliente comum nao consegue marcar pedido como pago.
- Cliente comum nao consegue criar pedido para outro usuario.
- Tickets anonimos, se mantidos, aceitam apenas campos seguros.
- Admin consegue continuar usando o painel.
- Regras ficam documentadas com o motivo de cada permissao.

## Resultado Esperado do Documento Apos Execucao

Este subplano deve receber uma secao final "Validacao Realizada" com:

- comandos usados;
- cenarios testados;
- resultado de cada tentativa;
- pendencias restantes.

## Validacao Realizada - 2026-05-23

### Alteracoes Aplicadas

- `firestore.rules` foi reescrito com helpers de validacao para `users`, `tickets`, `orders` e `quotes`.
- Criacao de `users/{uid}` pelo proprio cliente agora aceita somente `role: "CUSTOMER"`.
- O email salvo em `users/{uid}.email` precisa bater com `request.auth.token.email`.
- Atualizacao do proprio perfil ficou limitada a `name`, `phone`, `addresses` e `photoURL`.
- Criacao publica de tickets passou a exigir schema minimo, status `OPEN` e limites de tamanho.
- Criacao de pedidos pelo cliente passou a exigir `status: "PENDING_PAYMENT"`, `userId` do auth atual, `createdAt == request.time`, lista de itens e total numerico.
- Criacao de orcamentos pelo cliente passou a exigir `status: "PENDING"`, `userId` do auth atual, arquivo, material, infill e timestamp.
- `AuthContext.tsx` nao promove mais admin por email hardcoded no frontend.
- `updateProfile` no frontend agora filtra campos permitidos antes de gravar no Firestore.
- A acao de simulacao de pagamento do cliente foi removida de `MyOrders.tsx`; pagamento aprovado deve vir de admin/backend/webhook.

### Comandos Executados

- `npm.cmd install`
- `npm.cmd run lint`
- `npm.cmd run build`
- `rg -n "littlefigther50|role: isAdmin|import\\('firebase/firestore'\\)|updateDoc\\(doc\\(db, 'orders'|Simular Pagamento" src firestore.rules`

### Resultado

- Dependencias instaladas com sucesso.
- Typecheck passou.
- Build de producao passou.
- Busca nao encontrou mais email admin hardcoded nem promocao por `role: isAdmin`.
- Build ainda emite aviso de chunk grande, mas isso e performance/code splitting, nao bloqueio de seguranca.

### Pendencias

- Validar regras com Firebase Emulator ou deploy controlado das rules.
- Definir processo oficial para bootstrap do primeiro admin.
- Substituir a simulacao Pix por backend/webhook real.
- Revisar profundamente `orders.items` em rules ou mover validacao de total/itens para backend.

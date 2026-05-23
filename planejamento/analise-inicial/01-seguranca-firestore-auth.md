# 01 - Seguranca Firestore e Autenticacao

## Prioridade

Prioridade 0. Esta frente deve vir antes de qualquer deploy real.

## Arquivos Envolvidos

- `firestore.rules`
- `src/contexts/AuthContext.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/services/firebase.ts`

## Diagnostico Inicial

O projeto usa Firebase Auth e Firestore. O controle de admin e feito por perfil no documento `users/{uid}` e tambem por email fixo no codigo.

Pontos observados:

- O email admin esta hardcoded em `AuthContext.tsx`.
- As regras do Firestore tambem aceitam o email hardcoded para permitir role `ADMIN`.
- A funcao `isAdmin()` consulta `users/{uid}.role`.
- O cliente cria o proprio perfil no primeiro login.
- O frontend usa `ProtectedRoute requireAdmin`, mas seguranca real precisa estar nas regras do Firestore.

## Risco Principal

Existe risco de escalada de privilegio se um usuario conseguir criar ou atualizar seu proprio documento de usuario com:

- `role: "ADMIN"`
- `email` igual ao email admin permitido

O ponto sensivel esta na regra de criacao/atualizacao de `users/{userId}`. A regra precisa garantir que o email salvo no documento corresponde ao token autenticado, por exemplo `request.auth.token.email`.

## Analise Necessaria

Verificar com profundidade:

- Se `incoming().email == request.auth.token.email` e exigido em create/update.
- Se usuario comum consegue alterar `role`.
- Se admin pode alterar campos criticos sem quebrar auditoria.
- Se os dados de `users` sao suficientes para alimentar `isAdmin()`.
- Se as colecoes publicas aceitam escrita indevida.
- Se `tickets` com `allow create: if true` aceita spam ou payload malicioso.
- Se `orders` e `quotes` protegem listagem corretamente.

## Resultado Esperado

- Usuario comum nunca consegue se tornar admin pelo cliente.
- Perfil criado pelo usuario deve usar obrigatoriamente o email do token autenticado.
- Role admin deve ser atribuida por processo seguro.
- Criacao publica de tickets deve validar schema minimo e limitar campos.
- Orders/quotes devem proteger owner, status e totais.

## Plano de Execucao

- [ ] Mapear todas as colecoes usadas no app.
- [ ] Definir schema permitido por colecao nas rules.
- [ ] Corrigir regra de `users/{userId}` para vincular email ao token.
- [ ] Remover ou isolar email admin hardcoded do frontend.
- [ ] Considerar custom claims ou bootstrap admin manual.
- [ ] Validar regras com Firebase emulator ou teste manual documentado.
- [ ] Revisar mensagens de erro para nao expor detalhes sensiveis no cliente.

## Criterios de Aceite

- Um cliente autenticado nao consegue gravar `role: "ADMIN"`.
- Um cliente autenticado nao consegue criar pedido para outro `uid`.
- Um cliente autenticado nao consegue alterar total/status de pedido.
- Criacao publica de ticket aceita apenas campos esperados.
- Admin continua conseguindo gerenciar produtos, pedidos, materiais e suporte.


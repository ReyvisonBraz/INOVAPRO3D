# 05 - Checkout, Pagamentos e Pedidos

## Prioridade

Prioridade 1 para produto real. Prioridade 0 se ja estiver recebendo pedidos reais.

## Arquivos Envolvidos

- `src/pages/public/Checkout.tsx`
- `src/contexts/CartContext.tsx`
- `src/pages/public/MyOrders.tsx`
- `src/pages/admin/AdminDashboard.tsx`
- `firestore.rules`
- Futuro backend/API de pagamento

## Diagnostico Inicial

O checkout atual cria um documento em `orders` no Firestore com:

- `userId`
- `userName`
- `items`
- `total`
- `shippingAddress`
- `status: "PENDING_PAYMENT"`
- `createdAt`

Pontos de atencao:

- Nao ha integracao real de pagamento.
- Nao ha validacao forte de endereco.
- O frete e apenas `flatRate` vindo de settings.
- O ID exibido no sucesso usa `Math.random()` e nao o ID real do pedido.
- O carrinho fica apenas em memoria, sem persistencia.
- O cliente cria pedido direto do frontend.

## Risco Principal

Para ecommerce real, pedido e pagamento precisam ser confiaveis. O frontend nao deve ser fonte final de preco, status ou confirmacao de pagamento.

Um usuario poderia manipular dados do carrinho no browser se as regras e o backend nao validarem.

## Analise Necessaria

Verificar:

- Se o total do pedido e recalculado em ambiente confiavel.
- Se os itens enviados existem e estao ativos.
- Se status inicial e fluxo de status estao padronizados.
- Como o admin aprova, altera ou cancela pedidos.
- Se o fluxo de orcamento customizado vira pedido.
- Como o pagamento sera confirmado.
- Como notificar o cliente.

## Resultado Esperado

Fluxo ideal:

1. Cliente monta carrinho.
2. Sistema valida produtos e precos.
3. Backend cria pedido pendente.
4. Backend cria cobranca Pix/cartao.
5. Webhook confirma pagamento.
6. Pedido muda para fila de producao.
7. Cliente e admin veem o mesmo status.

## Plano de Execucao

- [ ] Definir estados oficiais de pedido.
- [ ] Exibir ID real do pedido apos criacao.
- [ ] Validar campos obrigatorios do endereco.
- [ ] Persistir carrinho em localStorage ou Firestore, conforme estrategia.
- [ ] Impedir que frontend defina status sensivel apos criacao.
- [ ] Planejar backend para Mercado Pago/Pix.
- [ ] Implementar webhook antes de marcar pagamento como confirmado.
- [ ] Separar pedidos de catalogo e pedidos vindos de orcamento, se necessario.

## Criterios de Aceite

- Pedido criado tem ID real rastreavel.
- Total nao depende cegamente do browser.
- Cliente nao consegue alterar status ou total.
- Admin consegue acompanhar status com clareza.
- Pagamento confirmado vem de fonte confiavel.


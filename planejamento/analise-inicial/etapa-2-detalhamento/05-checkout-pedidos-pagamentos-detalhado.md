# 05 - Checkout, Pedidos e Pagamentos - Subplano Detalhado

## Escopo

Transformar o fluxo de compra/orcamento em uma base confiavel para operacao real.

## Evidencias no Codigo

- `Checkout.tsx` cria pedidos direto no Firestore.
- Status inicial: `PENDING_PAYMENT`.
- Tela de sucesso mostra protocolo gerado com `Math.random()`, nao o ID real do pedido.
- `MyOrders.tsx` permite "Simular Pagamento" atualizando order para `PAID` no cliente.
- Firestore rules atuais permitem `orders.update` apenas para admin, entao a simulacao pode falhar para cliente comum.
- Admin tambem gera Pix copia e cola simulado.
- `server.ts` menciona "Mercado Pago (Sandbox)" em endpoint de debug.

## Riscos Criticos

### Pagamento falso

Cliente nao pode marcar pagamento como aprovado. Pagamento deve ser confirmado por backend/webhook.

### Total manipulavel

Se o cliente envia `total`, precisa haver validacao confiavel do lado servidor ou regras muito restritivas.

### ID falso na confirmacao

Mostrar `Math.random()` cria ruptura de rastreio. O cliente deve ver o ID real do pedido.

### Status sem maquina oficial

Status aparecem em varias telas. Precisam virar lista oficial.

## Estados Oficiais Propostos

Para pedidos:

- `PENDING_PAYMENT`
- `PAID`
- `QUEUE`
- `SLICING`
- `PRINTING`
- `FINISHING`
- `READY`
- `SHIPPED`
- `COMPLETED`
- `CANCELED`

Para orcamentos:

- `PENDING`
- `IN_REVIEW`
- `APPROVED`
- `SENT_TO_CUSTOMER`
- `CONVERTED_TO_ORDER`
- `REJECTED`
- `CANCELED`

## Plano de Investigacao

- [ ] Mapear todos os pontos que criam `orders`.
- [ ] Mapear todos os pontos que atualizam status.
- [ ] Mapear todos os pontos que mostram Pix.
- [ ] Confirmar se simulacao de pagamento esta apenas para dev ou aparece em producao.
- [ ] Validar se rules bloqueiam `updateDoc` de pagamento em `MyOrders`.
- [ ] Definir de onde vira preco oficial do produto.

## Plano de Correcao Incremental

### Passo 1 - Rastreabilidade

- [ ] Guardar `orderId` retornado por `addDoc`.
- [ ] Mostrar ID real na tela de sucesso.
- [ ] Salvar snapshot claro dos itens do pedido.

### Passo 2 - Validacao basica

- [ ] Bloquear avancar checkout sem endereco minimo.
- [ ] Validar carrinho vazio e valores invalidos.
- [ ] Normalizar telefone/CEP se forem obrigatorios.

### Passo 3 - Remover simulacao do cliente

- [ ] Remover ou esconder "Simular Pagamento" fora de modo dev/admin.
- [ ] Garantir que cliente nao chama update de status.

### Passo 4 - Backend de pagamento

- [ ] Criar endpoint para criar cobranca.
- [ ] Criar webhook de confirmacao.
- [ ] Salvar `paymentId`, `paymentStatus`, `pixCode`, `qrCode`.
- [ ] Atualizar pedido pelo servidor/admin confiavel.

### Passo 5 - Regras e auditoria

- [ ] Firestore rules impedem status sensivel pelo cliente.
- [ ] Logar mudancas de status.
- [ ] Mostrar historico ao cliente e admin.

## Criterios de Aceite

- Cliente ve ID real do pedido.
- Cliente nao consegue marcar pedido como pago.
- Pedido nao aceita total negativo ou item invalido.
- Admin tem fluxo claro para aprovar/cancelar.
- Webhook sera a fonte de verdade do pagamento.

## Execucao Parcial - 2026-05-23

### Alteracoes Aplicadas

- `Checkout.tsx` agora guarda o ID real retornado por `addDoc` em `createdOrderId`.
- A tela de sucesso deixou de usar `Math.random()` e mostra o prefixo do ID real do pedido.
- O pedido criado pelo checkout passou a incluir `userEmail`.
- O endereco de entrega foi expandido para `zipCode`, `street`, `number`, `neighborhood`, `city` e `state`, alinhando melhor com a leitura feita no admin.
- O checkout agora valida endereco minimo antes de avancar para pagamento e antes de criar o pedido.
- O botao mobile tambem passa pela mesma validacao antes de mudar de etapa.

### Validacao

- `npm.cmd run lint` passou apos as alteracoes.

### Pendencias

- Rodar build final apos esta rodada.
- Criar backend/webhook real de pagamento.
- Substituir Pix simulado por dados reais de cobranca.
- Validar endereco com API de CEP ou regra mais consistente.
- Calcular total em ambiente confiavel, nao apenas no frontend.
- Padronizar status de pedido em tipos compartilhados.

# Fase 3: Compra e Pagamentos

Implementação do fluxo transacional financeiro com segurança de ponta.

## 💳 Detalhamento do Fluxo

### 1. Gestão do Carrinho (Cart Logic)
- **Estado Global:** Uso de Zustand ou React Context para persistência.
- **Validação:** Antes de ir para o checkout, verificar se o produto ainda está "Ativo" e se os materiais selecionados ainda estão em estoque no Firestore.

### 2. O Checkout
- **Endereço:** Integração ViaCEP para autocompletação de rua/bairro.
- **Cálculo de Frete:** Chamada ao `server.ts` que consulta Melhor Envio ou Frete Fácil.
- **Resumo Financeiro:** Breakdown claro: Subtotal + Frete - Descontos = Total.

### 3. Integração Mercado Pago (Server-Side)
- **Criação de Preferência:** O frontend envia os itens para o Express; o Express cria a `preference` no Mercado Pago e retorna o link de checkout ou o Brick de pagamento.
- **PIX:** Exibição do QR Code e botão "Copia e Cola". Timer regressivo de 15 minutos.
- **Webhooks:** O servidor recebe o POST do Mercado Pago, valida o `topic=payment`, e atualiza o campo `paymentStatus` no Firestore.
- **Automação de Pedido:** Assim que o status vira `APPROVED`, o pedido é movido automaticamente no Painel Admin para a coluna "Em Análise".

## 📌 Meta de Segurança
- Zero chaves de API no frontend. Todas as transações financeiras validadas no backend.

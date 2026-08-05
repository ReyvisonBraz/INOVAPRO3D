# ADR-001 — Fronteira do provedor de pagamentos

- **Status:** aceito
- **Data:** 2026-08-05
- **Escopo:** checkout, pagamentos e webhooks

## Contexto

O primeiro Pix produtivo foi implementado com `/v1/payments`. A integração funciona, mas tipos do
Mercado Pago, estados financeiros e efeitos no pedido ainda estão próximos demais. A migração para
`/v1/orders` não deve espalhar um segundo formato de API pelo projeto.

## Decisão

O domínio depende somente da interface `PaymentProvider` e de `PaymentSnapshot`, definidos em
`shared/payments/contracts.ts`.

```text
Checkout / Pedido / Webhook
            │
            ▼
     Regras de pagamento
            │
            ▼
      PaymentProvider
            │
            ▼
 Adaptador Mercado Pago Orders
            │
            ▼
      API externa /v1/orders
```

O adaptador é responsável por:

- converter reais para o formato exigido pelo provedor;
- traduzir estados e detalhes externos;
- montar e validar os contratos HTTP;
- extrair QR Code, expiração e identificadores;
- aplicar timeout e política de retentativa;
- nunca expor Access Token ou resposta bruta ao navegador.

O domínio é responsável por:

- preço e propriedade do pedido;
- número da tentativa e chave idempotente;
- máquina de estados e precedência;
- decisão de liberar ou bloquear produção;
- persistência auditável de pedido, tentativa e evento.

## Estratégia de migração

1. Capturar contratos reais e documentados da Orders API em fixtures sem dados sensíveis.
2. Implementar `MercadoPagoOrdersProvider` seguindo `PaymentProvider`.
3. Executar testes de contrato com credenciais de teste.
4. Manter o adaptador Payments existente como rollback temporário.
5. Ativar Orders por flag no servidor para uma compra controlada.
6. Confirmar criação, expiração, aprovação, cancelamento e webhook.
7. Remover o adaptador legado somente depois das evidências e do período de observação.

## Regras de compatibilidade

- Componentes React não importam tipos do Mercado Pago.
- Endpoints não duplicam regras de transição.
- Webhook e reconciliação chamam o mesmo serviço de domínio.
- Valores internos usam centavos inteiros nos novos contratos.
- Datas cruzam a fronteira como ISO 8601 e são validadas antes da persistência.
- Estado externo desconhecido nunca libera produção.

## Consequências

### Positivas

- Migração e rollback ficam localizados.
- Regras financeiras ganham testes sem rede ou Firebase.
- Uma futura integração adicional não exige reescrever checkout e pedidos.
- Formatos externos ausentes ou novos são tratados na borda.

### Custos

- Existirão dois adaptadores durante a transição.
- Será necessário mapear webhook de `payment` e de `order` temporariamente.
- A ativação exige outra compra real controlada.

## Fora do escopo desta decisão

- Escolha visual final do checkout.
- Implementação de cartão.
- Escolha do serviço distribuído de rate limiting.
- Política contábil para reembolso depois que a produção física já começou.

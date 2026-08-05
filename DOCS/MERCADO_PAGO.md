# Integração Mercado Pago

## Escopo atual

A primeira versão oferece pagamento por Pix. Cartão não aparece no checkout porque exige o
Payment Brick e tokenização própria. Essa decisão evita apresentar ao cliente um fluxo incompleto.

## Fluxo

1. O checkout cria o pedido no servidor, que recalcula o total usando os produtos do Firestore.
2. `usePayment` solicita a criação do Pix com o token Firebase do cliente.
3. O serviço confirma que o pedido pertence ao cliente e cria o pagamento com chave idempotente.
4. O QR Code e o código copia-e-cola são exibidos no navegador.
5. O Mercado Pago chama o webhook quando o pagamento muda de estado.
6. O servidor valida a assinatura e consulta novamente a API do Mercado Pago.
7. Somente depois dessa consulta o pedido é atualizado no Firestore.

## Organização do código

- `src/lib/mercadopago/config.ts`: configuração pública do navegador, sem segredos.
- `src/hooks/usePayment.ts`: ligação simples entre a interface e o endpoint.
- `src/components/checkout/PixPaymentStep.tsx`: interface da etapa Pix.
- `api/mercadopago/_config.ts`: configuração privada do servidor.
- `api/mercadopago/_client.ts`: comunicação HTTP com a API do Mercado Pago.
- `api/mercadopago/_service.ts`: regras para criar e consultar pagamentos.
- `api/mercadopago/_webhook.ts`: validação criptográfica da notificação.
- `api/mercadopago/_webhookService.ts`: regra compartilhada para atualizar pedidos.
- `api/mercadopago/*.ts`: adaptadores HTTP usados pela Vercel.

Arquivos iniciados por `_` são módulos internos e não devem virar endpoints públicos na Vercel.

## Segurança

- Nunca use variáveis sem o prefixo `VITE_` dentro de `src/`.
- Nunca faça commit de `.env.local`.
- A Public Key pode ir ao navegador; Access Token e segredo do webhook não podem.
- O payload do webhook não é fonte de verdade. O servidor consulta o pagamento na API oficial.
- O valor é comparado em centavos antes de aprovar o pedido.
- A chave de idempotência impede que cliques repetidos criem pagamentos diferentes.

## Ativação

Enquanto a integração estiver em revisão, mantenha:

```env
VITE_MERCADOPAGO_ENABLED=false
MERCADOPAGO_ENABLED=false
```

As duas flags precisam ser ativadas na Vercel somente após um teste controlado. A URL configurada no
Mercado Pago deve ser:

```text
https://www.inovapro3d.com.br/api/mercadopago/webhook
```

Credenciais de produção geram cobranças reais. A variável de ambiente chamada `test` não transforma
um Access Token de produção em credencial de teste.

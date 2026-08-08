# ADR-002 — Contrato de erros e observabilidade

- **Status:** aceito
- **Data:** 2026-08-05
- **Escopo:** APIs, checkout e operação de pagamentos

## Contexto

Uma mensagem útil para quem compra não contém informação suficiente para diagnosticar uma falha.
Por outro lado, devolver mensagens técnicas do Firebase, Mercado Pago ou da aplicação pode expor
detalhes internos e credenciais. Precisamos atender os dois públicos sem misturar responsabilidades.

## Decisão

Cada falha atravessa três camadas com contratos diferentes:

```text
Falha técnica → AppError + log estruturado → resposta pública → mensagem no checkout
                    correlationId ────────────────┘
```

### Resposta pública

As APIs devolvem somente um código estável, uma mensagem previamente aprovada, indicação de
retentativa e o identificador de correlação:

```json
{
  "error": {
    "code": "PAYMENT_PROVIDER_ERROR",
    "message": "Não conseguimos comunicar com o serviço de pagamento. Tente novamente.",
    "retryable": true,
    "correlationId": "req_00000000-0000-0000-0000-000000000000"
  }
}
```

O navegador não apresenta mensagens cruas de respostas legadas. Ele mostra a mensagem pública e
um código curto de atendimento derivado do `correlationId`.

### Registro interno

O servidor registra JSON estruturado com horário, nível, serviço, operação, `correlationId`, código
do erro e identificadores operacionais necessários. Causa, estado HTTP do provedor e stack ficam
somente no servidor.

Campos associados a autorização, tokens, senhas, chaves privadas, credenciais, QR Code e Pix
copia-e-cola são mascarados recursivamente. Padrões de credenciais encontrados dentro de mensagens
ou stacks também são removidos.

Erros esperados do cliente (`4xx`) usam nível `warn`; falhas da aplicação ou dependências (`5xx`)
usam `error`. Cada falha é registrada uma única vez na fronteira HTTP para evitar alertas e métricas
duplicados.

## Regras de implementação

- O catálogo compartilhado é a fonte única de status HTTP e mensagens públicas.
- `AppError` transporta código, causa e detalhes técnicos sem atravessar a resposta pública.
- Toda resposta de erro inclui `X-Correlation-Id` e o mesmo valor no corpo.
- Logs não incluem corpo completo de requisição, dados pessoais ou payload bruto de terceiros.
- Uma nova categoria de falha exige primeiro um código no catálogo e um teste.
- Exceções desconhecidas são convertidas em `INTERNAL_ERROR`.
- Alertas externos serão conectados ao mesmo evento estruturado em uma etapa posterior.

## Consequências

O suporte consegue pedir um protocolo ao cliente e localizar a execução exata. A interface permanece
compreensível e não revela a arquitetura interna. O custo é manter o catálogo e revisar novos campos
de log, mas essa centralização reduz duplicação e torna o comportamento testável.

## Próximas extensões

- Adotar o contrato nos demais endpoints financeiros e no webhook.
- Persistir eventos críticos de pagamento para auditoria independente dos logs da Vercel.
- Conectar alertas de falha de webhook, divergência de valor e transição impossível.
- Definir retenção e acesso aos logs conforme a política de privacidade.

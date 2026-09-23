# Planejamento: Separar Produção e Pagamento (Pedidos)

Origem: `ANOTACOES-MELHORIAS-INOVAPRO3D.md`, seção 6.
Status: **diagnóstico concluído, implementação não autorizada.**

Este documento registra o que foi verificado no código em 22/09/2026. Nenhuma
alteração foi feita. Nenhum teste de aceitação foi executado.

---

## 1. Achado principal

O backend **já separa** produção de pagamento. A interface administrativa **não**.

O documento de origem supôs que seria preciso reestruturar estados. O código
mostra que a estrutura já existe e está correta — falta consumi-la na UI.

### 1.1 O que já está certo

`server/mercadopago/_webhookDecision.ts:114` protege a produção:

```ts
// Um pedido que já avançou na produção não volta para PAID.
if (!order.status || order.status === "PENDING_PAYMENT") {
  orderUpdate.status = "PAID";
}
```

O pedido tem campos financeiros próprios, independentes de `status`
(`src/types/domain.ts:158-174`):

- `paymentStatus`, `paymentProvider`, `paymentProviderStatus`
- `paidAt`, `paymentUpdatedAt`, `paymentAttemptNumber`, `paymentExpiresAt`
- `fulfillmentHold`, `fulfillmentHoldReason` (estorno/chargeback)

### 1.2 O defeito

```
grep -rn "paymentStatus" src/pages/admin/   →   nenhuma ocorrência
```

Todo o painel administrativo deriva o estado financeiro de `order.status`.

**Caso reproduzível (produção antes do pagamento):**

1. Pedido criado em `PENDING_PAYMENT`.
2. Operação libera produção → `status` vira `QUEUE`/`PRINTING`.
3. Cliente paga na entrega. Webhook grava `paymentStatus: "APPROVED"` e `paidAt`.
4. O guard de 1.1 impede `status = "PAID"` — corretamente, para não perder a etapa.
5. **Resultado:** pedido pago que aparece como não pago em todo o admin.

Pontos afetados: `AdminOverviewPanel.tsx:81-84`, `AdminOverviewCharts.tsx:32-41`,
`AdminDashboard.tsx:699`, `AdminOrdersPanel.tsx:130`, `AdminOrderDetailModal.tsx:64-65`.

O inverso também ocorre: `status: "PAID"` é usado como filtro/contador de
"pago", mas ele só é escrito quando o pagamento chega **antes** da produção.
É um indicador incompleto por construção.

---

## 2. Restrição: estoque acoplado às etapas

`src/lib/inventory.ts:5-10`:

```ts
if (to === "CANCELED") return "RELEASE";
if (to === "PRINTING" && from !== "PRINTING") return "CONSUME";
if (to === "QUEUE" && from !== "QUEUE") return "RESERVE";
```

Renomear ou remapear `QUEUE`, `PRINTING` ou `CANCELED` altera reserva e consumo
de filamento. Coberto por `src/lib/inventory.test.ts`.

**Consequência para o plano:** manter os identificadores atuais. Trocar apenas
rótulos de exibição, não os valores gravados.

---

## 3. Direção proposta

Não migrar o enum. Não tocar no webhook. Não tocar em `inventory.ts`.

### 3.1 Derivar o estado de pagamento a partir dos campos que já existem

Função pura, testável, sem escrita no banco:

- **Pago** — `paymentStatus === "APPROVED"` ou `paidAt` preenchido ou `status === "PAID"`.
- **Parcialmente recebido** — depende de registro de recebimentos parciais. **Não existe hoje** (ver §5).
- **A receber** — nenhum dos acima.
- **Em revisão** — `fulfillmentHold === true` (estorno/chargeback).

### 3.2 Exibir produção e pagamento como dois rótulos distintos

Cartão, linha da tabela e modal de detalhes passam a mostrar dois indicadores
textuais separados, nunca um só. Cor sempre acompanhada de texto.

### 3.3 Corrigir contadores e filtros

Overview, gráficos e filtros passam a usar a função de 3.1 para o eixo
financeiro, e `status` apenas para o eixo de produção.

### 3.4 Tratamento de legado

`CONVERTED_TO_ORDER` no orçamento e `PENDING_PAYMENT` no pedido **não** são
evidência de pagamento. Nenhuma migração deve marcar registros antigos como
pagos. A derivação de 3.1 é somente de leitura — registros existentes não são
reescritos.

---

## 4. Ordem de execução sugerida

1. Função de derivação + testes unitários (sem UI, sem escrita).
2. Modal de detalhes: dois rótulos separados.
3. Cartão e linha da tabela.
4. Overview, gráficos e filtros.
5. Renomear "Faturado" / "Aprovar e faturar" → "Aprovar e criar pedido"
   (`AdminQuotesPanel.tsx:56`, `AdminQuoteEditorActions.tsx:69`,
   `AdminDashboard.tsx:1414`). Rótulo apenas; o valor `CONVERTED_TO_ORDER` permanece.

Cada passo é verificável isoladamente. Nenhum depende de migração de dados.

---

## 5. Pendências que exigem decisão do usuário

- **Recebimento parcial** não tem representação no modelo. Implementá-lo exige
  campo novo (ex.: lista de recebimentos com valor e data). Decidir se entra
  agora ou se o estado se limita a "A receber" / "Pago".
- **Condição de pagamento** (antecipado / na entrega / data combinada) não tem
  campo no pedido. Existe `paymentTerms` no orçamento
  (`useQuoteAdmin.ts`), que não é copiado para o pedido na conversão. Decidir
  se passa a ser copiado.
- **"Aguardando liberação"** como etapa anterior a `QUEUE` não existe no enum.
  Decidir se é etapa nova ou se `PENDING_PAYMENT` já cumpre esse papel.

---

## 6. Critérios de aceitação (a executar em implementação futura)

- Pedido produzido antes do pagamento aparece como "A receber" durante a
  produção e como "Pago" após o webhook, **sem perder a etapa de produção**.
- Pedido pago antes da produção continua exibindo pagamento e produção corretos.
- Mudar etapa de produção não altera nenhum indicador de pagamento.
- Registrar pagamento não altera nenhuma etapa de produção.
- Kanban, tabela e detalhes exibem os mesmos dois estados para o mesmo registro.
- Nenhum registro legado passa a constar como pago.
- Reserva e consumo de estoque permanecem idênticos aos atuais
  (`inventory.test.ts` continua verde).

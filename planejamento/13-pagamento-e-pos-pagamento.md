# Planejamento: Tela de Pagamento (Pix + Cartão) e Pós-Pagamento

Origem: conversa de 23/09/2026. Complementa `12-producao-pagamento.md`.
Status: **diagnóstico concluído, implementação não autorizada.**

Verificado no código em 23/09/2026. Nenhuma alteração foi feita, nenhum
teste de aceitação executado, nenhuma configuração de serviço alterada.

---

## 1. Ponto de partida verificado

### 1.1 O que já está pronto e não deve ser refeito

`src/components/checkout/PixPaymentStep.tsx` (324 linhas) já entrega:

- QR Code e Pix copia-e-cola
- Contagem regressiva até o vencimento (`PixCountdown`, `useTimeRemaining`)
- Confirmação em tempo real (`paymentStatusRealtime`) — o cliente não recarrega
- Aviso de conexão instável (`PixWaitingIndicator`)
- Bloqueio por status remoto (`blockedReasonFor`)

No servidor (`server/mercadopago/`): idempotência por `idempotencyKey`,
tentativas versionadas no mesmo pedido (v1, v2, v3), webhook com máquina de
transição testada (`_webhookDecision.test.ts`), e tratamento de estorno e
chargeback via `fulfillmentHold`.

**Conclusão:** o Pix é a referência de qualidade. O cartão deve alcançá-lo,
não substituí-lo.

### 1.2 Cartão de crédito: não existe

- `api/mercadopago/process-payment.ts:75` rejeita qualquer `paymentMethod`
  diferente de `"pix"`.
- `shared/payments/contracts.ts:12` já declara `credit_card` no tipo
  `PaymentMethod`. O contrato existe, a implementação não.
- `@mercadopago/sdk-js` está em `package.json` mas **nunca é importado**
  (`grep -rn "@mercadopago/sdk-js" src/` → vazio). Dependência morta.

### 1.3 Bloqueio de CSP — impede o cartão de funcionar

`shared/security/cspPolicy.ts` **não libera nenhum domínio Mercado Pago**, e a
política está em modo **enforce** (commit `0aefa6d`).

O Card Payment Brick carrega script de `sdk.mercadopago.com` e faz requisições
a `api.mercadopago.com`. Sem ajuste, o cartão falha em produção — possivelmente
de forma silenciosa para o cliente.

Diretivas que precisam de entrada nova:

| Diretiva      | Por quê                                                                          |
| ------------- | -------------------------------------------------------------------------------- |
| `script-src`  | Carregar o SDK do Brick                                                          |
| `connect-src` | Tokenização e consulta de `payer_costs`                                          |
| `frame-src`   | O Brick renderiza campos em iframe (é isso que mantém o PAN fora do seu domínio) |

O `npm run build` executa `scripts/verify-csp.ts`. A alteração precisa passar
por `cspPolicy.ts` e pelo `npm run csp:sync`, nunca por edição manual de header.

**Recomendação:** subir em `Report-Only` primeiro, conferir os relatórios em
`/api/csp-report`, e só então promover a enforce — o mesmo caminho já usado no
commit `0aefa6d`.

### 1.4 Pós-pagamento: área existe, contato não

`src/pages/public/MyOrders.tsx` (436 linhas) já tem linha do tempo de etapas,
itens com imagem e total.

Duas lacunas:

1. Existe contato por WhatsApp no site — rodapé, botão flutuante, página de
   produto, 404 — mas **nenhum ponto no fluxo de pedidos**. O cliente tem como
   falar com a empresa; não tem como falar _sobre um pedido específico_.
2. A página lê apenas `order.status` (linhas 74-134, 254-260). Repete o defeito
   descrito em `12-producao-pagamento.md`: um pedido pago **depois** de a
   produção começar aparece como não pago **para o próprio cliente**.

---

## 2. Decisões tomadas pelo usuário (23/09/2026)

1. **Parcelamento:** parcelado **com juros pagos pelo comprador**.
2. **Login:** obrigatório para pagar. _(Já é o comportamento atual —
   `Checkout.tsx:447` dispara o login antes de prosseguir.)_
3. **Contato pós-pagamento:** WhatsApp com mensagem pronta **e** botão de
   copiar resumo do pedido.

---

## 3. Desenho proposto

### 3.1 Escolha do método (passo 2 do checkout)

Bifurcação explícita **Pix | Cartão**, com Pix pré-selecionado.

Cada opção informa a consequência antes da escolha, em texto:

- **Pix** — "Confirmação na hora."
- **Cartão** — "Parcele em até Nx." _(N a definir, ver §5)_

Rótulo textual junto do ícone, alvo de toque grande, navegação por teclado.

### 3.2 Cartão: tokenização no navegador

Usar o **Card Payment Brick**. O número do cartão é capturado em iframe do
Mercado Pago e convertido em token — **o PAN nunca chega ao servidor da Inova
Pro 3D**, o que mantém o escopo de PCI no mínimo.

O backend passa a aceitar `paymentMethod: "credit_card"` com o token, o
`installments` e o `issuer_id`, reaproveitando a idempotência e o versionamento
de tentativas que já existem para Pix.

O webhook **não precisa mudar**: `_webhookDecision` decide por
`approved`/`rejected`/`in_process` sem saber o método usado.

### 3.3 Juros do comprador — regra inegociável

Os valores de parcela **devem vir de `payer_costs` do Mercado Pago**. Nunca
calcular juros no código do site.

Motivos: a taxa depende do emissor, da bandeira e da configuração da conta, e
muda sem aviso. Um cálculo local diverge do valor realmente cobrado.

Antes de confirmar, a tela precisa exibir:

- valor de cada parcela,
- **valor total com juros**,
- quanto os juros acrescentam em relação ao valor à vista.

O cliente não pode descobrir o acréscimo só na fatura.

### 3.4 Falha de cartão não descarta o pedido

Cartão recusado mantém o pedido vivo e permite nova tentativa — inclusive
**trocar para Pix**. É o mesmo princípio do `KEEP_AWAITING_PAYMENT` já aplicado
ao Pix vencido em `_webhookDecision.ts:124-127`.

Traduzir os motivos de recusa do Mercado Pago para linguagem acionável
("saldo insuficiente", "dados do cartão não conferem"), nunca exibir o código
cru do provedor.

### 3.5 Pós-pagamento na área do cliente

**Dois rótulos separados**, produção e pagamento, usando a mesma função
derivada especificada em `12-producao-pagamento.md` §3.1. Um trabalho atende
admin e cliente.

**Resumo do pedido** com protocolo, itens, quantidade, valor e condição.

**Contato rápido**, com os dados já preenchidos:

- _Falar no WhatsApp_ — mensagem pronta com protocolo, produto e valor,
  montada com o helper `waLink()` já existente em `src/lib/config.ts`. O
  cliente não digita nada e a operação não precisa perguntar de qual pedido
  se trata.
- _Copiar resumo_ — mesmo conteúdo em texto, para qualquer canal.

Ambos com rótulo textual, foco visível e confirmação de cópia.

---

## 4. Ordem de execução sugerida

1. **CSP em Report-Only** com os domínios do Mercado Pago. Conferir relatórios.
   _Sem isso, nada do cartão funciona — este passo vem primeiro._
2. **Backend aceita `credit_card`**: token, `installments`, `issuer_id`.
   Testes de contrato antes de qualquer UI.
3. **Card Brick no passo 2**, com exibição de `payer_costs`.
4. **Promover CSP a enforce** após os relatórios ficarem limpos.
5. **Bifurcação Pix | Cartão** e tratamento de recusa com nova tentativa.
6. **Pós-pagamento**: dois rótulos, resumo, WhatsApp e copiar.

Os passos 1-5 dependem em cadeia. O passo 6 é independente e pode começar em
paralelo — ele só depende da função derivada de `12-producao-pagamento.md`.

---

## 5. Pendências que exigem informação do usuário

- ~~Número de WhatsApp oficial da empresa.~~ **Resolvido:** já existe fonte
  única em `src/lib/config.ts` (`CONTACT.whatsapp`, com `VITE_WHATSAPP_PHONE`
  sobrescrevendo em `.env.local`) e o helper `waLink(message)`. O pós-pagamento
  deve reusar os dois, não criar link próprio.
- **Número máximo de parcelas (N)** e valor mínimo por parcela.
- **Confirmar na conta Mercado Pago** que o repasse de juros ao comprador está
  configurado. Se a conta estiver como "juros absorvidos pelo vendedor", a tela
  exibirá parcelas sem juros independentemente do que este plano diga.
- **Cartão de débito:** fora do escopo declarado (só Pix e crédito), embora
  `contracts.ts:12` já preveja `debit_card`. Confirmar que fica de fora.

---

## 6. Critérios de aceitação (a executar em implementação futura)

- Pagamento com cartão aprovado, recusado e em análise, cada um com mensagem
  compreensível e caminho de saída.
- Cartão recusado permite nova tentativa e troca para Pix sem perder o pedido.
- O valor total com juros exibido na tela **coincide** com o cobrado pelo
  Mercado Pago.
- Nenhum dado de cartão trafega pelo servidor da aplicação.
- Nenhuma violação de CSP registrada em `/api/csp-report` após a promoção a
  enforce.
- O Pix continua funcionando exatamente como hoje, incluindo expiração,
  reemissão e confirmação em tempo real.
- Na área do cliente, um pedido pago após o início da produção aparece como
  **pago**, preservando a etapa de produção.
- WhatsApp e copiar resumo levam protocolo, itens e valor corretos.
- Todo o fluxo é utilizável por teclado e em tela de celular.

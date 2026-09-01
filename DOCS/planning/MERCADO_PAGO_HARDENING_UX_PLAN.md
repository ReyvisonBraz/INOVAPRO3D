# Plano de evolução do checkout Pix

## Objetivo

Evoluir a integração Pix já funcional para um fluxo de compra profissional, compreensível para o
cliente, resiliente a falhas e simples de manter. Este documento registra o problema, a decisão de
arquitetura, os critérios de aceite e a ordem de execução de cada melhoria.

## Princípios do trabalho

- O Mercado Pago é a fonte de verdade do pagamento.
- O preço final e as transições financeiras são decididos no servidor.
- A interface informa o estado real; nunca presume que um pagamento foi aprovado.
- Webhook é o caminho principal e reconciliação é a rede de segurança.
- Cada tentativa de pagamento é rastreável e idempotente.
- Estados financeiros e estados de produção são relacionados, mas não confundidos.
- Erros internos ficam nos logs; o cliente recebe mensagens seguras e úteis.
- Componentes devem ter uma responsabilidade clara e nomes compreensíveis.

## Estado atual comprovado

O fluxo de produção já cria o pedido, gera o Pix, recebe o webhook, consulta novamente o Mercado
Pago e marca o pedido como pago. O teste real de R$ 0,95 foi concluído com sucesso.

O que falta não invalida o núcleo existente. Trata-se da segunda etapa: experiência, ciclo de vida
completo, resiliência operacional e endurecimento de segurança.

## Estado de execução

Atualizar esta tabela no mesmo commit que muda o código. Ela existe para que qualquer retomada
comece pela leitura do plano, e não por uma investigação do repositório.

| #   | Ponto                          | Estado        | Onde vive no código                                                              |
| --- | ------------------------------ | ------------- | -------------------------------------------------------------------------------- |
| 1   | Atualização em tempo real      | Concluído     | `src/hooks/useOrderPaymentStatus.ts` + `PixPaymentStep.tsx`                      |
| 2   | Expiração explícita do Pix     | Concluído     | `shared/payments/pixAttempt.ts` + `api/mercadopago/_client.ts`                   |
| 3   | Nova tentativa após vencimento | Concluído     | `shared/payments/pixAttempt.ts` + `api/mercadopago/_service.ts`                  |
| 4   | Máquina de estados financeiros | Concluído     | `shared/payments/paymentStateMachine.ts` + `api/mercadopago/_webhookDecision.ts` |
| 5   | Reconciliação automática       | Pendente      | —                                                                                |
| 6   | Endpoint de status confiável   | Pendente      | `api/mercadopago/payment-status.ts` ainda só lê o Firestore                      |
| 7   | Rate limiting distribuído      | Pendente      | —                                                                                |
| 8   | Contratos de erro e observação | Concluído     | `shared/errors/catalog.ts`, `api/_observability/`, `src/lib/apiError.ts`         |
| 9   | CSP bloqueante                 | Em observação | `vercel.json` mantém a política gerada em `Report-Only`                          |
| 10  | IP e dados adicionais corretos | Concluído     | IP fictício removido de `api/mercadopago/_client.ts`                             |
| 11  | Redesign do checkout           | Concluído     | `Checkout.tsx` + `PixPaymentStep.tsx` (hierarquia/feedback/acessibilidade)       |
| 12  | Consolidar a API (Orders)      | Decidido      | decisão registrada; execução após a Fase 1                                       |

## Decisões fechadas em 5 de agosto de 2026

As fronteiras e responsabilidades da migração estão registradas em
[ADR-001 — Fronteira do provedor de pagamentos](../architecture/ADR-001-PAYMENT-PROVIDER-BOUNDARY.md).
O contrato entre mensagens públicas, protocolos e diagnóstico interno está registrado em
[ADR-002 — Contrato de erros e observabilidade](../architecture/ADR-002-ERROR-OBSERVABILITY.md).

### Validade: 30 minutos, sem polling contínuo

A API Orders aceita no mínimo 30 minutos e no máximo 30 dias para Pix. Não criaremos uma validade
visual menor que a validade real do provedor, pois isso produziria dois relógios e uma experiência
enganosa.

O contador será calculado localmente a partir de `expiresAt`; ele não consome Firestore nem Vercel a
cada segundo. A confirmação usará um listener de um único documento. Esse listener gera uma leitura
inicial e novas leituras quando o documento muda, em vez de consultas repetidas por intervalo.

### API principal: migrar para Orders antes do redesign

A API `/v1/payments` continuará funcionando durante a transição, mas o destino arquitetural será a
API `/v1/orders`, atualmente recomendada para Checkout Transparente. Ela oferece expiração explícita,
um agregado único para pedido e transações, erros mais completos, cancelamento/reembolso próprios e
um caminho mais coerente para adicionar cartão futuramente.

A migração será feita atrás da interface interna do provedor. A regra de pedido e os componentes não
conhecerão o formato bruto da API, permitindo rollback temporário sem duplicar lógica de negócio.

### Estados financeiros: implementação aprovada

A máquina completa descrita abaixo será implementada. Toda transição terá teste, precedência e
efeito comercial explícito antes de alterar o webhook de produção.

## Orçamento de uso nos planos gratuitos

### Firestore Spark

Quota gratuita diária atual: 50.000 leituras, 20.000 escritas e 20.000 exclusões, além de 1 GiB de
armazenamento e 10 GiB mensais de saída.

Estimativa conservadora exclusiva do pagamento por venda:

| Operação                                   | Consumo aproximado |
| ------------------------------------------ | ------------------ |
| Carregar produto e configuração            | 2 a 4 leituras     |
| Criar e validar pedido/tentativa           | 2 a 4 leituras     |
| Listener do pedido até a aprovação         | 2 a 4 leituras     |
| Gravar pedido, tentativa, webhook e evento | 5 a 8 escritas     |

Mesmo 100 pagamentos em um dia representariam aproximadamente 1.200 leituras e 800 escritas neste
orçamento conservador. Isso fica muito abaixo da quota, mas o painel deve monitorar o consumo total
do site, pois catálogo, administração e “Meus Pedidos” também usam Firestore.

### Vercel Hobby

O plano inclui atualmente até 1 milhão de invocações mensais, 4 horas de CPU ativa e 360 GB-horas de
memória provisionada. O fluxo esperado usa aproximadamente 5 a 8 invocações por venda: criar pedido,
notificar, criar Pix, receber webhook e uma pequena margem para retentativas/revalidação.

Não faremos polling HTTP a cada poucos segundos. A Vercel será usada somente para comandos e
revalidações pontuais; o estado em tempo real virá do Firestore. Isso protege as duas quotas.

**Restrição comercial importante:** a Vercel declara o plano Hobby como destinado a uso pessoal e
não comercial. A capacidade técnica é suficiente para o início, mas uma loja recebendo vendas deve
planejar a mudança para um plano comercial compatível, independentemente de ainda estar abaixo da
quota.

### Proteções de consumo

- Listener apenas no documento do pedido atual, nunca em toda a coleção no checkout.
- Encerrar listener imediatamente em estado financeiro final.
- Pausar revalidação quando a aba estiver oculta ou offline.
- Revalidar pela API somente ao recuperar foco, após erro ou atraso anormal.
- Alertas em 50%, 75% e 90% das quotas quando a plataforma permitir.
- Painel operacional com leituras, escritas, invocações e webhooks por venda.
- Sem cron frequente na Vercel Hobby: esse plano limita cron a uma execução diária.

## Modelo de estados proposto

### Estado financeiro (`paymentStatus`)

```text
NOT_STARTED
    └── PROCESSING
          ├── PENDING
          │     ├── APPROVED
          │     ├── EXPIRED
          │     ├── CANCELED
          │     └── REJECTED
          └── REJECTED

APPROVED
    ├── REFUNDED
    └── CHARGED_BACK
```

### Estado comercial do pedido (`status`)

```text
PENDING_PAYMENT → PAID → QUEUE → SLICING → PRINTING → FINISHING → READY → SHIPPED → COMPLETED
       └────────→ CANCELED
```

O pagamento pode estar `EXPIRED` sem cancelar imediatamente o pedido: o cliente ainda pode gerar
uma nova tentativa. Um pedido somente entra em produção depois de `paymentStatus=APPROVED` e
`status=PAID`.

## Os 12 pontos refinados

### 1. Atualização do pagamento no checkout em tempo real

**Problema:** o webhook atualiza o banco, mas a tela do QR Code permanece parada.

**Decisão proposta:** criar `useOrderPaymentStatus`, com assinatura em tempo real do documento do
pedido e revalidação autenticada ao recuperar foco/conexão. O checkout deve reagir por meio de uma
máquina de estados, não por condições espalhadas.

**Critérios de aceite:**

- Aprovação refletida na tela em poucos segundos, sem recarregar a página.
- QR Code desaparece ao confirmar o pagamento.
- Tela apresenta sucesso, número do pedido e próximo passo.
- Escutas e temporizadores são encerrados em estados finais e ao desmontar o componente.
- Perda temporária de conexão exibe estado recuperável e retoma a conferência.

**Executado em 8 de agosto de 2026.** `useOrderPaymentStatus` assina um único documento
(`orders/{id}`) com `onSnapshot` — uma leitura inicial e novas leituras só quando o documento muda,
nunca polling. A assinatura é ligada apenas durante a etapa de pagamento (`enabled: step === 2`) e
se desliga sozinha ao chegar a um estado final ou ao sair da etapa/desmontar. Como reforço, revalida
pela API `payment-status` ao recuperar foco ou conexão, com um intervalo mínimo entre chamadas.

O checkout reage à aprovação chamando a mesma função de sucesso usada na resposta síncrona da
criação do Pix. `PixPaymentStep` também passou a tratar `EXPIRED`/`REJECTED`/`CANCELED` vindos do
webhook como bloqueio imediato, sem depender só do relógio local do navegador.

**Prioridade:** P0. **Dependências:** pontos 3 e 4.

### 2. Expiração explícita e visível do Pix

**Problema:** a validade não é definida pelo sistema e nem sempre é retornada pela API atual.

**Decisão aprovada:** definir a duração de negócio em 30 minutos, persistir
`expiresAt` no pedido e na tentativa e mostrar contador baseado no horário do servidor.

**Critérios de aceite:**

- Servidor define a expiração; o navegador apenas a apresenta.
- Contador acessível mostra horas/minutos/segundos restantes.
- QR Code e botão de copiar são desabilitados ao vencer.
- Diferença no relógio do dispositivo não altera a decisão financeira.
- Duração pode ser configurada sem espalhar constantes pelo código.

**Ajuste de sequência (8 de agosto de 2026):** a expiração deixa de esperar a migração do ponto 12.
A API `/v1/payments` já aceita `date_of_expiration` na criação, então os 30 minutos serão
implementados atrás do adaptador atual e sobreviverão à migração para Orders sem mudar a regra de
negócio. Adiar a expiração até a troca de API manteria o cliente preso a um Pix vencido por semanas
sem ganho arquitetural.

**Executado em 8 de agosto de 2026.** A duração vive em `shared/payments/pixAttempt.ts`, com
`PIX_EXPIRATION_MINUTES` configurável por ambiente e travada nos limites do provedor (30 minutos a
30 dias). O servidor calcula `expiresAt`, envia `date_of_expiration` na criação da cobrança e grava
o vencimento no pedido (`paymentExpiresAt`) e na tentativa (`expiresAt`). Quando o provedor devolve
a própria expiração, ela prevalece sobre a calculada.

O contador (`PixCountdown`) é apresentação: lê `expiresAt`, encerra o temporizador no vencimento e
desmonta com o componente. Ao vencer, o QR Code e o botão de copiar somem e dão lugar à ação de
gerar um código novo. Nenhuma decisão financeira depende do relógio do dispositivo — quem recusa
um Pix vencido é o Mercado Pago.

**Prioridade:** P0. **Dependências:** nenhuma.

### 3. Nova tentativa após vencimento

**Problema:** a chave atual termina em `v1`; reutilizá-la depois do vencimento pode recuperar a
cobrança antiga.

**Decisão proposta:** manter `paymentAttemptNumber` no pedido e gerar identificadores como
`order:{orderId}:pix:v{n}`. A criação da próxima tentativa deve ocorrer em transação no Firestore
para impedir concorrência.

**Critérios de aceite:**

- Um clique repetido durante a mesma tentativa nunca duplica cobranças.
- Um Pix expirado gera uma tentativa nova e auditável.
- Duas requisições simultâneas resultam em uma única tentativa válida.
- Tentativas anteriores permanecem imutáveis para auditoria.

**Executado em 8 de agosto de 2026.** `decidePaymentAttempt` decide entre reaproveitar a cobrança
vigente e abrir a tentativa seguinte; os identificadores passaram a ser
`order:{orderId}:pix:v{n}` e `{orderId}-pix-v{n}`, com `paymentAttemptNumber` no pedido.

A validação do pedido e a reserva da tentativa acontecem na mesma transação do Firestore, antes da
chamada ao provedor. A reserva grava a tentativa como `PROCESSING`; se a criação no Mercado Pago
falhar, a requisição seguinte retoma a mesma chave em vez de abrir uma cobrança paralela — e, como
a chave é idempotente, uma cobrança que tenha sido criada sem resposta não vira segunda cobrança.

Três caminhos, todos cobertos por teste: `reuse_stored` (devolve o QR Code gravado, sem chamar o
provedor), `resume_provider` (repete a chamada com a mesma chave) e `create` (nova tentativa após
vencimento, recusa ou cancelamento).

**Prioridade:** P0. **Dependências:** ponto 2.

### 4. Máquina completa de estados financeiros

**Problema:** aprovação está correta, mas expiração, recusa, cancelamento, estorno e chargeback não
produzem todas as transições comerciais necessárias.

**Decisão aprovada:** centralizar o mapeamento em uma função pura que devolva a alteração financeira
e a alteração comercial permitida. O webhook e a reconciliação usarão a mesma regra.

**Critérios de aceite:**

- Todos os estados conhecidos têm comportamento explícito e testes.
- Estado desconhecido vira `PROCESSING` e gera alerta, nunca aprovação.
- `REFUNDED` e `CHARGED_BACK` retiram o pedido do fluxo normal e avisam a operação.
- Uma notificação antiga não regride um estado final mais novo.
- Pedido e tentativa são atualizados atomicamente.

**Executado em 8 de agosto de 2026.** `decidePaymentWebhook` (`api/mercadopago/_webhookDecision.ts`)
é a função pura que recebe o pagamento consultado no provedor e o pedido gravado, e devolve o que
escrever. `processPaymentWebhook` apenas persiste o resultado, dentro de uma única transação do
Firestore que cobre pedido, tentativa e evento de auditoria.

Comportamentos garantidos por teste:

- Aprovação libera `status=PAID`, mas nunca rebaixa um pedido já em produção.
- Notificação atrasada que tentaria regredir um estado final é registrada e descartada
  (`ignored_stale`), sem tocar o pedido.
- Aprovação tardia após expiração ou recusa continua sendo aceita.
- Vencimento, recusa e cancelamento mantêm o pedido aguardando pagamento, sem cancelá-lo.
- Estorno e chargeback marcam `fulfillmentHold` e emitem alerta de operação.
- Status desconhecido vira `PROCESSING` com alerta, nunca aprovação.

**Prioridade:** P0. **Dependências:** nenhuma.

### 5. Reconciliação automática

**Problema:** webhooks possuem retentativas, mas indisponibilidade prolongada ou configuração
incorreta pode deixar pagamentos divergentes.

**Decisão proposta:** no Hobby, reconciliar sob demanda ao retomar o checkout e executar uma
varredura diária de segurança. Se a operação exigir recuperação em minutos sem o cliente online,
migrar o agendamento para um serviço apropriado ou para plano que aceite cron frequente. Toda rota
reutiliza o mesmo reconciliador do webhook.

**Critérios de aceite:**

- Pagamentos pendentes são reconciliados periodicamente.
- Processamento é paginado, limitado e idempotente.
- Falhas individuais não interrompem o lote.
- Métricas informam quantidade consultada, corrigida e com erro.
- Nenhuma consulta é feita para pagamentos em estado final sem motivo explícito.

**Prioridade:** P1. **Dependências:** ponto 4.

### 6. Endpoint de status realmente confiável

**Problema:** o endpoint atual apenas lê o Firestore e não serve como fallback independente.

**Decisão proposta:** por padrão, retornar o estado local rapidamente. Quando houver estado pendente
antigo, solicitação de revalidação ou retomada após falha, consultar o provedor no servidor e
reconciliar antes da resposta.

**Critérios de aceite:**

- Somente o proprietário ou administrador consulta o pedido.
- Consulta ao provedor possui cache curto, timeout e limite distribuído.
- Resposta pública usa um contrato estável e não expõe detalhes internos.
- Revalidação e webhook usam a mesma lógica de transição.

**Prioridade:** P1. **Dependências:** pontos 4 e 8.

### 7. Rate limiting adequado ao ambiente serverless

**Problema:** mapas em memória são isolados por instância e reiniciam frequentemente na Vercel.

**Decisão proposta:** adotar limitador distribuído por usuário, IP e operação, usando armazenamento
com TTL. Limites financeiros devem ser mais restritos que consultas de status.

**Critérios de aceite:**

- Limite funciona entre instâncias e regiões.
- Respostas usam HTTP 429 e `Retry-After`.
- Usuários diferentes não compartilham indevidamente o mesmo bloqueio.
- Webhook não é bloqueado pelo limite destinado a clientes.
- Ausência do serviço de limite falha de forma definida e monitorada.

**Prioridade:** P1. **Dependências:** escolha do armazenamento distribuído.

### 8. Contratos de erro e observabilidade

**Problema:** mensagens técnicas do SDK/provedor podem chegar à interface e os logs ainda repetem
código de mascaramento.

**Decisão aprovada:** criar erros de domínio com `code`, mensagem pública, status HTTP, causa
interna e indicação de retentativa. Centralizar logs estruturados e mascaramento.

**Critérios de aceite:**

- Cliente nunca recebe stack trace, segredo ou mensagem crua de dependência.
- Cada requisição possui `correlationId` pesquisável nos logs.
- Erros são classificados entre validação, autenticação, conflito, provedor e indisponibilidade.
- Alertas existem para falha de webhook, divergência de valor e transição impossível.
- Logs não armazenam QR Code, Pix copia-e-cola ou dados pessoais desnecessários.

**Prioridade:** P0. **Dependências:** nenhuma.

### 9. Política de Segurança de Conteúdo efetiva

**Problema:** a CSP está em `Report-Only`; ela observa violações, mas não bloqueia conteúdo malicioso.

**Decisão proposta:** analisar relatórios, reduzir origens permitidas e promover uma política testada
para `Content-Security-Policy`. Scripts inline devem ser eliminados ou autorizados por nonce/hash.

**Critérios de aceite:**

- CSP bloqueante ativa sem quebrar autenticação, analytics, imagens ou checkout.
- `object-src 'none'`, `base-uri 'self'` e `frame-ancestors 'none'` preservados.
- Nenhum curinga desnecessário para scripts ou conexões.
- Violação continua sendo reportada para monitoramento.

**Prioridade:** P1. **Dependências:** inventário das integrações do frontend.

### 10. IP e dados adicionais corretos

**Problema:** a criação envia `127.0.0.1` como IP do comprador, informação incorreta e sem valor
antifraude.

**Decisão proposta:** remover o campo até existir captura confiável no servidor. Se adotado, extrair
e validar o primeiro endereço confiável da infraestrutura, sem aceitar cegamente cabeçalho enviado
pelo cliente.

**Critérios de aceite:**

- Nenhum IP fictício é enviado ao Mercado Pago.
- Política de privacidade documenta o uso caso o IP real seja processado.
- Logs não registram IP completo sem necessidade operacional definida.

**Prioridade:** P0. **Dependências:** nenhuma.

### 11. Redesign profissional do checkout

**Problema:** a interface atual é funcional, porém possui hierarquia fraca, excesso de estilo
decorativo e pouco feedback durante o pagamento.

**Decisão proposta:** redesenhar o checkout como fluxo focado em conversão e confiança, preservando
a identidade da marca sem competir com as informações essenciais.

**Estrutura proposta:**

1. Revisão compacta do produto e quantidade.
2. Resumo financeiro claro com desconto Pix.
3. Geração do Pix com explicação curta e feedback imediato.
4. QR Code em destaque, copia-e-cola, contador e estado “aguardando pagamento”.
5. Confirmação automática com animação discreta e próximos passos.
6. Estados equivalentes e completos no celular.

**Critérios de aceite:**

- Fluxo compreensível sem conhecimento técnico.
- Ação principal única em cada etapa.
- Contraste, foco, teclado e leitores de tela atendidos.
- Sem layout quebrado entre 320 px e telas grandes.
- Feedback de carregamento não permite cliques duplicados.
- Testes visuais nos estados vazio, criando, pendente, aprovado, expirado e erro.

**Executado em 8 de agosto de 2026, com escopo deliberadamente restrito.** Os itens 1, 2, 4 e 5 da
estrutura proposta já existiam dos pontos anteriores desta fase (revisão compacta, resumo financeiro,
QR Code com contador, confirmação automática). O que faltava — e foi fechado agora — foram as lacunas
concretas contra os critérios de aceite, sem tocar a identidade visual:

- **Estado de erro visível:** `usePayment()` já devolvia `error`, mas `Checkout.tsx` nunca lia o
  campo — só existia um toast que some sozinho. `PixPaymentStep` ganhou um bloco `role="alert"`
  persistente, com a mensagem, aviso de que nenhuma cobrança foi feita, e o mesmo botão de ação já
  existente (sem CTA duplicada). Some sozinho porque `resetPayment()` já limpava o erro a cada nova
  tentativa.
- **Indicador de etapas acessível:** virou `<nav aria-label="Etapas do pedido"><ol>` com
  `aria-current="step"`. O rótulo do passo usava `hidden sm:block`, que remove o texto da árvore de
  acessibilidade abaixo de 640px, não só da tela — trocado por `sr-only sm:not-sr-only`.
- **Área de toque dos controles de quantidade/remover:** de 28×28px (`h-7 w-7`) para 36×36px
  (`h-9 w-9`).
- **Guarda explícita contra duplo envio:** `if (loading) return;` no topo de `handleCompleteOrder` e
  `handleProcessPayment`, reforçando o `disabled` do botão.

**Verificado no navegador (Playwright, sessão já autenticada) apenas até a etapa 1** — layout em
320px sem quebra, árvore de acessibilidade confirmando o rótulo do passo atual. As etapas 2 e 3 (Pix
gerado e confirmação) e o próprio bloco de erro não foram vistos rodando nesta sessão: validados por
leitura de código, não por execução. Recomenda-se um teste manual completo do fluxo Pix antes de
considerar o ponto 11 encerrado de fato.

**Prioridade:** P0. **Dependências:** pontos 1, 2 e 4 para representar estados reais.

### 12. Consolidar a API e o ciclo de vida da integração

**Problema:** a aplicação foi configurada como Checkout Bricks, enquanto o backend atual cria Pix
pela API `/v1/payments`. O fluxo funciona, mas precisamos decidir conscientemente se permanecemos
nessa API ou migramos para a API Orders atualmente documentada para o Checkout Transparente.

**Decisão aprovada:** migrar para a API Orders atrás de um adaptador interno, preservando a API
Payments apenas como rollback durante a validação. Antes da troca, documentar os contratos de
criação, consulta, cancelamento, reembolso e webhook das duas versões.

**Critérios de aceite:**

- Uma única API principal documentada no projeto.
- Contratos e tópicos de webhook compatíveis com a API escolhida.
- Ambiente de teste e produção claramente separados.
- Credenciais validadas pelo identificador da aplicação/conta esperada.
- Runbook de ativação, rotação, rollback e teste real atualizado.

**Prioridade:** P0 para decisão; execução depende do resultado da investigação.

## Fases propostas

### Fase 0 — Decisões e contratos

- Registrar 30 minutos como duração comercial do Pix.
- Preparar a migração da Payments API para Orders API.
- Fechar tabelas de estados e transições.
- Definir contratos públicos de erro e status.

**Saída:** ADRs curtos e testes das regras de domínio.

### Fase 1 — Correção funcional e experiência

- Implementar pontos 1, 2, 3, 4, 8, 10 e 11.
- Criar componentes visuais por estado.
- Cobrir o fluxo com testes unitários, integração e navegador.

**Saída:** checkout profissional com confirmação automática e expiração segura.

### Fase 2 — Resiliência operacional

- Implementar pontos 5, 6 e 7.
- Adicionar métricas, alertas e rotina de reconciliação.
- Simular webhook atrasado, indisponibilidade e concorrência.

**Saída:** pagamentos convergem mesmo quando uma entrega de webhook falha.

### Fase 3 — Endurecimento e liberação

- Implementar ponto 9.
- Executar auditoria de segurança e privacidade.
- Testar rotação e rollback.
- Rotacionar Access Token, segredo do webhook e demais credenciais expostas durante a implantação.
- Fazer uma compra real controlada e documentar evidências.

**Saída:** integração liberada com runbook operacional e credenciais novas.

## Estratégia mínima de testes

- **Unitários:** dinheiro, estados, expiração, idempotência e sanitização.
- **Integração:** criação, repetição, webhook autêntico, assinatura inválida e divergência de valor.
- **Concorrência:** dois cliques e dois webhooks simultâneos.
- **Contrato:** respostas do Mercado Pago com campos opcionais ausentes e estados desconhecidos.
- **Navegador:** desktop e celular em todos os estados do checkout.
- **Operacional:** webhook fora do ar, reconciliação posterior e rotação de segredo.
- **Segurança:** autorização horizontal, manipulação de preço, replay e exposição de dados.

## Definição de pronto

Uma fase somente estará pronta quando:

- código, testes e documentação estiverem atualizados;
- build, tipagem e lint passarem dentro do baseline acordado;
- critérios de aceite tiverem evidência verificável;
- não houver segredo em commits, logs ou artefatos;
- rollback estiver definido para mudanças de pagamento;
- um desenvolvedor iniciante conseguir entender o fluxo pelos nomes e pela documentação.

## Referências oficiais

- [Pix no Checkout Transparente](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix)
- [Modelo da API Orders](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-model)
- [Notificações Webhooks](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications)
- [Expiração de pagamentos](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-settings/expiration-date)
- [Quota e cobrança do Firestore](https://firebase.google.com/docs/firestore/pricing)
- [Limites do plano Vercel Hobby](https://vercel.com/docs/plans/hobby)
- [Limites dos Cron Jobs da Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing)

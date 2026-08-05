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

**Prioridade:** P0. **Dependências:** pontos 3 e 4.

### 2. Expiração explícita e visível do Pix

**Problema:** a validade não é definida pelo sistema e nem sempre é retornada pela API atual.

**Decisão proposta:** definir uma duração de negócio explícita, inicialmente 30 minutos, persistir
`expiresAt` no pedido e na tentativa e mostrar contador baseado no horário do servidor.

**Critérios de aceite:**

- Servidor define a expiração; o navegador apenas a apresenta.
- Contador acessível mostra horas/minutos/segundos restantes.
- QR Code e botão de copiar são desabilitados ao vencer.
- Diferença no relógio do dispositivo não altera a decisão financeira.
- Duração pode ser configurada sem espalhar constantes pelo código.

**Prioridade:** P0. **Dependências:** decisão sobre API no ponto 12.

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

**Prioridade:** P0. **Dependências:** ponto 2.

### 4. Máquina completa de estados financeiros

**Problema:** aprovação está correta, mas expiração, recusa, cancelamento, estorno e chargeback não
produzem todas as transições comerciais necessárias.

**Decisão proposta:** centralizar o mapeamento em uma função pura que devolva a alteração financeira
e a alteração comercial permitida. O webhook e a reconciliação usarão a mesma regra.

**Critérios de aceite:**

- Todos os estados conhecidos têm comportamento explícito e testes.
- Estado desconhecido vira `PROCESSING` e gera alerta, nunca aprovação.
- `REFUNDED` e `CHARGED_BACK` retiram o pedido do fluxo normal e avisam a operação.
- Uma notificação antiga não regride um estado final mais novo.
- Pedido e tentativa são atualizados atomicamente.

**Prioridade:** P0. **Dependências:** nenhuma.

### 5. Reconciliação automática

**Problema:** webhooks possuem retentativas, mas indisponibilidade prolongada ou configuração
incorreta pode deixar pagamentos divergentes.

**Decisão proposta:** criar rotina agendada que consulta no Mercado Pago apenas tentativas não
finais, atrasadas ou inconsistentes. A rotina reutiliza o mesmo reconciliador do webhook.

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

**Decisão proposta:** criar erros de domínio com `code`, mensagem pública, status HTTP, causa
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

**Prioridade:** P0. **Dependências:** pontos 1, 2 e 4 para representar estados reais.

### 12. Consolidar a API e o ciclo de vida da integração

**Problema:** a aplicação foi configurada como Checkout Bricks, enquanto o backend atual cria Pix
pela API `/v1/payments`. O fluxo funciona, mas precisamos decidir conscientemente se permanecemos
nessa API ou migramos para a API Orders atualmente documentada para o Checkout Transparente.

**Decisão a tomar em investigação técnica:** comparar suporte a expiração, notificações, estados,
cancelamento, compatibilidade e esforço de migração. Não migrar apenas por estética e não manter a
API atual apenas por inércia.

**Critérios de aceite:**

- Uma única API principal documentada no projeto.
- Contratos e tópicos de webhook compatíveis com a API escolhida.
- Ambiente de teste e produção claramente separados.
- Credenciais validadas pelo identificador da aplicação/conta esperada.
- Runbook de ativação, rotação, rollback e teste real atualizado.

**Prioridade:** P0 para decisão; execução depende do resultado da investigação.

## Fases propostas

### Fase 0 — Decisões e contratos

- Confirmar duração comercial do Pix.
- Decidir entre manter Payments API ou migrar para Orders API.
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
- [Notificações Webhooks](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications)
- [Expiração de pagamentos](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-settings/expiration-date)

# 08 - Analise Profunda da Etapa 2

## Sintese

O projeto esta em um ponto comum de MVP ambicioso: ja tem bastante experiencia e fluxo desenhado, mas ainda mistura codigo de prototipo, simulacao operacional e regras que precisam endurecer antes de uso real.

A melhor estrategia nao e "reescrever". E estabilizar o nucleo e depois modularizar.

## Ordem Correta de Pensamento

### 1. Primeiro: pode ser usado com seguranca?

Se a resposta for nao, qualquer melhoria visual e secundaria. O Firestore precisa ser tratado como fronteira real do sistema.

As regras devem responder:

- quem pode ler?
- quem pode criar?
- quem pode alterar?
- quais campos?
- em qual estado?
- com qual identidade?

### 2. Segundo: conseguimos validar tecnicamente?

Sem `npm install`, typecheck e build, a analise fica incompleta. A etapa de qualidade e obrigatoria antes de grandes refatoracoes.

### 3. Terceiro: dinheiro e status estao confiaveis?

Pedido, pagamento, Pix e status precisam de fonte de verdade. Hoje ha simulacoes uteis para prototipo, mas perigosas se ficarem expostas.

### 4. Quarto: o dominio esta claro?

Antes de quebrar o admin, e melhor definir tipos. Refatorar sem tipos aumenta chance de mover bugs de lugar.

### 5. Quinto: modularizar com paciencia

O admin deve ser desmontado em partes pequenas. A extracao deve preservar comportamento primeiro e melhorar depois.

## Matriz de Risco

| Frente | Risco | Impacto | Urgencia |
| --- | --- | --- | --- |
| Firestore/Auth | Escalada de permissao | Muito alto | Imediata |
| Pagamento/Pedido | Status ou total manipulado | Muito alto | Alta |
| Build/Typecheck | Erros escondidos | Alto | Alta |
| Admin monolitico | Regressao em manutencao | Alto | Media |
| Tipagem | Bugs silenciosos | Medio/alto | Media |
| Documentacao | Direcao errada | Medio | Media |
| Encoding/conteudo | Percepcao ruim | Medio | Media |

## Plano Macro de Execucao

### Sprint 1 - Base Segura

- Corrigir rules.
- Validar papel admin.
- Instalar dependencias.
- Rodar lint/build.
- Documentar erros reais.

### Sprint 2 - Pedido Confiavel

- ID real no checkout.
- Remover simulacao de pagamento do cliente.
- Status oficiais.
- Validacao minima de endereco e itens.
- Plano de backend/webhook.

### Sprint 3 - Tipos de Dominio

- `domain.ts`.
- `OrderStatus`, `QuoteStatus`, `UserRole`.
- Tipar Auth, Cart, Checkout, MyOrders.
- Iniciar helpers Firestore.

### Sprint 4 - Admin Sustentavel

- Extrair helpers.
- Extrair ConfirmDialog.
- Extrair modais simples.
- Separar tabs menores.
- Separar Orders/Quotes por ultimo.

### Sprint 5 - Documentacao Viva

- README operacional.
- Documento da especificacao original preservado.
- Mapa de colecoes.
- Status do que e real, simulado e pendente.

## Decisoes Que Precisam do Dono do Projeto

- Nome final da marca.
- Firebase continua sendo a stack final?
- Mercado Pago sera o provedor real?
- Pagamento Pix sera automatico desde ja ou manual no inicio?
- Tickets devem ser anonimos?
- O admin tera operadores alem do dono?
- Arquivos 3D serao armazenados no Firebase Storage, outro storage ou apenas metadata?

## Conclusao

O projeto tem valor e direcao. O que falta agora e disciplina de fundacao: permissao, build, status, tipos e modularizacao gradual.

O proximo passo recomendado e executar o subplano 01 de seguranca, seguido do subplano 07 de build. Isso revela o chao real do projeto antes de avancar para mudancas maiores.


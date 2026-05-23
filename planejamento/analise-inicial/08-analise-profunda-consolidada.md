# 08 - Analise Profunda Consolidada

## Objetivo

Este documento consolida a leitura inicial do projeto e organiza a estrategia de evolucao. Ele deve ser revisado depois que as frentes 01 a 07 forem detalhadas e, principalmente, depois que seguranca e build estiverem resolvidos.

## Leitura Geral

O projeto tem uma proposta clara: uma plataforma para servico de impressao 3D sob demanda, com experiencia publica e painel administrativo. A intencao de produto esta bem acima de um site simples. Ha tentativas de cobrir todo o ciclo:

- Descoberta na home.
- Catalogo de produtos.
- Detalhe de produto.
- Orcamento customizado.
- Calculadora de filamento.
- Carrinho.
- Checkout.
- Area de pedidos.
- Admin com producao, CRM, suporte e configuracoes.

Isso e um bom sinal: o projeto pensa no negocio inteiro, nao apenas na vitrine.

## Pontos Fortes

- Escopo de produto bem definido.
- Stack simples para MVP: Vite, React, Firebase.
- Interface visual consistente e marcante.
- Uso de Firestore rules, em vez de deixar tudo aberto.
- Separacao basica entre paginas publicas, admin, componentes, contextos e servicos.
- Existencia de planejamento anterior em `planejamento/` e `DOCS/`.
- Funcionalidades administrativas ja desenhadas em bastante detalhe.

## Fragilidades Centrais

### 1. Seguranca ainda precisa virar fundamento

O sistema depende de roles e regras Firestore. Qualquer brecha nessa camada compromete pedidos, clientes, produtos e operacao.

Antes de polir interface, e preciso garantir:

- Role admin confiavel.
- Escritas de cliente limitadas.
- Totais e status protegidos.
- Tickets publicos validados.
- Dados administrativos inacessiveis a clientes.

### 2. O projeto mistura prototipo e produto real

Ha partes com cara de produto real e partes ainda simuladas:

- Pagamento sem integracao real.
- ID de pedido aleatorio na tela de sucesso.
- Textos como "Mercado Pago Sandbox" no endpoint de debug.
- Cartao "Q3 2024", data ja ultrapassada considerando 2026.
- README descrevendo outra stack.

Isso nao e necessariamente ruim para MVP, mas precisa estar claramente marcado.

### 3. O admin virou um bloco monolitico

O painel admin contem muito valor, mas concentrado demais. A prioridade nao deve ser reescrever tudo. A melhor abordagem e extrair por camadas, mantendo comportamento.

### 4. O dominio ainda nao esta modelado

Pedido, orcamento, produto, material e cliente existem como objetos soltos. Para crescer, o projeto precisa de contratos de dados claros.

### 5. Validacao tecnica local nao esta confirmada

Como o TypeScript nao rodou por ausencia de `tsc`, ainda nao sabemos o numero real de erros.

## Estrategia Recomendada

### Fase 1 - Estabilizar

Objetivo: impedir riscos graves e conseguir validar o projeto.

- Corrigir regras Firestore/Auth.
- Instalar dependencias.
- Rodar typecheck e build.
- Corrigir encoding em textos principais.
- Atualizar README com stack real.

### Fase 2 - Organizar Dominio

Objetivo: reduzir bugs em fluxos centrais.

- Criar tipos para entidades.
- Padronizar status.
- Tipar carrinho, pedido e usuario.
- Criar helpers Firestore.
- Documentar colecoes.

### Fase 3 - Produto Real

Objetivo: transformar simulacoes em fluxo operacional.

- Revisar checkout.
- Exibir ID real de pedido.
- Validar endereco.
- Planejar integracao Mercado Pago.
- Definir webhook de pagamento.
- Alinhar pedidos de catalogo e orcamentos customizados.

### Fase 4 - Refatorar Admin

Objetivo: manter velocidade sem quebrar o painel.

- Extrair componentes puros.
- Extrair modais.
- Separar abas.
- Criar hooks por colecao.
- Melhorar performance e carregamento.

### Fase 5 - Operacao e Escala

Objetivo: preparar rotina de uso real.

- Logs de auditoria reais.
- Permissoes por papel: ADMIN, OPERATOR.
- Notificacoes.
- Relatorios.
- Backup/exportacao.
- Testes e CI.

## Perguntas em Aberto

- Qual nome final da marca: Inovalt3D, Inovapro3D ou outro?
- O projeto deve continuar em Firebase ou migrar para stack do README antigo?
- O pagamento sera Mercado Pago mesmo?
- O admin sera usado por uma pessoa ou equipe com operadores?
- A venda principal sera catalogo pronto, orcamento sob demanda ou ambos?
- Os arquivos STL/OBJ serao armazenados onde?
- Havera entrega local, retirada, Correios ou transportadora?

## Proxima Acao Recomendada

Comecar pela frente `01-seguranca-firestore-auth.md`.

Justificativa: se a permissao estiver errada, qualquer outro polimento pode acabar construindo em cima de uma base insegura. Depois disso, rodar build/typecheck para revelar problemas tecnicos concretos.


# 09 - Plano Mestre para Deixar o Projeto Completo e Funcional

Data: 2026-05-23

## Objetivo

Transformar o projeto atual em uma plataforma funcional, segura e operavel para um servico de impressao 3D, sem tentar reescrever tudo de uma vez.

O plano parte dos documentos:

- `00-indice-planejamento-inicial.md`
- `etapa-2-detalhamento/00-etapa-2-indice.md`
- `etapa-2-detalhamento/08-analise-profunda-etapa-2.md`

## Principio Central

Nao comecar por polimento visual. O projeto ja tem uma interface forte. Agora o foco deve ser:

1. seguranca;
2. validacao tecnica;
3. fluxo real de pedido/orcamento;
4. tipagem e dados confiaveis;
5. admin sustentavel;
6. documentacao;
7. refinamento visual e operacional.

## Fase 0 - Preparacao e Linha de Base

### Objetivo

Entender exatamente o estado tecnico atual antes das alteracoes.

### Tarefas

- [ ] Instalar dependencias com `npm install`.
- [ ] Rodar `npm run lint`.
- [ ] Rodar `npm run build`.
- [ ] Subir `npm run dev`.
- [ ] Abrir rotas principais no navegador.
- [ ] Registrar erros encontrados em `07-build-qualidade-detalhado.md`.

### Pronto Quando

- O projeto instala.
- Typecheck e build foram executados.
- Erros reais estao anotados.
- Sabemos se o app renderiza ou se ha tela branca.

## Fase 1 - Seguranca e Permissoes

### Objetivo

Garantir que usuario comum nao consegue acessar ou alterar dados administrativos, pedidos de terceiros, valores, status ou roles.

### Tarefas

- [ ] Revisar `firestore.rules`.
- [ ] Corrigir criacao de `users/{uid}` para impedir role admin pelo cliente.
- [ ] Exigir email do token autenticado nos documentos de usuario.
- [ ] Bloquear alteracao de `role`, `email` e campos criticos por usuario comum.
- [ ] Validar schema de `tickets`.
- [ ] Validar schema de `orders`.
- [ ] Validar schema de `quotes`.
- [ ] Documentar matriz de permissao.

### Pronto Quando

- Cliente nao vira admin por manipulacao do frontend.
- Cliente nao cria pedido para outro usuario.
- Cliente nao muda status ou total de pedido.
- Admin continua funcionando.

## Fase 2 - Build, Qualidade e Ambiente

### Objetivo

Deixar o projeto tecnicamente verificavel e repetivel.

### Tarefas

- [ ] Corrigir erros de TypeScript.
- [ ] Corrigir erros de build.
- [ ] Ajustar script `clean` para Windows.
- [ ] Confirmar compatibilidade Vite + React + Tailwind.
- [ ] Documentar versao de Node recomendada.
- [ ] Criar checklist de smoke test.

### Pronto Quando

- `npm run lint` passa.
- `npm run build` passa.
- `npm run dev` sobe.
- Home e admin carregam sem erro fatal.

## Fase 3 - Pedido, Checkout e Pagamento

### Objetivo

Transformar o checkout em um fluxo confiavel de pedido.

### Tarefas

- [ ] Trocar protocolo `Math.random()` pelo ID real do pedido.
- [ ] Validar endereco antes de avancar.
- [ ] Padronizar status de pedido.
- [ ] Remover simulacao de pagamento do painel do cliente, ou restringir a dev/admin.
- [ ] Definir onde o preco oficial sera calculado.
- [ ] Planejar backend para criacao de cobranca Pix/Mercado Pago.
- [ ] Planejar webhook para confirmar pagamento.
- [ ] Registrar historico de mudanca de status.

### Pronto Quando

- Pedido criado tem ID real.
- Cliente ve status correto.
- Cliente nao consegue marcar pagamento como aprovado.
- Admin entende o fluxo de pagamento e producao.

## Fase 4 - Orcamentos Customizados

### Objetivo

Fazer o fluxo de arquivos 3D virar orcamento administravel e conversivel em pedido.

### Tarefas

- [ ] Revisar validacao de upload.
- [ ] Definir storage real para STL/OBJ/STEP/IGES.
- [ ] Criar status oficiais de quote.
- [ ] Permitir admin editar valor, material, infill, peso, tempo e observacoes.
- [ ] Converter quote aprovado em order.
- [ ] Evitar duplicidade de pedidos.
- [ ] Gerar mensagem de cobranca clara para WhatsApp.
- [ ] Planejar PDF de orcamento.

### Pronto Quando

- Cliente solicita orcamento.
- Admin revisa e precifica.
- Orcamento aprovado vira pedido rastreavel.
- Cliente consegue pagar ou acompanhar o pedido.

## Fase 5 - Tipagem e Modelagem de Dados

### Objetivo

Criar contratos fortes para as entidades principais.

### Tarefas

- [ ] Criar `src/types/domain.ts`.
- [ ] Criar `UserRole`.
- [ ] Criar `OrderStatus`.
- [ ] Criar `QuoteStatus`.
- [ ] Tipar `CartItem`, `Order`, `Quote`, `Product`, `Material`.
- [ ] Tipar `AuthContext`.
- [ ] Tipar `CartContext`.
- [ ] Tipar `Checkout` e `MyOrders`.
- [ ] Criar helpers para conversao de documentos Firestore.

### Pronto Quando

- Fluxos de usuario, carrinho e pedido nao dependem de `any`.
- Status invalidos falham no TypeScript.
- Campos monetarios sao tratados de forma consistente.

## Fase 6 - Admin Funcional e Sustentavel

### Objetivo

Transformar o admin em um painel confiavel para operacao diaria.

### Tarefas

- [ ] Extrair helpers puros.
- [ ] Extrair `ConfirmDialog`.
- [ ] Extrair modais simples.
- [ ] Separar abas por dominio.
- [ ] Centralizar CRUD por entidade.
- [ ] Revisar produtos, materiais, vitrine, CRM, suporte e FAQ.
- [ ] Adicionar logs reais para acoes administrativas.
- [ ] Melhorar feedback de loading/erro.

### Pronto Quando

- AdminDashboard deixa de concentrar todo o sistema.
- CRUDs principais funcionam.
- Mudancas criticas geram log.
- Operacao diaria fica clara.

## Fase 7 - Catalogo, Produto e Vitrine Publica

### Objetivo

Garantir que o cliente consegue descobrir, escolher e iniciar compra/orcamento sem atrito.

### Tarefas

- [ ] Revisar busca e filtros do catalogo.
- [ ] Garantir produto ativo/inativo.
- [ ] Tratar produto sem imagem.
- [ ] Tratar produto sem estoque ou sob demanda.
- [ ] Revisar detalhe de produto.
- [ ] Revisar materiais disponiveis.
- [ ] Revisar vitrine/showcase.
- [ ] Padronizar textos comerciais.

### Pronto Quando

- Catalogo esta navegavel.
- Produto pode ser comprado ou solicitado sob demanda.
- Vitrine pode ser gerenciada pelo admin.

## Fase 8 - Area do Cliente

### Objetivo

Dar ao cliente clareza sobre pedidos, pagamentos, producao e suporte.

### Tarefas

- [ ] Revisar `MyOrders`.
- [ ] Remover controles administrativos ou simulados do cliente.
- [ ] Mostrar historico de status.
- [ ] Mostrar Pix real apenas quando existir cobranca.
- [ ] Mostrar rastreio quando existir.
- [ ] Adicionar CTA para suporte.

### Pronto Quando

- Cliente acompanha pedido sem confusao.
- Nao ha acao sensivel disponivel ao cliente.
- Informacoes de pagamento e rastreio sao confiaveis.

## Fase 9 - Documentacao Viva

### Objetivo

Deixar o projeto facil de continuar.

### Tarefas

- [ ] Criar README operacional com stack real.
- [ ] Preservar README atual como especificacao original, se necessario.
- [ ] Documentar colecoes Firestore.
- [ ] Documentar status de orders/quotes.
- [ ] Documentar variaveis de ambiente.
- [ ] Documentar comandos de dev/build/deploy.
- [ ] Documentar o que e real, simulado e pendente.

### Pronto Quando

- Um novo dev consegue rodar o projeto.
- O dono do projeto sabe o que falta para producao.
- A documentacao nao contradiz o codigo.

## Fase 10 - Polimento Final e Producao

### Objetivo

Preparar para uso real.

### Tarefas

- [ ] Revisar textos e encoding no navegador.
- [ ] Revisar responsividade mobile.
- [ ] Revisar erros vazios/loading states.
- [ ] Revisar acessibilidade basica.
- [ ] Revisar SEO minimo.
- [ ] Revisar performance de imagens.
- [ ] Revisar Firebase indexes.
- [ ] Preparar deploy.
- [ ] Criar rotina de backup/exportacao.

### Pronto Quando

- Fluxo principal funciona de ponta a ponta.
- Admin opera pedidos reais.
- Cliente entende compra/orcamento.
- Build de producao passa.
- Regras de seguranca estao aplicadas.

## Definicao de Projeto Funcional

O projeto sera considerado funcional quando:

- usuario consegue logar;
- cliente consegue ver catalogo;
- cliente consegue solicitar orcamento;
- cliente consegue criar pedido;
- pagamento nao pode ser falsificado pelo cliente;
- admin consegue gerenciar produtos, pedidos e orcamentos;
- regras Firestore protegem dados;
- build passa;
- README explica a stack real.

## Primeira Sequencia de Trabalho Recomendada

1. Fase 0: instalar e rodar validacoes.
2. Fase 1: corrigir seguranca Firestore/Auth.
3. Fase 3: corrigir pedido/checkout minimo.
4. Fase 5: criar tipos de dominio para os fluxos acima.
5. Fase 9: documentar o estado real.

## Observacoes

O projeto nao precisa ficar perfeito antes de ficar utilizavel. Mas ele precisa ficar seguro e rastreavel antes de receber pedido real.


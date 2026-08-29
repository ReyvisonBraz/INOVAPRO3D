# Plano de componentização e modularização — 2026-08-29

**Estado:** em execução
**Escopo:** frontend React, acesso a dados do cliente e adaptadores HTTP do projeto
**Mudança funcional planejada:** nenhuma durante as extrações estruturais

Este documento atualiza a estratégia de refatoração com base no estado real do código em
29/08/2026. Ele complementa, sem apagar, os planos históricos de profissionalização e de
refatoração dos god-components. Quando houver diferença de métricas ou estrutura, este plano é a
referência para a execução atual.

## 1. Resultado esperado

- Componentes cuidam de apresentação e interação local.
- Hooks de aplicação coordenam casos de uso, sem executar consultas Firestore diretamente.
- Repositórios são a fronteira entre a aplicação e Firebase/APIs externas.
- Tipos de domínio deixam de depender de tipos do Firebase.
- Cada painel administrativo carrega apenas os recursos que utiliza.
- Calculadora separa projeto, persistência, precificação, clientes, templates e estado visual.
- Express e handlers Vercel compartilham os mesmos casos de uso.
- Refatorações preservam dados, rotas, aparência e comportamento público.

## 2. Baseline confirmado

| Indicador                                 |                Valor inicial |
| ----------------------------------------- | ---------------------------: |
| Testes automatizados                      | 309 aprovados em 34 arquivos |
| Erros de lint                             |                            0 |
| Avisos de lint conhecidos                 |                           17 |
| `AdminDashboard.tsx`                      |                 1.536 linhas |
| `useCalculatorState.ts`                   |                 1.482 linhas |
| Chunk do Admin                            |   652,76 kB / 101,99 kB gzip |
| Chunk da calculadora                      |    200,33 kB / 33,48 kB gzip |
| Consumidores diretos de Firebase em `src` |                  39 arquivos |
| Consumidores de `types/domain`            |  aproximadamente 90 arquivos |
| Ciclos de importação detectados           |                            0 |

Comandos do baseline:

```bash
npm run check
git diff --check
```

## 3. Regras de execução

1. Uma fronteira por vez: não misturar extração estrutural, redesign e regra nova.
2. Compatibilidade primeiro: manter fachadas antigas até que todos os consumidores migrem.
3. Testar antes de remover: cada módulo extraído recebe teste de contrato ou caracterização.
4. Firebase não atravessa a fronteira de infraestrutura em código novo.
5. Um commit deve ser reversível sem depender do commit seguinte.
6. Avisos de lint não podem aumentar acima do baseline.
7. Pagamentos, pedidos e persistência da calculadora exigem smoke test manual além da suíte.
8. Não criar abstrações CRUD genéricas antes de existirem pelo menos dois casos concretos iguais.

## 4. Arquitetura incremental de destino

```text
src/
├── app/                         # rotas e providers globais
├── features/
│   ├── orders/
│   │   ├── domain/             # contratos e regras sem SDK externo
│   │   ├── data/               # mappers e implementação de repositório
│   │   ├── hooks/              # coordenação React da feature
│   │   └── components/
│   ├── calculator/
│   ├── catalog/
│   ├── customers/
│   └── inventory/
├── shared/
│   ├── ui/
│   ├── hooks/
│   └── utils/
└── infrastructure/
    ├── firebase/
    ├── storage/
    ├── payments/
    └── analytics/
```

A estrutura atual continuará funcionando durante a transição. Arquivos são movidos somente quando
o domínio correspondente estiver sendo migrado.

## 5. Pacotes de trabalho

### WP0 — Proteção e baseline

**Objetivo:** distinguir regressão de dívida preexistente.

- [x] Executar typecheck, lint, formatação, testes e build.
- [x] Registrar testes, avisos e tamanhos dos chunks.
- [ ] Adicionar infraestrutura de testes de interação React quando o primeiro componente visual for
      migrado.
- [ ] Criar factories compartilhadas para pedido, produto, cliente e orçamento.
- [ ] Registrar screenshots de referência das telas que sofrerão extração visual.

**Saída:** baseline reproduzível e testes de caracterização antes de cada migração.

### WP1 — Fronteira de pedidos

**Objetivo:** entregar o primeiro exemplo completo de domínio → repositório → hook.

- [x] Criar contrato `OrderRepository` sem tipos do SDK Firebase.
- [x] Criar mapper de documentos e garantir que o ID autoritativo seja o do documento.
- [x] Criar implementação Firestore para lista e assinatura.
- [x] Criar `useAdminOrders` com repositório injetável.
- [x] Atualizar pedido novo localmente, sem recarregar todas as coleções.
- [x] Preservar `orders`, `setOrders` e `fetchData` na fachada `useAdminData`.
- [x] Adicionar testes do mapper, deduplicação e limite da lista.
- [x] Executar smoke autenticado na aba Pedidos.

**Critérios de aceite:**

- chegada de pedido novo gera um único aviso;
- listener é cancelado ao desmontar;
- lista continua limitada aos 50 pedidos recentes;
- sincronização manual ainda consulta pedidos e dados auxiliares;
- falha de sincronização manual não exibe sucesso indevido;
- nenhum aviso novo de lint.

### WP2 — Decomposição de `useAdminData`

**Objetivo:** carregar dados por painel e reduzir leituras Firestore.

Progresso do recorte de orçamentos:

- [x] Criar contrato paginado com cursor opaco.
- [x] Criar mapper e repositório Firestore testados.
- [x] Extrair estado, primeira página e paginação para `useAdminQuotes`.
- [x] Migrar `fetchQuoteById` para a mesma fronteira.
- [x] Preservar `quotes`, `setQuotes`, `loadMoreQuotes` e os indicadores de paginação na fachada.
- [x] Executar smoke autenticado da aba Orçamentos e da sincronização manual.

Ordem de extração:

1. orçamentos, incluindo cursor e paginação — concluído;
2. produtos e categorias;
3. clientes e chamados;
4. materiais e inventário;
5. impressoras e configurações;
6. cupons, logs e lixeira.

Cada recurso terá contrato, mapper, repositório e hook. `useAdminData` continuará agregando os hooks
durante a migração e será removido somente depois que os painéis consumirem as features diretamente.

**Critérios de aceite:**

- abrir uma aba não consultada não gera leitura antecipada;
- loading e erro são independentes por recurso;
- uma mutação invalida somente os recursos afetados;
- casts diretos de snapshots são substituídos por mappers testados.

### WP3 — Primitivas administrativas

**Objetivo:** eliminar duplicação comportamental e visual de modais e formulários.

Componentes previstos:

```text
AdminDialog
AdminConfirmDialog
AdminDialogHeader
AdminFormField
AdminTextInput
AdminNumberInput
AdminSelect
AdminTextarea
AdminFormActions
```

Ordem de migração: categoria → cliente → material → impressora → showcase → produto → FAQ → pedido.

**Critérios de aceite:** fechamento por Escape, foco controlado, restauração de foco, bloqueio de
scroll, `role="dialog"`, `aria-modal`, mensagens de erro associadas ao campo e ausência de mudança
visual não aprovada.

### WP4 — Dashboard como composition root

**Objetivo:** retirar do Dashboard regras específicas das features.

- Extrair comandos e seleção de pedidos.
- Extrair coordenação de produtos, categorias e materiais.
- Fazer cada rota/painel consumir seu hook de feature.
- Carregar painéis pesados sob demanda.
- Manter no Dashboard apenas autorização, navegação, layout e composição.

**Critérios de aceite:** Dashboard sem chamadas diretas ao Firebase e sem regras de persistência de
entidades; chunk inicial administrativo menor; todas as abas cobertas pelo smoke existente.

### WP5 — Calculadora

**Objetivo:** transformar `useCalculatorState` em uma fachada curta e estável.

Ordem de extração:

1. persistência local, versão e migração de rascunho;
2. templates;
3. busca e seleção de clientes;
4. impressoras e máquina efetiva;
5. material e estoque;
6. energia e trabalho;
7. precificação derivada;
8. salvamento de orçamento;
9. estado exclusivamente visual.

O contrato atual do hook será preservado enquanto os componentes consumidores forem migrados. Regras
numéricas permanecem puras e continuam centralizadas nos módulos de pricing.

**Critérios de aceite:** mesmos resultados para os cenários testados, mesmo formato de snapshot,
compatibilidade com rascunhos existentes e nenhuma duplicação das fórmulas.

### WP6 — Tipos e bibliotecas centrais

**Objetivo:** reduzir acoplamento a `types/domain.ts`, `pricing.ts` e `adminHelpers.tsx`.

- Extrair contratos por feature e reexportar temporariamente pelo arquivo antigo.
- Converter `Timestamp` e `FieldValue` somente nas bordas do repositório.
- Separar pricing em tipos, defaults, cálculo, merge e formatação.
- Separar processamento de imagens, tradução, formatação textual e componentes React.

**Critérios de aceite:** domínio sem imports Firebase; consumidores migrados gradualmente; nenhuma
quebra de documentos Firestore antigos.

### WP7 — Casos de uso compartilhados pelo servidor

**Objetivo:** remover divergência entre Express e handlers Vercel.

Ordem: relatório de erro → status de pagamento → metadata → notificação → criação de pedido →
processamento de pagamento → webhooks.

Cada caso de uso recebe entrada e dependências tipadas e retorna um resultado independente de
`Request`/`Response`. Express e Vercel permanecem adaptadores finos.

**Critérios de aceite:** autenticação, rate limit e mapeamento de erro coerentes; casos de uso
testáveis sem servidor HTTP; idempotência preservada nos fluxos financeiros.

### WP8 — CSS, imports e proteção automática das fronteiras

- Dividir tokens, base, admin, impressão e motion.
- Padronizar novos imports com o alias adotado pelo projeto.
- Adicionar restrições de lint para impedir Firebase em componentes e domínio.
- Atualizar o guia de arquitetura e remover referências comprovadamente obsoletas.

## 6. Portões de qualidade

Todo pacote deve passar por:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:run
npm run build
git diff --check
```

Quando houver interface, executar smoke desktop, mobile e teclado. Quando houver Firebase, confirmar
sucesso, permissão negada e indisponibilidade de rede. Quando houver pagamento, testar também
duplicidade e idempotência.

## 7. Estratégia de commits e rollback

Padrão de commits:

```text
test(orders): characterize document mapping
refactor(orders): introduce repository boundary
refactor(admin): isolate recent orders query
feat(admin-ui): add accessible dialog primitives
refactor(calculator): extract draft persistence
```

Cada commit deve conter seu teste e poder ser revertido isoladamente. A fachada antiga só será
removida em commit próprio, depois de todos os consumidores migrarem.

## 8. Indicadores de evolução

- imports diretos de Firebase em `src`: 39 → 0 em componentes, páginas e domínio;
- recarregamento geral ao receber pedido: eliminado no WP1;
- `useAdminData`: removido ao final do WP2/WP4;
- modais administrativos duplicados: substituídos por uma primitiva acessível;
- `useCalculatorState`: reduzido a uma fachada de composição;
- testes de componentes, hooks e serviços críticos: adicionados por fluxo, não por snapshot;
- avisos de lint: nunca acima de 17 e reduzidos em pacote separado;
- ciclos de dependência: permanecer em zero.

## 9. Próxima ação

Concluir o WP1 com suíte completa e smoke autenticado. Em seguida, iniciar WP2 pela paginação de
orçamentos, porque ela já possui estado e cursor próprios e pode ser extraída sem alterar os demais
painéis.

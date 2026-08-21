# Plano de Execucao Modular por IA

## 1. Objetivo

Refatorar gradualmente o projeto Inovapro3D para uma estrutura modular por feature e responsabilidade, sem alterar comportamento, regras de negocio ou UX existentes.

O processo deve reduzir o acoplamento das telas grandes, especialmente a calculadora e o painel administrativo, mantendo cada etapa pequena, revisavel e reversivel.

## 2. Contexto atual

Arquivos e areas principais:

- `src/App.tsx`: providers globais e roteamento principal.
- `src/pages/public/FilamentCalculator.tsx`: tela principal da calculadora.
- `src/pages/public/calculator/useCalculatorState.ts`: estado, handlers e fluxo da calculadora.
- `src/components/calculator/`: componentes ja extraidos da calculadora.
- `src/pages/admin/AdminDashboard.tsx`: orquestrador do painel administrativo.
- `src/pages/admin/components/`: paineis do admin.
- `src/pages/admin/hooks/`: hooks especificos do admin.
- `src/lib/`: regras puras, calculos, serializacao e utilitarios de dominio.
- `src/services/`: acesso a Firebase e integracoes externas.
- `src/contexts/`: estado global compartilhado.

Existe um plano anterior relacionado em `DOCS/superpowers/plans/2026-07-09-etapa-5-refatorar-god-components.md`. Este documento e a versao operacional e adaptavel para execucao acompanhada por IA.

## 3. Regras obrigatorias

1. Nao reescrever a aplicacao inteira.
2. Nao alterar comportamento, regras de negocio ou UX sem autorizacao.
3. Uma extracao ou pequeno grupo coeso por vez.
4. Ler o codigo atual antes de editar.
5. Formular uma hipotese local sobre a responsabilidade que sera extraida.
6. Fazer a menor edicao que teste essa hipotese.
7. Validar imediatamente depois da primeira edicao.
8. Nao inventar APIs, props ou tipos sem verificar o codigo existente.
9. Nao introduzir `any` para contornar problemas de tipagem.
10. Preservar alteracoes preexistentes feitas pelo usuario.
11. Nao criar commit automaticamente.
12. Parar e informar se houver ambiguidade, regressao ou bloqueio.

## 4. Fluxo obrigatorio de cada tarefa

Antes de editar:

- identificar o arquivo e o simbolo responsavel;
- ler apenas o contexto necessario;
- localizar usos e dependencias;
- registrar o comportamento que deve permanecer igual;
- indicar a validacao que pode confirmar ou negar a hipotese.

Durante a edicao:

- fazer uma alteracao pequena e focada;
- manter nomes e contratos publicos quando possivel;
- extrair primeiro logica coesa, depois apresentacao;
- nao misturar refatoracao com nova funcionalidade.

Depois da edicao:

- executar a validacao mais especifica disponivel;
- corrigir apenas problemas da mesma fatia;
- relatar arquivos alterados, resultado e riscos;
- somente entao avancar.

## 5. Formato obrigatorio de acompanhamento

Ao terminar cada tarefa, responder:

- **Tarefa:**
- **Hipotese:**
- **Arquivos lidos:**
- **Arquivos alterados:**
- **O que foi extraido:**
- **Validacao executada:**
- **Resultado:**
- **Riscos ou impasses:**
- **Proximo passo proposto:**

Nao marcar uma etapa como concluida sem validacao recente.

## 6. Fase 0 - Mapeamento e linha de base

### Objetivo

Conhecer o estado atual antes de modificar o codigo.

### Acoes

- verificar status do Git e preservar alteracoes existentes;
- medir tamanho dos componentes grandes;
- ler `package.json`, scripts de validacao e configuracao TypeScript;
- mapear calculadora, admin, catalogo e checkout;
- identificar testes existentes relacionados;
- executar a linha de base:
  - `npx tsc --noEmit`
  - `npm run test:run`
  - `npm run lint`

### Criterio de conclusao

A IA deve produzir um relatorio curto com:

- estado inicial dos testes;
- arquivos grandes e suas responsabilidades;
- primeira fatia recomendada;
- problemas preexistentes que nao serao tratados nesta etapa.

### Impasse

Se a linha de base falhar por problema preexistente, nao mascarar nem corrigir tudo. Registrar o erro, verificar se afeta a fatia escolhida e separar o problema antes de continuar.

## 7. Fase 1 - Modularizacao da calculadora

### Objetivo

Deixar `FilamentCalculator.tsx` como container/orquestrador, mantendo calculos e estado fora do JSX.

### Ordem de extracao

1. Confirmar que a matematica continua em `src/lib/pricing.ts` e arquivos de dominio relacionados.
2. Manter `useCalculatorState.ts` como fonte de estado e handlers.
3. Extrair um bloco coeso de apresentacao por vez:
   - entradas e configuracoes do projeto;
   - resultados e resumo financeiro;
   - templates;
   - simulador de cenarios;
   - resumo/sticky bar;
   - fluxo de salvamento e revisao, se ainda estiver misturado ao JSX.
4. Usar props explicitas e tipadas.
5. Nao recalcular valores dentro de componentes apresentacionais.

### Arquivos candidatos

- `src/pages/public/FilamentCalculator.tsx`
- `src/pages/public/calculator/useCalculatorState.ts`
- `src/components/calculator/`
- `src/lib/pricing.ts`
- `src/lib/calculatorProject.ts`

### Criterio de conclusao

- a calculadora continua aceitando os mesmos dados;
- os valores calculados permanecem iguais;
- a pagina principal apenas coordena estado, layout e componentes;
- cada bloco extraido pode ser lido e validado isoladamente;
- nao ha duplicacao da regra de negocio.

### Validacao

- `npx tsc --noEmit`
- testes relevantes da calculadora/pricing;
- smoke manual em `/calculadora`: peso, tempo, quantidade, material, impressora, salvar e carregar rascunho quando aplicavel.

### Impasse

Se houver muitas props, nao criar um objeto generico sem tipagem. Dividir o bloco ou criar um tipo de props especifico. Se o componente depender de estado demais, extrair primeiro um hook menor ou uma funcao pura.

## 8. Fase 2 - Modularizacao do admin

### Objetivo

Reduzir `AdminDashboard.tsx` a um orquestrador de dados, navegacao e paineis.

### Ordem de extracao

1. Extrair configuracoes para `useAdminSettings`.
2. Extrair edicao de pedidos para `useOrderEditing`.
3. Extrair a selecao `activeTab -> painel` para `AdminPanelRouter`.
4. Extrair logica especifica que ainda esteja no dashboard, uma por vez.
5. Preservar contratos dos paineis existentes.

### Arquivos candidatos

- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/admin/hooks/`
- `src/pages/admin/components/`
- `src/pages/admin/components/AdminSettingsPanel.tsx`
- paineis `Admin*Panel.tsx` relacionados a cada fatia.

### Criterio de conclusao

- cada aba possui responsabilidade clara;
- dashboard nao concentra regras especificas de todas as abas;
- configuracoes, pedidos e navegacao podem evoluir separadamente;
- todas as abas continuam funcionando.

### Validacao

- `npx tsc --noEmit`
- `npm run test:run`
- `npm run lint`
- smoke manual em `/admin`, incluindo configuracoes, pedidos e abas afetadas.

### Impasse

Se houver estado compartilhado entre abas, nao mover para contexto global automaticamente. Primeiro identificar se e estado de sessao, estado de uma feature ou estado realmente global. Usar uma funcao/contrato explicito quando possivel.

## 9. Fase 3 - Organizacao por feature

Depois de estabilizar calculadora e admin, avaliar a migracao gradual para:

```text
src/features/
  calculator/
    components/
    hooks/
    services/
    types.ts
    utils/
  admin/
    components/
    hooks/
    services/
    types.ts
  catalog/
  checkout/
  auth/
```

Nao mover arquivos em massa. Cada arquivo deve ser movido somente quando houver beneficio claro, atualizando imports e validando imediatamente.

### Criterio de conclusao

Ao abrir uma feature, o desenvolvedor consegue encontrar sua UI, estado, contratos e integracoes sem procurar em varias areas sem relacao.

### Impasse

Se um componente for genuinamente compartilhado, mantê-lo em `src/components`. Nao duplicar nem forcar compartilhamento artificial.

## 10. Fase 4 - Regras puras e infraestrutura

Manter fora da UI:

- calculos financeiros;
- precificacao;
- validacoes;
- forecast de inventario;
- montagem de documentos;
- serializacao;
- acesso a Firebase e APIs externas.

Regras de dependencia:

- componentes podem consumir hooks;
- hooks podem consumir services e libs;
- services podem consumir infraestrutura;
- libs puras nao devem importar React nem depender do DOM;
- UI nao deve acessar Firebase diretamente quando um service existente for suficiente.

## 11. Fase 5 - Consolidacao

Executar:

- `npx tsc --noEmit`
- `npm run test:run`
- `npm run lint`
- `npm run build`

Medir novamente os maiores arquivos e revisar dependencias. Fazer smoke manual em:

- `/calculadora`
- `/admin`
- `/catalogo`
- `/checkout`

## 12. Condicoes de parada

Parar imediatamente e relatar quando:

- uma mudanca alterar comportamento sem autorizacao;
- a regra atual nao puder ser determinada com seguranca;
- surgir regressao nao explicada;
- o typecheck ou teste falhar por causa da fatia alterada;
- a extracao exigir reescrever uma feature inteira;
- houver conflito com alteracoes recentes do usuario.

Ao parar:

1. nao apagar alteracoes do usuario;
2. registrar o erro exato;
3. indicar o ultimo ponto estavel;
4. propor uma fatia menor ou uma leitura adicional;
5. aguardar aprovacao se a decisao envolver comportamento.

## 13. Definicao de pronto

Uma etapa esta pronta somente quando:

- responsabilidade extraida esta clara;
- tipos e imports estao corretos;
- comportamento foi preservado;
- validacao executavel passou;
- riscos restantes foram registrados;
- o proximo passo esta definido.

## 14. Primeiro comando da IA

A IA deve comecar lendo este arquivo e executando apenas a Fase 0. Nao editar codigo na primeira rodada. Depois deve apresentar a linha de base e aguardar aprovacao para iniciar a primeira extracao.

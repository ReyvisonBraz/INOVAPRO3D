# Plano de profissionalização segura — INOVAPRO3D

**Estado:** planejado  
**Data-base:** 25/07/2026  
**Objetivo:** elevar a qualidade interna sem mudar regras de negócio, aparência ou
fluxos que já funcionam, entregando mudanças pequenas, testáveis e reversíveis.

---

## 1. Resultado esperado

Ao final deste plano, o projeto deve:

- impedir que erros de TypeScript cheguem à produção;
- validar automaticamente cálculo, autenticação e rotas críticas;
- ter módulos menores, com responsabilidades e contratos claros;
- manter compatibilidade com documentos antigos do Firestore;
- publicar somente versões aprovadas por uma sequência automática de checks;
- permitir rollback rápido de cada fase;
- possuir documentação coerente com o código atual;
- continuar visualmente igual durante as fases de refatoração.

Este plano **não** inclui novas funcionalidades de negócio. Melhorias como falhas de
impressão, produção multiparte e novas funções comerciais devem continuar em planos
separados. Misturar feature nova com refatoração dificulta descobrir a origem de bugs.

---

## 2. Diagnóstico atual

### Pontos fortes

- React 19, TypeScript estrito e estrutura de pastas coerente.
- Motor de precificação isolado em `src/lib/pricing.ts`.
- Estrutura de projetos Bambu isolada em `src/lib/calculatorProject.ts`.
- 50 testes automatizados passando em 6 arquivos.
- Rotas protegidas, Error Boundary, lazy loading e tratamento de erros do Firebase.
- Vercel conectada ao `main` e deploy automático funcionando.
- Domínio, serviços, hooks e componentes já possuem separação inicial.

### Riscos confirmados

1. `npm run build` não executa `tsc --noEmit`.
   - A Vite transpila, mas não garante todos os contratos TypeScript.
   - O erro do painel de 25/07/2026 teria sido detectado por um typecheck obrigatório.
2. Arquivos grandes e com responsabilidades acumuladas:
   - `AdminDashboard.tsx`: aproximadamente 1.440 linhas;
   - `FilamentCalculator.tsx`: aproximadamente 1.141 linhas;
   - `AdminOverviewPanel.tsx`: aproximadamente 1.036 linhas;
   - `ProductDetail.tsx`: aproximadamente 834 linhas;
   - `Navbar.tsx`: aproximadamente 658 linhas.
3. Testes atuais estão concentrados nas bibliotecas de cálculo.
   - Há pouca proteção automática para renderização, autenticação, painel e Firestore.
4. O lint passa, mas mantém alertas de hooks que precisam ser tratados gradualmente.
5. A documentação contém informações antigas:
   - ainda declara ausência de testes;
   - apresenta contagens de linhas e pendências que já mudaram;
   - mistura planos antigos de produto com estado técnico atual.
6. Deploy do frontend e publicação das regras Firebase são processos separados.
7. O projeto ainda não possui pipeline de CI versionado em `.github/workflows`.

---

## 3. Princípios obrigatórios de execução

### 3.1 Uma mudança por vez

Cada lote deve ter um único propósito:

- proteção;
- teste;
- extração de componente;
- extração de hook;
- normalização de dados;
- documentação.

Não misturar refatoração estrutural, mudança visual e regra de preço no mesmo commit.

### 3.2 Comportamento preservado

Durante refatorações:

- textos continuam iguais;
- cálculos continuam iguais;
- nomes de coleções e documentos continuam iguais;
- rotas continuam iguais;
- campos salvos continuam compatíveis;
- layout não deve ser redesenhado.

### 3.3 Compatibilidade antes de migração

Dados antigos devem passar por funções de normalização na leitura. Nenhuma fase deve
depender de editar todos os documentos existentes no Firestore.

Exemplo:

```ts
const project = normalizeCalculatorProject(rawProject);
```

Somente depois de a leitura compatível estar em produção deve ser considerada uma
migração permanente de documentos.

### 3.4 Refatorar com rede de proteção

Antes de mover uma regra, criar um teste que descreva o comportamento atual. Isso é
um **teste de caracterização**: ele não decide se a regra é ideal, apenas impede que
ela mude silenciosamente.

### 3.5 Preview antes de produção

Depois da fase inicial, a rotina recomendada será:

1. criar branch curta;
2. executar checks localmente;
3. publicar preview da Vercel;
4. testar rotas críticas no preview;
5. integrar no `main`;
6. acompanhar deploy;
7. executar smoke test em produção.

### 3.6 Rollback simples

Cada fase precisa caber em commits pequenos. Se houver regressão:

- reverter somente o commit da fase;
- publicar novamente;
- não tentar corrigir várias coisas diretamente em produção;
- registrar a causa antes de retomar.

---

## 4. Portões obrigatórios de qualidade

Nenhuma fase será considerada pronta sem:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
git diff --check
```

Além disso:

- fluxo alterado testado manualmente em desktop;
- fluxo alterado testado manualmente em viewport mobile quando possuir UI;
- console do navegador sem erro novo;
- autenticação admin e rota pública principal verificadas;
- diff revisado para confirmar ausência de mudanças não relacionadas.

### Smoke test mínimo após cada deploy

1. Abrir `/`.
2. Abrir `/catalogo`.
3. Abrir um produto.
4. Abrir `/calculadora` com administrador autenticado.
5. Abrir `/admin`.
6. Alternar pelo menos duas abas do painel.
7. Confirmar que não existe tela do Error Boundary.
8. Confirmar que o console não recebeu erro novo.

Quando a fase afetar checkout, orçamento ou estoque, acrescentar o fluxo específico
correspondente sem necessariamente finalizar pagamento real.

---

## 5. Estratégia de branches e commits

Até hoje, publicar diretamente no `main` foi útil para ganhar velocidade. Durante a
profissionalização, o padrão mais seguro será:

- branch: `codex/profissionalizacao-fase-N-assunto`;
- um a três commits pequenos por lote;
- preview Vercel antes do merge;
- merge no `main` somente após os portões de qualidade;
- tag opcional antes de fases maiores: `pre-profissionalizacao-fase-N`.

Correções urgentes de produção continuam podendo ir diretamente ao `main`, desde que
sejam pequenas, validadas e acompanhadas até o deploy.

---

## 6. Fases de execução

## Fase 0 — Congelar a referência funcional

**Risco:** baixo  
**Mudança funcional:** nenhuma

### Objetivo

Registrar o que funciona hoje para termos uma referência objetiva durante a
refatoração.

### Tarefas

- [x] Registrar SHA inicial e deploy estável.
- [x] Criar checklist manual das rotas críticas.
- [ ] Capturar screenshots de referência:
  - home desktop e mobile;
  - catálogo;
  - produto;
  - calculadora;
  - visão geral do admin;
  - aba de orçamentos;
  - configurações.
- [x] Registrar resultado atual de build, lint, testes e tamanhos de bundles.
- [x] Registrar todos os alertas atuais do lint para distinguir alertas antigos de novos.
- [ ] Listar coleções e documentos de configuração usados por cada tela.

### Critério de conclusão

Baseline documentada e reproduzível, sem alteração de código de produção.

---

## Fase 1 — Colocar cintos de segurança no pipeline

**Risco:** baixo  
**Prioridade:** crítica

### Motivo

É a fase que impediria a falha recente do painel.

### Tarefas

- [x] Adicionar script:

```json
"typecheck": "tsc --noEmit"
```

- [x] Criar script agregado:

```json
"check": "npm run typecheck && npm run lint && npm run test:run && npm run build"
```

- [x] Executar `typecheck` e corrigir erros reais encontrados, em commits separados
      por área.
- [x] Criar workflow de GitHub Actions para:
  - instalar com `npm ci`;
  - rodar typecheck;
  - rodar lint;
  - rodar testes;
  - rodar build.
- [x] Impedir novas advertências de lint, mantendo as antigas catalogadas até suas
      fases específicas.
- [x] Confirmar que nenhuma chave ou `.env` é enviada nos artefatos/logs.

### Critério de conclusão

Todo commit/PR possui check automático e nenhuma falha de TypeScript pode ser
considerada um build aprovado.

### Rollback

O workflow pode ser revertido sem tocar no produto. Correções de tipos devem ser
separadas para poderem ser revertidas individualmente.

---

## Fase 2 — Testes de caracterização dos fluxos críticos

**Risco:** baixo  
**Mudança funcional:** nenhuma

### Ordem de cobertura

1. Proteção das rotas `/admin` e `/calculadora`.
2. Renderização inicial do `AdminDashboard`.
3. Calculadora simples, multicolor e multiparte.
4. Conversão de orçamento em pedido.
5. Reserva/baixa de estoque.
6. Carrinho e totais do checkout.
7. Leitura de configurações pública e administrativa.

### Tarefas

- [ ] Instalar somente as dependências de teste realmente necessárias.
- [ ] Criar factories tipadas para:
  - material;
  - bandeja;
  - projeto;
  - orçamento;
  - pedido;
  - usuário admin/cliente;
  - settings antigos e atuais.
- [ ] Mockar Firebase apenas na fronteira de serviço, não em cada componente.
- [ ] Criar teste que renderiza a visão geral do admin com projeto vazio.
- [ ] Criar teste para documento antigo sem `calculationProject`.
- [ ] Criar testes de snapshot de **dados**, não snapshots enormes de HTML.
- [ ] Adicionar um primeiro smoke test de navegador para login já autenticado e
      abertura do painel.

### Critério de conclusão

Os principais bugs que já aconteceram passam a ter teste de regressão.

---

## Fase 3 — Normalizar contratos e dados legados

**Risco:** médio  
**Mudança funcional:** nenhuma

### Objetivo

Garantir que componentes nunca recebam estruturas incompletas vindas do Firestore,
local state ou registros antigos.

### Tarefas

- [ ] Criar normalizadores puros:
  - `normalizePricingSettings`;
  - `normalizeMachineConfig`;
  - `normalizeCalculatorProject`;
  - `normalizeQuote`;
  - `normalizeOrder`;
  - `normalizeMaterial`.
- [ ] Definir defaults em um único local por domínio.
- [ ] Validar arrays antes de usar `.map`, `.reduce`, `.some` ou `.flatMap`.
- [ ] Separar tipos:
  - documento bruto do Firestore;
  - modelo normalizado usado pela aplicação;
  - payload de criação/atualização.
- [ ] Tornar explícitos os campos legados ainda aceitos.
- [ ] Registrar telemetria quando um documento precisar de fallback.
- [ ] Não alterar dados em massa nesta fase.

### Critério de conclusão

Todo dado externo entra na interface por uma fronteira de normalização testada.

---

## Fase 4 — Reduzir o `AdminDashboard` incrementalmente

**Risco:** médio  
**Meta:** orquestrador entre 300 e 500 linhas, sem meta rígida artificial

### Estratégia

Não reescrever o painel. Extrair uma responsabilidade por lote e publicar após cada
extração.

### Ordem recomendada

1. Modais grandes ainda presentes no dashboard.
2. Estado e ações de materiais.
3. Estado e ações de vitrine.
4. Estado e ações do CRM.
5. Estado e ações de suporte/FAQ.
6. Cálculos derivados e filtros.
7. Composição final das abas.

### Regras por extração

- [ ] Primeiro criar teste de caracterização da área.
- [ ] Mover código sem renomear tudo ao mesmo tempo.
- [ ] Preservar assinatura inicialmente.
- [ ] Reduzir props apenas em uma segunda alteração.
- [ ] Evitar criar um contexto global para esconder prop drilling.
- [ ] Manter operações Firestore nos hooks/serviços, não no componente visual.
- [ ] Testar a aba extraída no navegador.

### Critério de conclusão

O dashboard decide qual aba mostrar e coordena módulos, mas não implementa CRUD de
cada domínio.

---

## Fase 5 — Modularizar a calculadora sem alterar a matemática

**Risco:** alto  
**Motivo do risco:** preço e estoque têm impacto financeiro

### Fronteiras desejadas

```text
CalculatorPage
├── ProjectIdentitySection
├── PlateList
│   └── PlateEditor
│       └── FilamentUsageEditor
├── VariableCostsSection
├── PricingSummary
├── StockWarnings
└── QuoteActions
```

### Tarefas

- [ ] Manter `computePricing` e `computeProjectPricing` como únicas fontes de cálculo.
- [ ] Separar formulário, resultado e persistência.
- [ ] Remover gradualmente estados legados de peso/tempo/material que não alimentam
      mais o projeto novo.
- [ ] Criar adaptador temporário quando uma interface antiga ainda precisar desses
      campos.
- [ ] Testar:
  - uma cor;
  - várias cores na mesma bandeja;
  - múltiplas bandejas de uma cor;
  - filamento do estoque;
  - filamento manual;
  - falta de estoque;
  - custos variáveis zerados;
  - preço mínimo;
  - repetição de bandeja;
  - salvamento de orçamento.
- [ ] Comparar resultados antes/depois com fixtures fixas da Bambu.

### Critério de conclusão

Calculadora pública e calculadora do admin usam o mesmo editor e o mesmo motor, sem
duplicação de regra financeira.

---

## Fase 6 — Criar uma camada de dados consistente

**Risco:** médio/alto

### Objetivo

Evitar chamadas Firestore espalhadas e padronizar erros, timestamps, conversões e
escritas atômicas.

### Tarefas

- [ ] Criar repositórios por domínio, sem criar um repositório genérico complexo:
  - `ordersRepository`;
  - `quotesRepository`;
  - `materialsRepository`;
  - `settingsRepository`.
- [ ] Mover consultas gradualmente, uma coleção por vez.
- [ ] Padronizar conversão de Timestamp.
- [ ] Usar transaction/batch quando estoque e status precisarem mudar juntos.
- [ ] Implementar operações idempotentes em conversões de orçamento/pedido.
- [ ] Testar regras no Firebase Emulator.
- [ ] Versionar e testar regras de Firestore e Storage.
- [ ] Documentar a ordem correta:
  1. publicar código compatível;
  2. publicar regras;
  3. validar;
  4. só então remover compatibilidade antiga.

### Critério de conclusão

Componentes não conhecem detalhes de query, coleção ou conversão de Timestamp.

---

## Fase 7 — Design system e consistência visual

**Risco:** médio  
**Observação:** iniciar somente depois da estabilidade estrutural

### Tarefas

- [ ] Inventariar componentes já existentes antes de criar novos.
- [ ] Consolidar:
  - cards;
  - inputs;
  - selects;
  - modais;
  - estados vazios;
  - mensagens de erro;
  - skeletons;
  - botões de ação perigosa.
- [ ] Criar tokens para espaçamento, cores semânticas e tipografia.
- [ ] Preservar as cores e a organização visual já aprovadas da calculadora.
- [ ] Verificar contraste, foco por teclado, labels e áreas de toque.
- [ ] Testar breakpoints pequenos, médios e desktop.
- [ ] Fazer comparação visual com a baseline da Fase 0.

### Critério de conclusão

Novas telas usam componentes consistentes sem descaracterizar a identidade atual.

---

## Fase 8 — Segurança, observabilidade e operação

**Risco:** alto  
**Execução:** mudanças pequenas e auditáveis

### Tarefas

- [ ] Revisar regras de acesso por coleção e documento.
- [ ] Garantir que settings privados nunca sejam lidos no storefront.
- [ ] Testar usuário anônimo, cliente e administrador no Emulator.
- [ ] Separar erros esperados de falhas inesperadas.
- [ ] Adicionar correlação básica de erros por versão/commit.
- [ ] Evitar registrar dados pessoais e segredos no console.
- [ ] Criar health check das APIs essenciais.
- [ ] Documentar deploy de:
  - Vercel;
  - Firestore Rules;
  - Storage Rules;
  - variáveis de ambiente.
- [ ] Definir procedimento de incidente e rollback.
- [ ] Revisar dependências e vulnerabilidades sem executar atualização automática em
      massa.

### Critério de conclusão

Existe evidência de quem pode fazer o quê, como detectar falha e como voltar para uma
versão estável.

---

## Fase 9 — Performance e acabamento técnico

**Risco:** médio

### Tarefas

- [ ] Medir antes de otimizar.
- [ ] Revisar chunk `vendor-3d`, mantendo o visualizador carregado sob demanda.
- [ ] Revisar chunk de gráficos e painel.
- [ ] Evitar listeners Firestore duplicados.
- [ ] Paginar coleções grandes do admin.
- [ ] Otimizar imagens e dimensões reservadas para evitar layout shift.
- [ ] Medir home, catálogo, produto, calculadora e admin separadamente.
- [ ] Definir orçamento de bundle e impedir regressões relevantes.

### Critério de conclusão

Melhorias demonstradas por métricas; nenhuma “otimização” baseada apenas em sensação.

---

## Fase 10 — Documentação e entrega profissional

**Risco:** baixo

### Tarefas

- [ ] Atualizar guias que ainda afirmam que não existem testes.
- [ ] Atualizar contagens e responsabilidades dos módulos.
- [ ] Criar diagrama simples:
  - frontend;
  - API;
  - Firebase;
  - Stripe;
  - Vercel.
- [ ] Documentar modelo de dados real.
- [ ] Documentar como executar, testar, publicar e reverter.
- [ ] Criar ADRs curtos para decisões importantes:
  - motor único de preço;
  - projetos por bandeja;
  - momento da baixa de estoque;
  - separação settings públicos/privados.
- [ ] Configurar identidade Git correta para commits futuros.
- [ ] Arquivar ou marcar documentos históricos para não parecerem estado atual.

### Critério de conclusão

Uma pessoa técnica nova consegue compreender, executar e alterar o projeto sem
depender de conhecimento oral.

---

## 7. Ordem prática recomendada

### Ciclo A — Blindagem imediata

Fases 0, 1 e a parte essencial da Fase 2.

**Entrega:** pipeline confiável e regressão do painel coberta.

### Ciclo B — Contratos e compatibilidade

Fase 3, seguida da camada de settings da Fase 6.

**Entrega:** dados antigos não derrubam telas novas.

### Ciclo C — Admin

Fase 4 em pequenos lotes.

**Entrega:** painel mais fácil de manter sem mudança visual.

### Ciclo D — Calculadora

Fase 5, usando fixtures da Bambu já definidas.

**Entrega:** calculadora modular com resultado financeiro idêntico.

### Ciclo E — Plataforma profissional

Fases 6, 7, 8, 9 e 10, sempre por sublotes.

---

## 8. Matriz de risco por tipo de alteração

| Alteração | Risco | Proteção mínima |
|---|---:|---|
| Documentação | Baixo | revisão e links válidos |
| Script/CI | Baixo | rodar localmente e no GitHub |
| Extração visual sem lógica | Médio | screenshot + render test |
| Extração de hook | Médio | teste de caracterização |
| Normalização Firestore | Médio | fixtures antigas e atuais |
| Precificação | Alto | testes numéricos exatos |
| Estoque | Alto | testes de transação/idempotência |
| Autenticação/regras | Alto | Emulator com três papéis |
| Checkout/pagamento | Muito alto | sandbox + webhook idempotente |

---

## 9. Definição de pronto para cada lote

Um lote só está pronto quando:

- [ ] escopo pequeno e explícito;
- [ ] comportamento anterior documentado;
- [ ] teste criado ou atualizado;
- [ ] typecheck aprovado;
- [ ] lint sem erro novo;
- [ ] todos os testes aprovados;
- [ ] build aprovado;
- [ ] teste manual da área aprovado;
- [ ] preview aprovado quando aplicável;
- [ ] deploy acompanhado até sucesso;
- [ ] smoke test de produção aprovado;
- [ ] documentação atualizada quando a arquitetura mudou;
- [ ] rollback conhecido.

---

## 10. O que não fazer

- Não reescrever o painel inteiro.
- Não trocar Firebase, React, Vite ou Tailwind durante a refatoração.
- Não atualizar todas as dependências de uma vez.
- Não migrar todos os documentos do banco antes de existir leitura compatível.
- Não remover campos antigos no mesmo deploy que introduz os novos.
- Não criar abstrações genéricas antes de existirem pelo menos dois casos reais.
- Não redesenhar a interface enquanto se move regra de negócio.
- Não aceitar build verde sem typecheck, testes e smoke test.
- Não misturar correção urgente com “aproveitei e reorganizei”.

---

## 11. Primeiro lote recomendado

O primeiro lote de implementação deverá conter somente:

1. script `typecheck`;
2. script `check`;
3. execução inicial do TypeScript;
4. correção dos erros encontrados, separados por domínio;
5. teste de regressão para o estado da calculadora no painel;
6. workflow de CI;
7. atualização da documentação que ainda diz “zero testes”.

Somente depois desse lote aprovado deve começar a divisão dos arquivos grandes.

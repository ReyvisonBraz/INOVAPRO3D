# 04 - Admin Dashboard - Subplano Detalhado de Modularizacao

## Escopo

Reduzir risco de manutencao do painel admin sem reescrever tudo de uma vez.

## Evidencias no Codigo

`src/pages/admin/AdminDashboard.tsx` concentra:

- colecoes Firestore;
- filtros;
- estados de modais;
- formularios;
- CRUD;
- graficos;
- CRM;
- pedidos;
- orcamentos;
- materiais;
- vitrine;
- suporte;
- FAQ;
- logs;
- calculadora;
- WhatsApp;
- Pix simulado.

O arquivo tem aproximadamente 187 KB.

## Risco

Qualquer alteracao no admin tem alto risco de regressao, porque estados e funcoes de dominios diferentes coexistem no mesmo componente.

## Inventario de Modulos Candidatos

### Layout e navegacao

- sidebar;
- header;
- tabs;
- mobile menu;
- busca global.

### Dados

- `useAdminData`;
- `useOrders`;
- `useQuotes`;
- `useProducts`;
- `useMaterials`;
- `useCustomers`;
- `useTickets`;
- `useFaqs`;
- `useLogs`;

### Abas

- `OverviewTab`;
- `OrdersTab`;
- `QuotesTab`;
- `ProductsTab`;
- `MaterialsTab`;
- `ShowcaseTab`;
- `CrmTab`;
- `SupportTab`;
- `FaqsTab`;
- `SettingsTab`;
- `LogsTab`.

### Modais

- `OrderDetailsModal`;
- `QuoteDetailsModal`;
- `ProductFormModal`;
- `MaterialFormModal`;
- `ShowcaseFormModal`;
- `CustomerFormModal`;
- `FaqFormModal`;
- `ConfirmDialog`.

### Helpers

- `parseTimeToHours`;
- `buildWhatsAppQuoteUrl`;
- `buildPixCode`;
- `exportCustomersToCSV`;
- `formatCurrency`;
- `formatFirestoreDate`.

## Estrategia de Extracao

Nao comecar extraindo as abas maiores. Comecar por baixo risco:

1. helpers puros;
2. componentes de confirmacao;
3. tipos de dominio;
4. modais simples;
5. tabs menores;
6. tabs criticas;
7. hooks de dados.

## Plano de Execucao

- [ ] Criar `src/types/domain.ts`.
- [ ] Criar `src/pages/admin/utils/adminFormatters.ts`.
- [ ] Criar `src/pages/admin/components/ConfirmDialog.tsx`.
- [ ] Extrair modais de FAQ/material/showcase primeiro.
- [ ] Extrair `OverviewTab` depois que helpers estiverem prontos.
- [ ] Extrair `OrdersTab` e `QuotesTab` por ultimo, pois mexem em dinheiro/status.
- [ ] Criar hooks de dados somente quando tipos estiverem definidos.

## Criterios de Aceite

- A cada extracao, comportamento visual permanece igual.
- Typecheck passa apos cada grupo de mudancas.
- `AdminDashboard.tsx` diminui progressivamente.
- Funcoes de CRUD ficam rastreaveis por entidade.
- Modais nao dependem de estados de outras abas.

## Riscos Durante Refatoracao

- Quebrar modal por perda de estado compartilhado.
- Duplicar fetch sem perceber.
- Alterar ordem visual ou responsividade.
- Perder permissao/admin behavior.
- Introduzir props gigantes.

## Regra de Ouro

Refatorar sem mudar funcionalidade primeiro. Melhorar fluxo depois.


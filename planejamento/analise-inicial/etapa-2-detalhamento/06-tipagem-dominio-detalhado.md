# 06 - Tipagem e Dominio - Subplano Detalhado

## Escopo

Criar contratos de dados para reduzir `any`, evitar status invalidos e proteger fluxos de dinheiro, usuario e operacao.

## Evidencias no Codigo

Busca por `any` encontrou ocorrencias em:

- `AuthContext.tsx`;
- `AdminDashboard.tsx`;
- `Catalog.tsx`;
- `Home.tsx`;
- `CustomQuote.tsx`;
- `MyOrders.tsx`;
- `ProductDetail.tsx`;
- `Navbar.tsx`;
- `Footer.tsx`.

O admin concentra a maior quantidade.

## Tipos Prioritarios

### Auth

- `UserRole = "CUSTOMER" | "ADMIN" | "OPERATOR"`
- `UserProfile`

### Catalogo

- `Product`
- `ProductTechnicalSpec`
- `Material`
- `ShowcaseItem`

### Compra

- `CartItem`
- `Order`
- `OrderItem`
- `OrderStatus`
- `ShippingAddress`

### Orcamento

- `Quote`
- `QuoteStatus`
- `QuoteMaterial`

### Admin/CRM

- `Customer`
- `Ticket`
- `FAQ`
- `AuditLog`
- `GlobalSettings`

## Regras de Modelagem

- Status devem ser union types ou const arrays.
- Dinheiro sempre `number` em reais ou centavos, com decisao explicita.
- Datas Firestore devem ter tipo claro e helper de formatacao.
- Campos opcionais precisam ser realmente opcionais.
- Documentos Firestore devem ser convertidos por helper.

## Ordem Recomendada

1. Criar tipos de status.
2. Tipar carrinho.
3. Tipar usuario/profile.
4. Tipar pedidos.
5. Tipar produtos/materiais.
6. Tipar quotes.
7. Tipar admin aos poucos.

## Plano de Execucao

- [ ] Criar `src/types/domain.ts`.
- [ ] Criar `src/types/firestore.ts`.
- [ ] Criar `src/lib/firestoreConverters.ts`.
- [ ] Substituir `any` em `CartContext`.
- [ ] Substituir `any` em `AuthContext`.
- [ ] Substituir `any` em `MyOrders` e `Checkout`.
- [ ] Substituir `any` em `ProductDetail` e `Catalog`.
- [ ] Atacar `AdminDashboard` apos extrair tipos basicos.

## Exemplo de Contratos Necessarios

```ts
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "QUEUE"
  | "SLICING"
  | "PRINTING"
  | "FINISHING"
  | "READY"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELED";
```

## Criterios de Aceite

- `CartContext` nao usa `any`.
- `AuthContext` nao usa `any` para profile.
- Pedidos e quotes usam status tipado.
- Funcoes que alteram status aceitam apenas status valido.
- Typecheck ajuda a encontrar inconsistencias reais.

## Execucao Parcial - 2026-05-23

### Alteracoes Aplicadas

- Criado `src/types/domain.ts`.
- Adicionados tipos compartilhados:
  - `UserRole`
  - `UserProfile`
  - `UserProfileUpdate`
  - `CartItem`
  - `OrderStatus`
  - `QuoteStatus`
  - `ShippingAddress`
  - `OrderItem`
  - `Order`
  - `Quote`
  - `Product`
  - `ProductTechnicalSpec`
  - `ProductDimensions`
  - `Material`
  - `ShowcaseItem`
- `CartContext.tsx` passou a importar `CartItem` do dominio.
- `AuthContext.tsx` passou a usar `UserProfile` e `UserProfileUpdate`.
- `Checkout.tsx` passou a tipar o endereco com `ShippingAddress`.
- `MyOrders.tsx` passou a usar `Order`, `OrderItem` e `OrderStatus`.
- `Catalog.tsx` passou a usar `Product` e `ShowcaseItem`.
- `ProductDetail.tsx` passou a usar `Product` e `Material`.
- `CustomQuote.tsx` passou a usar `Material` e validar `file/material` antes de criar quote.
- `Home.tsx` passou a usar `ShowcaseItem`.
- Foram adicionados tipos administrativos iniciais:
  - `Coupon`
  - `Customer`
  - `Ticket`
  - `FAQ`
  - `AuditLog`
  - `GlobalSettings`
- `AdminDashboard.tsx` passou a tipar os estados principais de colecoes (`orders`, `quotes`, `products`, `showcase`, `materials`, `coupons`, `customers`, `tickets`, `faqs`, `logs`).
- `AdminDashboard.tsx` passou a tipar selecoes principais de produto, material, vitrine, pedido, CRM e quote/ticket selecionado.
- `Footer.tsx` e `Navbar.tsx` tiveram usos residuais de `any` removidos.
- As funcoes principais de quote/status no admin deixaram de usar `any` direto.

### Validacao

- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.
- Busca por `useState<any`, `any[]`, `item: any` e assinaturas comuns com `any` em `src/pages/public`, `src/contexts` e `src/types` nao retornou ocorrencias.
- `npm.cmd run lint` passou apos aplicar tipos iniciais no admin.
- `npm.cmd run build` passou apos remover os `any` diretos restantes.
- Busca global por padroes comuns de `any` (`any[]`, `useState<any`, `: any`, `as any`, parametros e maps com `any`) nao retornou ocorrencias em `src`.
- Revalidado em 2026-05-24: os dois `map((i:any) => ...)` residuais em `AdminDashboard.tsx` foram trocados para `OrderItem`, e a busca por `any` em `src` nao retornou ocorrencias.

### Pendencias

- Criar helpers para conversao de documentos Firestore.
- Padronizar status no admin usando os mesmos tipos compartilhados.

# Etapa 2 — Integridade de Preço no Servidor

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Passos com checkbox (`- [ ]`).
> **Pré-requisito recomendado:** Etapa 1 (Vitest instalado) — a Tarefa 2 escreve testes.

**Goal:** Impedir que o cliente controle o preço/total do pedido. O `total` e os preços de linha passam a ser **recalculados no servidor** a partir do catálogo real no Firestore, via um endpoint com Admin SDK; o cliente deixa de criar pedidos diretamente.

**Architecture:** Hoje o [Checkout](../../../src/pages/public/Checkout.tsx) grava o pedido **direto no Firestore** com `total` e `items[].price` vindos do carrinho (localStorage) — 100% controlável pelo cliente. As regras só exigem `total > 0`. Movemos a criação para `POST /api/orders/create`: o servidor lê `products/{id}.basePrice` × `materials/{id}.priceMult` (Admin SDK, que bypassa regras), recalcula tudo, grava o pedido e devolve o `orderId`. A regra de `create` de `orders` para clientes é fechada. A lógica de recálculo vive numa função **pura e testável** (`api/_orderPricing.ts`), sem I/O.

**Tech Stack:** Express (server.ts), firebase-admin, Vitest.

## Restrições globais (resumo — ver [README](README.md))

- `npx tsc --noEmit` limpo, `npm run lint` 0 erros, `npm run test:run` verde ao final.
- default-deny do Firestore preservado.
- Nenhum preço confiado do cliente daqui pra frente.

## Contexto necessário (para não perder o fio)

**Como o preço entra no carrinho hoje** (verificado no código):

- [Catalog.tsx:244](../../../src/pages/public/Catalog.tsx#L244) e [Home.tsx:118](../../../src/pages/public/Home.tsx#L118): `addItem({ id: product.id, name, price: product.basePrice, quantity, image, type: 'PRODUCT' })`.
- [ProductDetail.tsx:169-176](../../../src/pages/public/ProductDetail.tsx#L169-L176): `addItem({ id: \`${product.id}-${selectedMaterial.id}\`, name, price: totalPrice/quantity, quantity, ... })`, onde `totalPrice = product.basePrice * (selectedMaterial.priceMult ?? 1) * quantity` ([linha 162](../../../src/pages/public/ProductDetail.tsx#L162)).
- **Logo, o preço unitário legítimo é sempre `basePrice × (priceMult ?? 1)`.** É isso que o servidor precisa reproduzir.
- O `id` do item no ProductDetail é composto (`productId-materialId`), frágil de parsear. **Vamos guardar `productId` e `materialId` explícitos** no item.

**Escopo:** só itens `type: 'PRODUCT'` chegam ao checkout hoje (não há `addItem` com `type: 'QUOTE'` no código). Esta etapa cobre PRODUCT. Itens QUOTE são recusados pelo endpoint (extensão futura: validar contra `quotes/{id}.total` do admin). Cupom também fica fora — o Checkout atual já grava `couponCode: null` ([Checkout.tsx:75](../../../src/pages/public/Checkout.tsx#L75)).

**Tipos/símbolos existentes:**
- `CartItem` em [src/types/domain.ts:24-32](../../../src/types/domain.ts#L24-L32).
- `getAdminDb`, `isAdminSdkConfigured`, `verifyToken`, `rateLimit` já existem em [server.ts](../../../server.ts).

---

## File Structure

- Create: `api/_orderPricing.ts` — função pura `computeOrderTotal(items, products, materials)`.
- Create: `api/_orderPricing.test.ts` — testes da função pura.
- Modify: `vitest.config.ts` — incluir `api/**/*.test.ts`.
- Modify: `src/types/domain.ts` — `CartItem` ganha `productId?` e `materialId?`.
- Modify: `src/pages/public/Catalog.tsx`, `Home.tsx`, `ProductDetail.tsx` — passar `productId`/`materialId` no `addItem`.
- Modify: `server.ts` — novo endpoint `POST /api/orders/create`.
- Modify: `src/pages/public/Checkout.tsx` — chamar o endpoint em vez de `addDoc`.
- Modify: `firestore.rules` — fechar `create` de `orders` para clientes; remover `isValidOrderCreate` (fica órfã).

---

## Task 1: Adicionar `productId`/`materialId` ao item de carrinho

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/pages/public/Catalog.tsx:244`
- Modify: `src/pages/public/Home.tsx:118-124`
- Modify: `src/pages/public/ProductDetail.tsx:169-176`

**Interfaces:**
- Produces: `CartItem.productId?: string`, `CartItem.materialId?: string` — o endpoint (Task 3) confia nesses campos, não no `id` composto.

- [ ] **Step 1: Estender o tipo `CartItem`**

Em [src/types/domain.ts](../../../src/types/domain.ts), no `interface CartItem`, adicionar dois campos opcionais (mantidos opcionais para não invalidar carrinhos já salvos em localStorage):

```typescript
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  type: CartItemType;
  /** Id do produto de origem (para recálculo de preço no servidor). */
  productId?: string;
  /** Id do material selecionado, quando houver. */
  materialId?: string;
  options?: Record<string, string | number | boolean | null | undefined>;
}
```

- [ ] **Step 2: Passar `productId` no Catalog**

[src/pages/public/Catalog.tsx:244](../../../src/pages/public/Catalog.tsx#L244):

```typescript
    addItem({ id: product.id, name: product.name, price: product.basePrice, quantity: 1, image: product.images[0], type: "PRODUCT", productId: product.id });
```

- [ ] **Step 3: Passar `productId` no Home**

[src/pages/public/Home.tsx:118](../../../src/pages/public/Home.tsx#L118), dentro do `addItem({...})` de `handleAdd`, acrescentar `productId: product.id,` (ao lado de `id: product.id`).

- [ ] **Step 4: Passar `productId`/`materialId` no ProductDetail**

[src/pages/public/ProductDetail.tsx:169-176](../../../src/pages/public/ProductDetail.tsx#L169-L176):

```typescript
    addItem({
      id: `${product.id}-${selectedMaterial.id}`,
      name: `${product.name} (${selectedMaterial.name})`,
      price: totalPrice / quantity,
      quantity: quantity,
      image: product.images?.[0] ?? "",
      type: 'PRODUCT',
      productId: product.id,
      materialId: selectedMaterial.id,
    });
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/types/domain.ts src/pages/public/Catalog.tsx src/pages/public/Home.tsx src/pages/public/ProductDetail.tsx
git commit -m "feat(cart): carry productId/materialId on cart items for server-side pricing

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Função pura de recálculo + testes

**Files:**
- Create: `api/_orderPricing.ts`
- Create: `api/_orderPricing.test.ts`
- Modify: `vitest.config.ts`

**Interfaces:**
- Produces: `computeOrderTotal(items: OrderLineInput[], products: Map<string, ProductRecord>, materials: Map<string, MaterialRecord>): ComputeResult`. O endpoint (Task 3) consome esta função.
- Tipos exportados: `OrderLineInput`, `ProductRecord`, `MaterialRecord`, `ComputedLine`, `ComputeResult`.

- [ ] **Step 1: Criar `api/_orderPricing.ts`**

```typescript
// ============================================================================
// RECÁLCULO DE TOTAL DE PEDIDO (fonte de verdade no servidor)
// ----------------------------------------------------------------------------
// Função PURA (sem I/O): recebe os itens do cliente e os registros de catálogo
// já carregados do Firestore, e recalcula preço unitário e total. O cliente
// NUNCA define preço — só quais itens e quantidades quer.
// ============================================================================

export interface OrderLineInput {
  type: string;
  productId?: string;
  materialId?: string;
  quantity: number;
}

export interface ProductRecord {
  basePrice: number;
  active?: boolean;
  name?: string;
}

export interface MaterialRecord {
  priceMult?: number;
  name?: string;
}

export interface ComputedLine {
  productId: string;
  materialId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export type ComputeResult =
  | { ok: true; lines: ComputedLine[]; total: number }
  | { ok: false; error: string };

const MAX_ITEMS = 50;
const MAX_QTY = 99;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeOrderTotal(
  items: OrderLineInput[],
  products: Map<string, ProductRecord>,
  materials: Map<string, MaterialRecord>,
): ComputeResult {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: "Pedido sem itens." };
  if (items.length > MAX_ITEMS) return { ok: false, error: "Itens demais no pedido." };

  const lines: ComputedLine[] = [];
  for (const it of items) {
    if (!it || it.type !== "PRODUCT") return { ok: false, error: "Tipo de item não suportado." };
    const productId = it.productId;
    if (typeof productId !== "string" || !productId) return { ok: false, error: "Item sem productId." };

    const product = products.get(productId);
    if (!product) return { ok: false, error: `Produto não encontrado: ${productId}` };
    if (product.active === false) return { ok: false, error: `Produto indisponível: ${productId}` };

    const base = Number(product.basePrice);
    if (!Number.isFinite(base) || base <= 0) return { ok: false, error: `Preço inválido: ${productId}` };

    const qty = Math.min(MAX_QTY, Math.max(1, Math.floor(Number(it.quantity) || 1)));

    let mult = 1;
    let materialId: string | null = null;
    if (it.materialId) {
      const mat = materials.get(it.materialId);
      if (!mat) return { ok: false, error: `Material não encontrado: ${it.materialId}` };
      const m = Number(mat.priceMult ?? 1);
      mult = Number.isFinite(m) && m > 0 ? m : 1;
      materialId = it.materialId;
    }

    const unitPrice = round2(base * mult);
    const lineTotal = round2(unitPrice * qty);
    lines.push({ productId, materialId, name: product.name ?? productId, quantity: qty, unitPrice, lineTotal });
  }

  const total = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  if (total <= 0) return { ok: false, error: "Total inválido." };
  return { ok: true, lines, total };
}
```

- [ ] **Step 2: Incluir `api/` no Vitest**

Em `vitest.config.ts`, trocar o `include` para cobrir os dois diretórios:

```typescript
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
```

- [ ] **Step 3: Escrever os testes**

`api/_orderPricing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeOrderTotal, type ProductRecord, type MaterialRecord } from './_orderPricing';

const products = new Map<string, ProductRecord>([
  ['p1', { basePrice: 100, active: true, name: 'Peça A' }],
  ['p2', { basePrice: 50, active: true, name: 'Peça B' }],
  ['inativo', { basePrice: 80, active: false, name: 'Descontinuada' }],
]);
const materials = new Map<string, MaterialRecord>([
  ['pla', { priceMult: 1, name: 'PLA' }],
  ['petg', { priceMult: 1.4, name: 'PETG' }],
]);

describe('computeOrderTotal', () => {
  it('recalcula total a partir do basePrice, ignorando qualquer preço do cliente', () => {
    const r = computeOrderTotal([{ type: 'PRODUCT', productId: 'p1', quantity: 2 }], products, materials);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.lines[0].unitPrice).toBe(100);
      expect(r.total).toBe(200);
    }
  });

  it('aplica o multiplicador do material', () => {
    const r = computeOrderTotal([{ type: 'PRODUCT', productId: 'p1', materialId: 'petg', quantity: 1 }], products, materials);
    expect(r.ok && r.total).toBe(140);
  });

  it('soma múltiplas linhas', () => {
    const r = computeOrderTotal([
      { type: 'PRODUCT', productId: 'p1', quantity: 1 },
      { type: 'PRODUCT', productId: 'p2', quantity: 3 },
    ], products, materials);
    expect(r.ok && r.total).toBe(250);
  });

  it('recusa produto inexistente', () => {
    const r = computeOrderTotal([{ type: 'PRODUCT', productId: 'zzz', quantity: 1 }], products, materials);
    expect(r.ok).toBe(false);
  });

  it('recusa produto inativo', () => {
    const r = computeOrderTotal([{ type: 'PRODUCT', productId: 'inativo', quantity: 1 }], products, materials);
    expect(r.ok).toBe(false);
  });

  it('recusa material inexistente', () => {
    const r = computeOrderTotal([{ type: 'PRODUCT', productId: 'p1', materialId: 'nao-existe', quantity: 1 }], products, materials);
    expect(r.ok).toBe(false);
  });

  it('recusa itens do tipo QUOTE (fora de escopo desta etapa)', () => {
    const r = computeOrderTotal([{ type: 'QUOTE', productId: 'p1', quantity: 1 }], products, materials);
    expect(r.ok).toBe(false);
  });

  it('satura quantidade inválida para o intervalo [1, 99]', () => {
    const r0 = computeOrderTotal([{ type: 'PRODUCT', productId: 'p2', quantity: 0 }], products, materials);
    const rBig = computeOrderTotal([{ type: 'PRODUCT', productId: 'p2', quantity: 1000 }], products, materials);
    expect(r0.ok && r0.lines[0].quantity).toBe(1);
    expect(rBig.ok && rBig.lines[0].quantity).toBe(99);
  });

  it('recusa carrinho vazio', () => {
    expect(computeOrderTotal([], products, materials).ok).toBe(false);
  });
});
```

- [ ] **Step 4: Rodar e confirmar**

Run: `npm run test:run -- api/_orderPricing.test.ts`
Expected: PASS (9 testes).

- [ ] **Step 5: Commit**

```bash
git add api/_orderPricing.ts api/_orderPricing.test.ts vitest.config.ts
git commit -m "feat(orders): pure server-side order total recompute + tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Endpoint `POST /api/orders/create`

**Files:**
- Modify: `server.ts`

**Interfaces:**
- Consumes: `computeOrderTotal`, `OrderLineInput`, `ProductRecord`, `MaterialRecord` de `./api/_orderPricing.ts`.
- Produces: rota `POST /api/orders/create` → `{ orderId: string, total: number }` (auth Bearer obrigatório).

- [ ] **Step 1: Importar a função pura no topo de `server.ts`**

Junto dos outros imports `./api/...` (perto da [linha 5-10](../../../server.ts#L5)):

```typescript
import { computeOrderTotal, type OrderLineInput, type ProductRecord, type MaterialRecord } from "./api/_orderPricing.ts";
```

- [ ] **Step 2: Registrar o endpoint depois de `app.use(express.json())`**

Inserir logo após [server.ts:166](../../../server.ts#L166) (`app.use(express.json());`), antes do `/api/notify/new-order`:

```typescript
  // ── Criação de pedido com preço recalculado no servidor ───────────────────
  // O cliente envia SÓ itens e quantidades. O total é recomputado do catálogo
  // (Admin SDK bypassa as regras). Fecha a manipulação de preço via localStorage.
  app.post('/api/orders/create', rateLimit(10), async (req, res) => {
    const uid = await verifyToken(req);
    if (!uid) { res.status(401).json({ error: 'Não autorizado.' }); return; }
    if (!isAdminSdkConfigured() || uid === 'unchecked') {
      // Sem Admin SDK não há recálculo confiável — recusa explícita (evita fallback inseguro).
      res.status(503).json({ error: 'Criação de pedido indisponível (servidor não configurado).' });
      return;
    }

    const body = req.body as {
      items?: OrderLineInput[]; userName?: string; userEmail?: string; phone?: string;
    };
    const items = Array.isArray(body.items) ? body.items : [];

    const productIds = [...new Set(items.filter((i) => i?.type === 'PRODUCT' && i.productId).map((i) => i.productId as string))];
    const materialIds = [...new Set(items.map((i) => i?.materialId).filter((x): x is string => !!x))];

    const adminDb = getAdminDb();
    const products = new Map<string, ProductRecord>();
    const materials = new Map<string, MaterialRecord>();
    try {
      await Promise.all(productIds.map(async (id) => {
        const snap = await adminDb.collection('products').doc(id).get();
        if (snap.exists) {
          const d = snap.data()!;
          products.set(id, { basePrice: Number(d.basePrice), active: d.active, name: d.name });
        }
      }));
      await Promise.all(materialIds.map(async (id) => {
        const snap = await adminDb.collection('materials').doc(id).get();
        if (snap.exists) {
          const d = snap.data()!;
          materials.set(id, { priceMult: d.priceMult, name: d.name });
        }
      }));
    } catch {
      res.status(500).json({ error: 'Erro ao carregar catálogo.' }); return;
    }

    const result = computeOrderTotal(items, products, materials);
    if (!result.ok) { res.status(400).json({ error: result.error }); return; }

    try {
      const orderItems = result.lines.map((l) => ({
        id: l.materialId ? `${l.productId}-${l.materialId}` : l.productId,
        productId: l.productId,
        materialId: l.materialId,
        name: l.name,
        price: l.unitPrice,
        quantity: l.quantity,
        type: 'PRODUCT',
      }));
      const ref = await adminDb.collection('orders').add({
        userId: uid,
        userName: body.userName ?? null,
        userEmail: body.userEmail ?? null,
        phone: body.phone ?? null,
        items: orderItems,
        subtotal: result.total,
        total: result.total,
        shippingRate: 0,
        couponCode: null,
        couponDiscount: null,
        shippingAddress: null,
        status: 'PENDING_PAYMENT',
        paymentMethod: 'manual',
        createdAt: new Date(),
      });
      res.json({ orderId: ref.id, total: result.total });
    } catch {
      res.status(500).json({ error: 'Erro ao criar pedido.' });
    }
  });
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add server.ts
git commit -m "feat(orders): add /api/orders/create with server-recomputed total

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Apontar o Checkout para o endpoint

**Files:**
- Modify: `src/pages/public/Checkout.tsx:61-110`

**Interfaces:**
- Consumes: `POST /api/orders/create`. Deixa de usar `addDoc(collection(db,'orders'), ...)`.

- [ ] **Step 1: Reescrever `handleCompleteOrder`**

Substituir o corpo de `handleCompleteOrder` ([Checkout.tsx:61-110](../../../src/pages/public/Checkout.tsx#L61-L110)) por uma versão que envia só itens e usa o total do servidor:

```typescript
  const handleCompleteOrder = async () => {
    const checkoutUser = await ensureCheckoutUser();
    if (!checkoutUser) return;

    setLoading(true);
    try {
      const idToken = await checkoutUser.getIdToken();
      const payloadItems = items.map((i) => ({
        type: i.type,
        productId: i.productId,
        materialId: i.materialId,
        quantity: i.quantity,
      }));

      const resp = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          items: payloadItems,
          userName: checkoutUser.displayName || checkoutUser.email,
          userEmail: checkoutUser.email,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || 'Erro ao gerar pedido. Tente novamente.');
        return;
      }
      const { orderId, total: serverTotal } = (await resp.json()) as { orderId: string; total: number };

      fetch('/api/notify/new-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          orderId,
          customerName: checkoutUser.displayName || checkoutUser.email,
          customerEmail: checkoutUser.email,
          total: serverTotal,
          itemCount: items.length,
          paymentMethod: 'manual',
        }),
      }).catch(() => {});

      if (!trackedPurchase.current) {
        trackedPurchase.current = true;
        trackPurchase(serverTotal, orderId);
      }

      setCreatedOrderId(orderId);
      setStep(2);
      clearCart();
      toast.success('Pedido recebido!', { description: 'Entraremos em contato para combinar pagamento e entrega.' });
    } catch {
      toast.error('Erro ao gerar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 2: Remover imports que ficaram órfãos**

Se `addDoc`, `collection`, `serverTimestamp`, `db`, `handleFirestoreError`, `OperationType` deixarem de ser usados em `Checkout.tsx`, remover das linhas de import ([15-16](../../../src/pages/public/Checkout.tsx#L15-L16)). Manter `auth` (usado por `ensureCheckoutUser`). O `noUnusedLocals` do tsconfig vai acusar se sobrar algo.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros; warnings não aumentaram.

- [ ] **Step 4: Commit**

```bash
git add src/pages/public/Checkout.tsx
git commit -m "feat(checkout): create orders via server endpoint, trust server total

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Fechar a criação de pedido nas regras do Firestore

**Files:**
- Modify: `firestore.rules:81-92` (função `isValidOrderCreate`) e `:293-297` (bloco `orders`)

**Interfaces:**
- Produces: clientes não criam mais `orders` direto; só o Admin SDK (endpoint) e admins autenticados.

- [ ] **Step 1: Trocar a regra de `create` de `orders`**

Em [firestore.rules:293-297](../../../firestore.rules#L293-L297):

```
    // ORDERS — criação SÓ via servidor (Admin SDK, que recalcula o total) ou
    // por um admin autenticado. O cliente não grava pedido direto: isso
    // fechava a manipulação de preço via localStorage.
    match /orders/{orderId} {
      allow read: if isSignedIn() && (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAdmin();
      allow write: if isAdmin();
    }
```

- [ ] **Step 2: Remover a função órfã `isValidOrderCreate`**

Apagar todo o bloco `function isValidOrderCreate(data) { ... }` em [firestore.rules:81-92](../../../firestore.rules#L81-L92) — não é mais referenciado por nenhuma regra (evita regra morta).

- [ ] **Step 3: Validar a sintaxe das regras**

Se o Firebase CLI estiver disponível: `npx firebase deploy --only firestore:rules --dry-run` (ou `firebase emulators:start` para testar). Caso contrário, revisar manualmente que `isValidOrderCreate` não aparece mais em `grep`.

Run: `grep -n "isValidOrderCreate" firestore.rules`
Expected: nenhuma ocorrência.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "security(rules): orders created only via Admin SDK, drop client create path

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 5 (MANUAL — operador): publicar as regras**

⚠️ **Ação externa** — deve ser feita/aprovada pelo dono, não automatizada:
```bash
firebase deploy --only firestore:rules
```
Sem isso, as regras novas não valem em produção. **Publicar só depois** que o endpoint estiver em produção, senão o checkout quebra (cliente não consegue mais criar pedido e o endpoint ainda não existe no deploy).

---

## Task 6: Verificação end-to-end

**Files:** nenhum (verificação).

- [ ] **Step 1: Rodar suíte + typecheck + lint**

```bash
npm run test:run
npx tsc --noEmit
npm run lint
```
Expected: tudo verde.

- [ ] **Step 2: Smoke test manual do fluxo (com Admin SDK configurado no `.env`)**

Com `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` no `.env`:
1. `npm run dev`, abrir `http://localhost:3000`.
2. Adicionar um produto ao carrinho, ir ao checkout, logar com Google, confirmar pedido.
3. Conferir no Firestore que o pedido criado tem `total` = `basePrice × priceMult × qty` (do catálogo), **independente** do que estava no localStorage.

- [ ] **Step 3: Teste negativo (prova da correção)**

1. Antes de confirmar, no DevTools: `JSON.parse(localStorage.inovapro3d_cart)`, editar o `price` de um item para `0.01`, salvar de volta com `localStorage.inovapro3d_cart = '...'`.
2. Confirmar o pedido.
3. **Esperado:** o pedido no Firestore mantém o preço real do catálogo, não `0.01`. Se ainda gravar `0.01`, a Task 4 não foi aplicada corretamente — revisar.

- [ ] **Step 4: Marcar a etapa como concluída** neste doc e no [README](README.md).

---

## Self-Review

1. **Cobertura do spec:** preço recalculado no servidor ✔️; cliente não define total ✔️; regra fechada ✔️; teste automatizado da lógica pura ✔️; verificação da fraude de R$0,01 ✔️.
2. **Sem placeholder:** todo passo tem código/comando real. ✔️
3. **Consistência de tipos:** `computeOrderTotal`, `OrderLineInput`, `ProductRecord`, `MaterialRecord`, `ComputeResult` usados igual em `_orderPricing.ts`, no teste e no `server.ts`. ✔️
4. **Risco residual documentado:** itens QUOTE e cupom ficam fora do escopo (sem code path hoje). Reabordar quando existir fluxo. ✔️

## Definição de pronto

- `POST /api/orders/create` recalcula o total do catálogo e grava via Admin SDK.
- Checkout não usa mais `addDoc` para `orders`.
- Regra de `create` de `orders` fechada para clientes; `isValidOrderCreate` removida.
- Teste negativo prova que editar o preço no localStorage não altera o total cobrado.

# Etapa 4 — Limpeza de ESLint + Higiene de Código

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` ou `superpowers:executing-plans`. Passos com checkbox (`- [ ]`).
> **Pré-requisito recomendado:** Etapa 1 (Vitest) — para não regredir os testes ao mexer nos efeitos.

**Goal:** Reduzir os 59 warnings do ESLint de forma **intencional** — corrigindo os que indicam problema real e **suprimindo com justificativa** os que são falso-positivo neste projeto. Não é "zerar cegamente": é deixar cada warning restante ser uma decisão consciente e documentada.

**Architecture:** Filosofia: (a) `no-explicit-any` → tipar de verdade ou, quando é global de terceiro, criar um tipo mínimo; (b) `set-state-in-effect` → derivar durante render ou usar inicializador preguiçoso de `useState`; quando é sincronização legítima de fonte externa, `eslint-disable-next-line` **com motivo**; (c) `react-refresh/only-export-components` → em arquivos que legitimamente exportam helper + componente (contexts, adminHelpers), desabilitar a regra **no arquivo** com justificativa.

**Tech Stack:** ESLint 10 (flat config em [eslint.config.js](../../../eslint.config.js)), TypeScript.

## Restrições globais (resumo — ver [README](README.md))

- Cada tarefa termina com `npx tsc --noEmit` limpo e `npm run test:run` verde.
- **0 erros** de ESLint sempre; warnings **só podem diminuir**.
- Nenhum `eslint-disable` sem comentário explicando o porquê.

## Contexto necessário (baseline medido em 2026-07-09)

Warnings por regra:

| Qtd | Regra | Natureza |
|----|-------|----------|
| 27 | `@typescript-eslint/no-explicit-any` | Tipagem — parte real, parte globals de terceiros |
| 18 | `react-hooks/set-state-in-effect` | Padrão de efeito — triagem caso a caso |
| 12 | `react-refresh/only-export-components` | Falso-positivo em contexts/helpers |
| 1  | `react-hooks/exhaustive-deps` | Dep faltando em [ProductDetail.tsx:123](../../../src/pages/public/ProductDetail.tsx#L123) |
| 1  | (diretiva `eslint-disable` não usada) | [ProductDetail.tsx:120](../../../src/pages/public/ProductDetail.tsx#L120) |

Concentração de `any`: [src/lib/analytics.ts](../../../src/lib/analytics.ts) (globals de pixel), [src/lib/adminHelpers.tsx](../../../src/lib/adminHelpers.tsx) (9 warnings totais), casts de `Timestamp` do Firestore em [useCoupon.ts](../../../src/hooks/useCoupon.ts) e [AdminCouponsPanel.tsx](../../../src/pages/admin/components/AdminCouponsPanel.tsx), e `catch (err: any)` em [useAdminActions.ts](../../../src/pages/admin/hooks/useAdminActions.ts) e [useCategoryAdmin.ts](../../../src/pages/admin/hooks/useCategoryAdmin.ts).

> **Nota:** `testConnection()` ([firebase.ts:42](../../../src/services/firebase.ts#L42)) e `DiagnosticWidget`/`DebugMarker` **são usados** ([main.tsx:24](../../../src/main.tsx#L24) e [AdminSettingsPanel.tsx:7](../../../src/pages/admin/components/AdminSettingsPanel.tsx#L7)) — **não** são código morto. Só há um smell menor: `testConnection` lê `system/health`, que cai no default-deny e é engolido silenciosamente. Tratado (opcional) na Task 6.

---

## File Structure

- Modify: `src/pages/public/ProductDetail.tsx` — remover diretiva órfã + resolver dep.
- Modify: `src/lib/analytics.ts` — tipar globals de pixel.
- Modify: `src/hooks/useCoupon.ts`, `src/pages/admin/components/AdminCouponsPanel.tsx`, `src/pages/admin/components/AdminOrdersPanel.tsx` — helper de data em vez de `as any`.
- Modify: `src/pages/admin/hooks/useAdminActions.ts`, `useCategoryAdmin.ts` — `catch (err)` sem `any`.
- Modify: sites de `set-state-in-effect` (triagem por arquivo).
- Modify: `src/contexts/*.tsx`, `src/lib/adminHelpers.tsx` — disable justificado de `only-export-components`.
- (Opcional) Modify: `src/services/firebase.ts` — honestar `testConnection`.

---

## Task 1: Quick wins — diretiva órfã + exhaustive-deps

**Files:**
- Modify: `src/pages/public/ProductDetail.tsx:120-130`

- [ ] **Step 1: Ver o estado atual do efeito**

Run: `npx eslint src/pages/public/ProductDetail.tsx`
Expected: mostra a diretiva `eslint-disable` não usada (linha ~120) e a dep faltante `product?.images?.length` (linha ~123).

- [ ] **Step 2: Resolver**

O warning da dep vem do efeito de reset de aba por `product?.id`. Remover a diretiva órfã e ajustar a lista de deps para o que o efeito realmente usa. Se o reset deve ocorrer **só** na troca de produto, manter `[product?.id]` e trocar a diretiva órfã por um comentário `eslint-disable-next-line react-hooks/exhaustive-deps` **na linha certa** (a do array de deps), com a justificativa que já existe no código ("reset da aba só quando troca de produto"). Confirmar que a diretiva passa a ser "usada" (some o warning de diretiva não usada) e a de dep some.

- [ ] **Step 3: Verificar**

Run: `npx eslint src/pages/public/ProductDetail.tsx`
Expected: 2 warnings a menos (a diretiva órfã e a exhaustive-deps).

- [ ] **Step 4: Commit**

```bash
git add src/pages/public/ProductDetail.tsx
git commit -m "chore(lint): fix orphan eslint-disable and effect deps in ProductDetail

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Tipar os globals de pixel em `analytics.ts`

**Files:**
- Modify: `src/lib/analytics.ts:11-15,51,69,71`

**Interfaces:**
- Produces: `Window` tipado para gtag/fbq/ttq sem `any`.

- [ ] **Step 1: Substituir a declaração `any` do `Window`**

Em [src/lib/analytics.ts:11-15](../../../src/lib/analytics.ts#L11-L15), trocar os campos `any` por tipos mínimos e honestos:

```typescript
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string };
    _fbq?: unknown;
    ttq?: TikTokPixel;
  }
}

interface TikTokPixel {
  push: (...args: unknown[]) => void;
  [key: string]: unknown;
}
```

- [ ] **Step 2: Ajustar os usos internos que eram `any`**

Nos pontos [analytics.ts:51,69,71](../../../src/lib/analytics.ts#L51), trocar `const n: any = ...` / `const ttq: any = ...` / `function (t: any, ...)` por `unknown` + narrowing, ou por os tipos acima. Rodar o typecheck para guiar os ajustes exatos:

Run: `npx tsc --noEmit`
Expected: resolver os erros que aparecerem trocando `any` por `unknown`/tipo específico. Sem erros ao final.

- [ ] **Step 3: Verificar warnings**

Run: `npx eslint src/lib/analytics.ts`
Expected: `no-explicit-any` zerado nesse arquivo.

- [ ] **Step 4: Commit**

```bash
git add src/lib/analytics.ts
git commit -m "chore(lint): type analytics window globals, drop any

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Eliminar `any` de datas Firestore e de `catch`

**Files:**
- Modify: `src/lib/utils.ts` (adicionar helper), `src/hooks/useCoupon.ts:40`, `src/pages/admin/components/AdminCouponsPanel.tsx:116`, `src/pages/admin/components/AdminOrdersPanel.tsx:138`, `src/pages/admin/hooks/useAdminActions.ts:89`, `src/pages/admin/hooks/useCategoryAdmin.ts:48,74`

**Interfaces:**
- Produces: `toJsDate(value: unknown): Date | null` em `src/lib/utils.ts` — converte `Timestamp | {seconds} | Date | string` em `Date`.

- [ ] **Step 1: Adicionar o helper em `src/lib/utils.ts`**

```typescript
/** Converte um valor de data heterogêneo (Firestore Timestamp, {seconds}, string, Date) em Date, ou null. */
export function toJsDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    try { return (value as { toDate: () => Date }).toDate(); } catch { return null; }
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value && typeof (value as { seconds: unknown }).seconds === 'number') {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
```

- [ ] **Step 2: Trocar os `(x as any).toDate?.()` pelo helper**

Em [useCoupon.ts:40](../../../src/hooks/useCoupon.ts#L40) e [AdminCouponsPanel.tsx:116](../../../src/pages/admin/components/AdminCouponsPanel.tsx#L116), substituir a expressão `(coupon.expiresAt as any).toDate?.() ?? new Date(coupon.expiresAt as any)` por `toJsDate(coupon.expiresAt)` (importando `toJsDate` de `../lib/utils` / caminho relativo correto). Em [AdminOrdersPanel.tsx:138](../../../src/pages/admin/components/AdminOrdersPanel.tsx#L138), trocar `const formatDate = (ts: any) => {` por `const formatDate = (ts: unknown) => {` e usar `toJsDate(ts)` internamente.

- [ ] **Step 3: Trocar `catch (err: any)` por `catch (err)`**

Em [useAdminActions.ts:89](../../../src/pages/admin/hooks/useAdminActions.ts#L89), [useCategoryAdmin.ts:48](../../../src/pages/admin/hooks/useCategoryAdmin.ts#L48) e [:74](../../../src/pages/admin/hooks/useCategoryAdmin.ts#L74): remover `: any` e, onde o código lê `err.message`, trocar por `err instanceof Error ? err.message : String(err)`.

- [ ] **Step 4: Typecheck + lint dos arquivos tocados**

```bash
npx tsc --noEmit
npx eslint src/hooks/useCoupon.ts src/pages/admin/components/AdminCouponsPanel.tsx src/pages/admin/components/AdminOrdersPanel.tsx src/pages/admin/hooks/useAdminActions.ts src/pages/admin/hooks/useCategoryAdmin.ts src/lib/utils.ts
```
Expected: sem erros; `no-explicit-any` some nesses arquivos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/hooks/useCoupon.ts src/pages/admin/components/AdminCouponsPanel.tsx src/pages/admin/components/AdminOrdersPanel.tsx src/pages/admin/hooks/useAdminActions.ts src/pages/admin/hooks/useCategoryAdmin.ts
git commit -m "chore(lint): add toJsDate helper, remove any from dates and catch blocks

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Triagem de `set-state-in-effect` (18 warnings)

**Files:**
- Modify: os arquivos com o warning (rodar `npx eslint . -f json` para listar). Exemplos verificados: [useCalculatorState.ts:123-126](../../../src/pages/public/calculator/useCalculatorState.ts#L123-L126), [ProductDetail.tsx:126-130](../../../src/pages/public/ProductDetail.tsx#L126-L130).

**Regra de decisão (aplicar a cada site):**
1. O estado inicial vem de `localStorage`/prop síncrona? → **Inicializador preguiçoso** `useState(() => ...)`. Elimina o efeito.
2. O estado é derivável de outro estado/props? → **Derivar durante o render** (remover o estado e o efeito).
3. É sincronização legítima de fonte **externa assíncrona** (fetch, subscription)? → manter o efeito e adicionar `// eslint-disable-next-line react-hooks/set-state-in-effect` com motivo de uma linha.

- [ ] **Step 1: Listar todos os sites**

Run: `npx eslint . -f json 2>/dev/null | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));for(const f of d)for(const m of f.messages)if(m.ruleId==='react-hooks/set-state-in-effect')console.log(f.filePath.split(/[\\\\/]/).slice(-2).join('/')+':'+m.line)"`
Expected: lista de ~18 `arquivo:linha`. Criar um item de TODO por site.

- [ ] **Step 2: Exemplo trabalhado — `useCalculatorState.ts` (caso 1: lazy init)**

Hoje ([linhas 118-130](../../../src/pages/public/calculator/useCalculatorState.ts#L118-L130)) o efeito lê `localStorage` e faz vários `setX(...)`. Refatorar para ler **uma vez** e alimentar os inicializadores dos `useState`:

```typescript
// Lê a config salva uma única vez (fora do render loop).
function loadSavedCalc(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem('inovapro3d:calc');
    if (!raw) return {};
    const cfg = JSON.parse(raw);
    return typeof cfg === 'object' && cfg !== null ? cfg : {};
  } catch { return {}; }
}
const saved = loadSavedCalc();
const isMat = (m: unknown): m is 'pla' | 'petg' => m === 'pla' || m === 'petg';

// ...dentro do hook, trocar os useState iniciais por inicializadores preguiçosos:
const [material, setMaterial] = useState<'pla' | 'petg'>(() => (isMat(saved.material) ? saved.material : 'pla'));
const [spoolPrice, setSpoolPrice] = useState<number>(() => (Number.isFinite(saved.spoolPrice) ? saved.spoolPrice as number : DEFAULT_SPOOL_PRICE));
// ...idem para os demais campos que o efeito setava...
```
Depois **remover** o `useEffect` de carga do localStorage. (Nome exato dos defaults — `DEFAULT_SPOOL_PRICE` etc. — conferir no topo do arquivo; usar os que já existem.)

- [ ] **Step 3: Exemplo trabalhado — `ProductDetail.tsx` (caso 3: sync externo)**

O preselect de material ([linhas 126-130](../../../src/pages/public/ProductDetail.tsx#L126-L130)) depende de `materials` vindo de fetch assíncrono. É sincronização externa legítima → manter e justificar:

```typescript
  useEffect(() => {
    if (materials.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pré-seleção após fetch assíncrono de materiais
      setSelectedMaterial((prev) => prev ?? materials[0]);
    }
  }, [materials]);
```

- [ ] **Step 4: Aplicar a regra de decisão aos demais sites, um a um**

Para cada site restante: classificar (1/2/3), aplicar o padrão, rodar `npx tsc --noEmit` e `npm run test:run`. **Commitar por arquivo** para manter o histórico revisável:

```bash
git add <arquivo>
git commit -m "chore(lint): resolve set-state-in-effect in <arquivo>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 5: Conferir a queda**

Run: `npx eslint . 2>&1 | tail -3`
Expected: total de warnings de `set-state-in-effect` reduzido (idealmente 0; o que sobrar deve ser caso-3 justificado).

---

## Task 5: `react-refresh/only-export-components` (12 warnings)

**Files:**
- Modify: arquivos que exportam hook/helper **junto** com componente — tipicamente [src/contexts/AuthContext.tsx](../../../src/contexts/AuthContext.tsx), `CartContext.tsx`, `ThemeContext.tsx`, `OnboardingContext.tsx` e [src/lib/adminHelpers.tsx](../../../src/lib/adminHelpers.tsx).

**Contexto:** essa regra só afeta o Fast Refresh (DX em dev), não o runtime. Nos contexts, exportar `Provider` + `useX()` do mesmo arquivo é o **padrão idiomático** do React — separar quebraria a ergonomia sem ganho real. Decisão: **desabilitar a regra no arquivo, com justificativa.**

- [ ] **Step 1: Listar os arquivos afetados**

Run: `npx eslint . -f json 2>/dev/null | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const s=new Set();for(const f of d)for(const m of f.messages)if(m.ruleId==='react-refresh/only-export-components')s.add(f.filePath.split(/[\\\\/]/).slice(-2).join('/'));console.log([...s].join('\n'))"`
Expected: lista dos arquivos (contexts + adminHelpers).

- [ ] **Step 2: Adicionar o disable no topo de cada arquivo listado**

Primeira linha do arquivo:

```typescript
/* eslint-disable react-refresh/only-export-components -- Provider + hook no mesmo módulo é o padrão idiomático deste projeto (não afeta runtime, só Fast Refresh). */
```

> Alternativa (maior esforço, não obrigatória): mover cada `useX()` para `src/contexts/useX.ts`. Só valer o esforço se o time quiser Fast Refresh 100% nos contexts.

- [ ] **Step 3: Verificar**

Run: `npx eslint . 2>&1 | tail -3`
Expected: `only-export-components` zerado.

- [ ] **Step 4: Commit**

```bash
git add src/contexts src/lib/adminHelpers.tsx
git commit -m "chore(lint): silence only-export-components on idiomatic provider+hook modules

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6 (OPCIONAL): Honestar `testConnection`

**Files:**
- Modify: `src/services/firebase.ts:42-50`

- [ ] **Step 1: Decidir**

`testConnection` lê `system/health`, que o default-deny **sempre** nega, e o `catch` só loga se a mensagem contém `'offline'` — ou seja, o check é enganoso. Opções: (a) apontar para um doc realmente legível (ex.: `settings/global`, que tem `allow read: if true`); ou (b) remover a função e o gate em [main.tsx:24](../../../src/main.tsx#L24), chamando `seedProducts()` direto. Escolher (a) para manter um health-check de verdade:

```typescript
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'settings', 'global'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error('Firebase is offline. Check configuration.');
    }
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/services/firebase.ts
git commit -m "chore: point testConnection at a readable doc (settings/global)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Fechamento — medir e registrar

- [ ] **Step 1: Rodar tudo**

```bash
npm run test:run
npx tsc --noEmit
npm run lint
```
Expected: testes verdes; `tsc` limpo; ESLint **0 erros** e contagem de warnings claramente menor que 59.

- [ ] **Step 2: Registrar o novo baseline**

Anotar no topo deste doc o total final de warnings e, se algum ficou, uma linha por quê (todos devem ser caso-3 justificados ou disables idiomáticos).

---

## Self-Review

1. **Cobertura:** as 5 categorias de warning têm tarefa. ✔️
2. **Sem placeholder:** helpers e disables têm código real; a Task 4 tem regra de decisão + 2 exemplos trabalhados e manda tratar cada site (não inventa código para arquivos não lidos). ✔️
3. **Consistência:** `toJsDate` definido na Task 3.1 e usado na 3.2. ✔️
4. **Honestidade:** `testConnection`/`DebugMarker` corretamente descritos como usados, não mortos. ✔️

## Definição de pronto

- ESLint 0 erros; warnings reduzidos e cada remanescente é uma decisão documentada.
- `no-explicit-any` eliminado dos sites tipáveis (analytics, datas, catch).
- Suíte de testes e typecheck verdes.

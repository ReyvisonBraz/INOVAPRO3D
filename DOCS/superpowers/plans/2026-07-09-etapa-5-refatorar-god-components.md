# Etapa 5 — Refatoração dos God-Components

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` ou `superpowers:executing-plans`. Passos com checkbox (`- [ ]`).
> **Pré-requisito recomendado:** Etapas 1 e 4 (rede de testes + base de lint limpa) para refatorar com segurança.

**Goal:** Reduzir o tamanho e a densidade de estado dos maiores componentes — [AdminDashboard.tsx](../../../src/pages/admin/AdminDashboard.tsx) (1368 linhas) e [FilamentCalculator.tsx](../../../src/pages/public/FilamentCalculator.tsx) (1213 linhas) — extraindo unidades coesas, **sem mudar comportamento**.

**Architecture:** Refatoração **behavior-preserving e incremental**. Cada extração é um "puro mover" (estado/lógica/JSX coeso saem para um hook ou subcomponente) verificado por `npx tsc --noEmit` + smoke manual da tela afetada + suíte de testes. **Um commit por extração**, para que qualquer passo seja revisável e reversível isoladamente. Não há teste de componente hoje; portanto a rede é: tipos + testes das funções puras + smoke manual. Extrair lógica **pura** (que ganha teste) é preferível a extrair JSX.

**Tech Stack:** React 19, TypeScript, hooks customizados.

## Restrições globais (resumo — ver [README](README.md))

- **Nenhuma mudança de comportamento.** Se algo mudar de comportamento, não é esta etapa.
- Cada extração termina com `npx tsc --noEmit` limpo, `npm run test:run` verde e smoke manual OK.
- `npm run lint`: 0 erros, warnings não aumentam.

## Contexto necessário (para não perder o fio)

**AdminDashboard** já é um **orquestrador**, não um god-component puro: delega para hooks (`useAdminData`, `useAdminActions`, `useCategoryAdmin`, `useProductAdmin`, `useQuoteAdmin`, `useQuickCalc`, `useCouponAdmin` — [linhas 46-52](../../../src/pages/admin/AdminDashboard.tsx#L46-L52)) e para ~18 painéis (`Admin*Panel`). O que ainda mora nele e pode sair:
- **Settings**: estado `globalSettings`/`machineConfig`/`pricingSettings` + o efeito de carga ([linhas 82-119](../../../src/pages/admin/AdminDashboard.tsx#L82-L119)) + os handlers de salvar settings (procurar por `settings` / `setDoc(doc(db,"settings",...))` no arquivo).
- **Edição de pedido**: `selectedOrder`, `editingItems`, `editedItems`, `selectedCustomer` ([linhas 90-93](../../../src/pages/admin/AdminDashboard.tsx#L90-L93)) + handlers relacionados.
- **Roteamento de painel**: o mapeamento `activeTab → <Admin*Panel />` (bloco de render grande).

**FilamentCalculator** já usa `useCalculatorState` ([src/pages/public/calculator/useCalculatorState.ts](../../../src/pages/public/calculator/useCalculatorState.ts), 366 linhas). As 1213 linhas do componente são majoritariamente **JSX de formulário + resultados**; a matemática vem de [src/lib/pricing.ts](../../../src/lib/pricing.ts) (não duplicar!).

**Diretório de destino já existe:** `src/pages/admin/hooks/` e `src/pages/admin/components/`.

---

## File Structure (alvo)

- Create: `src/pages/admin/hooks/useAdminSettings.ts` — estado + carga + persistência de settings.
- Create: `src/pages/admin/hooks/useOrderEditing.ts` — estado + handlers de edição de pedido.
- Create: `src/pages/admin/components/AdminPanelRouter.tsx` — mapeia `activeTab` → painel.
- Create: `src/pages/public/calculator/CalculatorInputs.tsx` e `CalculatorResults.tsx` — subcomponentes de apresentação.
- Modify: `AdminDashboard.tsx`, `FilamentCalculator.tsx` — passam a **consumir** as unidades extraídas.

**Meta de tamanho:** AdminDashboard e FilamentCalculator abaixo de ~700 linhas cada ao final (referência, não dogma).

---

## Task 1: Extrair `useAdminSettings`

**Files:**
- Create: `src/pages/admin/hooks/useAdminSettings.ts`
- Modify: `src/pages/admin/AdminDashboard.tsx:82-119` (e os handlers de salvar settings)

**Interfaces:**
- Produces: `useAdminSettings(): { globalSettings, setGlobalSettings, machineConfig, setMachineConfig, pricingSettings, setPricingSettings, saveSettings }`.

- [ ] **Step 1: Criar o hook com o estado + carga (código já verificado no componente)**

```typescript
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { DEFAULT_MACHINE, DEFAULT_PRICING_SETTINGS, mergePricingSettings, type MachineConfig, type PricingSettings } from '../../../lib/pricing';
import type { GlobalSettings } from '../../../types/domain';

export function useAdminSettings() {
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    promoBanner: 'Frete Grátis em pedidos acima de R$ 250',
    minOrderValue: 50,
    maintenanceMode: false,
  });
  const [machineConfig, setMachineConfig] = useState<MachineConfig>(DEFAULT_MACHINE);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [globalSnap, machineSnap, pricingSnap] = await Promise.all([
          getDoc(doc(db, 'settings', 'global')),
          getDoc(doc(db, 'settings', 'machine')),
          getDoc(doc(db, 'settings', 'pricing')),
        ]);
        if (globalSnap.exists()) setGlobalSettings(globalSnap.data() as GlobalSettings);
        if (machineSnap.exists()) setMachineConfig(machineSnap.data() as MachineConfig);
        if (pricingSnap.exists()) setPricingSettings(mergePricingSettings(pricingSnap.data()));
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  // Persistência: mover para cá o corpo dos handlers de salvar settings que hoje
  // vivem no AdminDashboard (procurar setDoc(doc(db,'settings',...))). Assinatura sugerida:
  const saveSettings = async (which: 'global' | 'machine' | 'pricing') => {
    const map = {
      global: globalSettings,
      machine: machineConfig,
      pricing: pricingSettings,
    } as const;
    await setDoc(doc(db, 'settings', which), map[which], { merge: true });
  };

  return { globalSettings, setGlobalSettings, machineConfig, setMachineConfig, pricingSettings, setPricingSettings, saveSettings };
}
```

> Ao mover os handlers de salvar reais, preservar **exatamente** a lógica atual (mesmos campos, mesmo `merge`, mesmos toasts). Se a versão atual faz algo além de `setDoc`, replicar aqui.

- [ ] **Step 2: Consumir no AdminDashboard**

Em `AdminDashboard.tsx`, remover os `useState` de settings ([82-89](../../../src/pages/admin/AdminDashboard.tsx#L82-L89)) e o `useEffect` de carga ([103-119](../../../src/pages/admin/AdminDashboard.tsx#L103-L119)), substituindo por:

```typescript
  const { globalSettings, setGlobalSettings, machineConfig, setMachineConfig, pricingSettings, setPricingSettings, saveSettings } = useAdminSettings();
```
Ajustar o `AdminSettingsPanel` para usar `saveSettings` onde antes chamava os handlers inline.

- [ ] **Step 3: Verificar (typecheck + smoke)**

```bash
npx tsc --noEmit && npm run test:run
```
Depois `npm run dev`, abrir `/admin` → aba **Configurações**: carregar, editar e **salvar** cada bloco (global, máquina, pricing). Confirmar que persiste igual a antes.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/hooks/useAdminSettings.ts src/pages/admin/AdminDashboard.tsx src/pages/admin/components/AdminSettingsPanel.tsx
git commit -m "refactor(admin): extract settings state+persistence into useAdminSettings

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Extrair `useOrderEditing`

**Files:**
- Create: `src/pages/admin/hooks/useOrderEditing.ts`
- Modify: `src/pages/admin/AdminDashboard.tsx` (estado `selectedOrder`/`editingItems`/`editedItems`/`selectedCustomer` + handlers)

**Interfaces:**
- Produces: hook que encapsula seleção e edição de pedido. Assinatura a fixar ao ler os handlers atuais; sugerido: `{ selectedOrder, setSelectedOrder, editingItems, setEditingItems, editedItems, setEditedItems, selectedCustomer, setSelectedCustomer, startEditing, saveEditedItems }`.

**Recipe (puro mover, sem mudar comportamento):**

- [ ] **Step 1: Localizar tudo que pertence à edição de pedido**

Run: `grep -n "selectedOrder\|editingItems\|editedItems\|selectedCustomer" src/pages/admin/AdminDashboard.tsx`
Expected: os `useState` ([90-93](../../../src/pages/admin/AdminDashboard.tsx#L90-L93)) e todos os handlers que os usam. Anotar cada handler.

- [ ] **Step 2: Criar `useOrderEditing.ts`** movendo **exatamente** aqueles `useState` e handlers (mesma lógica, mesmos nomes de função). O hook recebe o que precisar de fora (ex.: `orders`, `setOrders`, uma função de persistência) como parâmetros.

- [ ] **Step 3: Consumir no AdminDashboard** substituindo os `useState`/handlers pelo retorno do hook. Passar as mesmas props para os painéis que os consomem (`AdminOrdersPanel` etc.).

- [ ] **Step 4: Verificar**

```bash
npx tsc --noEmit && npm run test:run
```
Smoke `/admin` → **Pedidos**: abrir um pedido, editar itens, salvar. Comportamento idêntico ao anterior.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/hooks/useOrderEditing.ts src/pages/admin/AdminDashboard.tsx
git commit -m "refactor(admin): extract order editing into useOrderEditing

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Extrair o roteamento de painéis

**Files:**
- Create: `src/pages/admin/components/AdminPanelRouter.tsx`
- Modify: `src/pages/admin/AdminDashboard.tsx` (bloco de render que escolhe o painel por `activeTab`)

**Interfaces:**
- Produces: `<AdminPanelRouter activeTab={...} {...props} />` que renderiza o `Admin*Panel` correspondente. Recebe via props tudo que os painéis precisam (dados, setters, handlers).

**Recipe:**

- [ ] **Step 1: Localizar o bloco de seleção de painel** (onde `activeTab` decide qual `Admin*Panel` renderiza — provavelmente uma cadeia de `activeTab === '...' && <...Panel/>` perto do fim do JSX).

- [ ] **Step 2: Criar `AdminPanelRouter.tsx`** com uma `interface AdminPanelRouterProps` que lista **explicitamente** as props (nada de `any`), e mover o bloco condicional para lá **sem alterar** o que cada painel recebe.

- [ ] **Step 3: Substituir o bloco no AdminDashboard** por `<AdminPanelRouter activeTab={activeTab} ...todas as props... />`.

- [ ] **Step 4: Verificar**

```bash
npx tsc --noEmit && npm run test:run
```
Smoke `/admin`: **clicar em cada aba** do menu e confirmar que o painel certo aparece e funciona.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/components/AdminPanelRouter.tsx src/pages/admin/AdminDashboard.tsx
git commit -m "refactor(admin): extract activeTab->panel routing into AdminPanelRouter

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Quebrar o FilamentCalculator

**Files:**
- Create: `src/pages/public/calculator/CalculatorInputs.tsx`
- Create: `src/pages/public/calculator/CalculatorResults.tsx`
- Modify: `src/pages/public/FilamentCalculator.tsx`
- Possivelmente Modify: `src/pages/public/calculator/useCalculatorState.ts` (mover derivações puras para cá)

**Interfaces:**
- `CalculatorInputs`: recebe os campos e setters do `useCalculatorState` e renderiza o formulário.
- `CalculatorResults`: recebe o `PricingResult` (de `computePricing`) e renderiza os números. **Não** recalcula nada — só apresenta.

**Recipe:**

- [ ] **Step 1: Garantir que o cálculo vive no hook, não no JSX**

Confirmar que `FilamentCalculator.tsx` chama `computePricing(...)` (de `src/lib/pricing.ts`) e não reimplementa fórmula. Se houver derivação numérica no meio do JSX, **mover para `useCalculatorState`** expondo um `result: PricingResult`.

- [ ] **Step 2: Extrair `CalculatorResults.tsx`** — recortar o JSX que exibe os resultados (custos, preços, shares, tooltips de `HELP`) para um componente que recebe `result` + os textos de `HELP`. Puro apresentacional.

- [ ] **Step 3: Extrair `CalculatorInputs.tsx`** — recortar o JSX do formulário para um componente que recebe os campos + setters do hook.

- [ ] **Step 4: `FilamentCalculator.tsx` vira a "casca"** que chama `useCalculatorState`, computa o `result` e renderiza `<CalculatorInputs .../>` + `<CalculatorResults result={result} .../>`.

- [ ] **Step 5: Verificar**

```bash
npx tsc --noEmit && npm run test:run
```
Smoke `/calculadora`: digitar peso/tempo/quantidade, trocar material, e conferir que **os números batem exatamente** com o comportamento anterior (comparar antes/depois com os mesmos inputs).

- [ ] **Step 6: Commit**

```bash
git add src/pages/public/calculator/CalculatorInputs.tsx src/pages/public/calculator/CalculatorResults.tsx src/pages/public/FilamentCalculator.tsx src/pages/public/calculator/useCalculatorState.ts
git commit -m "refactor(calculator): split FilamentCalculator into inputs/results components

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Fechamento

- [ ] **Step 1: Medir a redução**

Run: `find src -name '*.tsx' -exec wc -l {} + | sort -rn | head -6`
Expected: `AdminDashboard.tsx` e `FilamentCalculator.tsx` bem menores que 1368/1213 (meta ~≤700).

- [ ] **Step 2: Verificação final**

```bash
npm run test:run
npx tsc --noEmit
npm run lint
npm run build
```
Expected: tudo verde e o build passa.

- [ ] **Step 3: Smoke final** de `/admin` (todas as abas) e `/calculadora` sem regressão.

---

## Self-Review

1. **Cobertura:** ambos os god-components têm plano de decomposição. ✔️
2. **Sem placeholder:** Task 1 tem código completo; Tasks 2–4 são recipes de "puro mover" com passos de localização (`grep`) e verificação concretos — apropriado para código extenso não lido integralmente aqui, sem inventar APIs. ✔️
3. **Behavior-preserving:** cada task exige smoke manual comparando com o comportamento anterior. ✔️
4. **Consistência:** hooks/props tipados explicitamente; nada de `any` introduzido (respeita Etapa 4). ✔️

## Definição de pronto

- AdminDashboard e FilamentCalculator significativamente menores, com unidades coesas extraídas.
- Zero mudança de comportamento verificada por smoke manual em `/admin` e `/calculadora`.
- Testes, typecheck, lint e build verdes.

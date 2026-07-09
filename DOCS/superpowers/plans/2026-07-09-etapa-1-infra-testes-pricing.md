# Etapa 1 — Infraestrutura de Testes + Testes do Motor de Pricing

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Goal:** Instalar Vitest e cobrir o motor de precificação puro ([src/lib/pricing.ts](../../../src/lib/pricing.ts)) com testes de unidade, criando a rede de segurança que faltava no projeto.

**Architecture:** Vitest roda em Node, reaproveitando a config do Vite. Testamos **apenas funções puras** nesta etapa (sem Firebase, sem React), porque é onde está o maior risco (matemática de dinheiro) e o menor custo de teste. Testes ficam ao lado do código (`*.test.ts`).

**Tech Stack:** Vitest 2.x, TypeScript, Vite 6 (já presente).

## Restrições globais (resumo — ver [README](README.md))

- Terminar com `npx tsc --noEmit` limpo e `npm run lint` em 0 erros.
- Não duplicar fórmulas: os testes **importam** de `src/lib/pricing.ts`, nunca recopiam a matemática.
- Commits Conventional + linha `Co-Authored-By`.

## Contexto necessário (para não perder o fio)

- Hoje **não existe nenhum teste** no repositório (`find src api -name '*.test.*'` → vazio).
- `package.json` atual tem scripts: `dev`, `build`, `start`, `clean`, `lint` (`eslint .`). **Não há** script `test`.
- O motor de pricing exporta (assinaturas reais, já verificadas):
  - `computePricing(input: PricingInputs): PricingResult`
  - `mergePricingSettings(raw: unknown): PricingSettings`
  - `machineHourBreakdown(m: MachineConfig): MachineHourBreakdown`
  - `parseTimeToHours(timeStr: string): number`
  - `formatHoursToHHMM(hours: number): string`
  - `formatBRL(value: number): string`
  - Constantes: `DEFAULT_PRICING_SETTINGS`, `DEFAULT_MACHINE`, `MATERIAL_PRESETS`.
- Comportamentos-chave a fixar em teste (lidos do código):
  - `computePricing` **satura entradas inválidas** via helper `num()` e `Math.max` (ex.: `quantity` vira `Math.max(1, floor(...))`, valores negativos viram 0).
  - Energia = `(startupHours*startupPowerWatts + steadyHours*steadyPower)/1000 * kwhCost`, onde `startupHours = min(hours, startupMinutes/60)`.
  - `wholesaleTotal`/`retailTotal` nunca ficam abaixo de `minPrice` (piso).
  - `mergePricingSettings(null)` → devolve `DEFAULT_PRICING_SETTINGS`; campos não-numéricos caem no default via `numOr`.

---

## File Structure

- Modify: `package.json` — adicionar `vitest` em devDependencies e scripts `test` / `test:run`.
- Create: `vitest.config.ts` — config raiz (ambiente node, globals).
- Create: `src/lib/pricing.test.ts` — testes de `computePricing`, `machineHourBreakdown`, saturação de inputs, piso mínimo.
- Create: `src/lib/pricing.merge.test.ts` — testes de `mergePricingSettings` (defaults, merge parcial, lixo).
- Create: `src/lib/pricing.format.test.ts` — testes de `parseTimeToHours` e `formatHoursToHHMM`.

---

## Task 1: Instalar Vitest e configurar scripts

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: script `npm test` (watch) e `npm run test:run` (uma passada, para CI) executando Vitest.

- [ ] **Step 1: Instalar Vitest como devDependency**

```bash
npm install -D vitest@^2.1.0
```

- [ ] **Step 2: Adicionar scripts de teste ao package.json**

No bloco `"scripts"` de `package.json`, adicionar as duas linhas `test`:

```jsonc
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "clean": "node -e \"fs.rmSync('dist', { recursive: true, force: true })\"",
    "lint": "eslint .",
    "test": "vitest",
    "test:run": "vitest run"
  },
```

- [ ] **Step 3: Criar `vitest.config.ts` na raiz**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Funções puras: ambiente node basta (sem jsdom nesta etapa).
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Verificar que o runner sobe (sem testes ainda)**

Run: `npm run test:run`
Expected: Vitest inicia e reporta "No test files found" (ou 0 testes). Sem erro de config.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(test): add Vitest runner and test scripts

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Testes de `parseTimeToHours` e `formatHoursToHHMM`

**Files:**
- Create: `src/lib/pricing.format.test.ts`

**Interfaces:**
- Consumes: `parseTimeToHours`, `formatHoursToHHMM` de `../lib/pricing` (nomes exatos).

- [ ] **Step 1: Escrever os testes (devem falhar por arquivo inexistente → depois passar)**

```typescript
import { describe, it, expect } from 'vitest';
import { parseTimeToHours, formatHoursToHHMM } from './pricing';

describe('parseTimeToHours', () => {
  it('interpreta "2h 30m" como 2.5', () => {
    expect(parseTimeToHours('2h 30m')).toBeCloseTo(2.5, 5);
  });
  it('interpreta "2:30" como 2.5', () => {
    expect(parseTimeToHours('2:30')).toBeCloseTo(2.5, 5);
  });
  it('interpreta decimal puro "2.5" como 2.5', () => {
    expect(parseTimeToHours('2.5')).toBeCloseTo(2.5, 5);
  });
  it('interpreta só horas "3h" como 3', () => {
    expect(parseTimeToHours('3h')).toBe(3);
  });
  it('interpreta só minutos "45m" como 0.75', () => {
    expect(parseTimeToHours('45m')).toBeCloseTo(0.75, 5);
  });
  it('devolve 0 para string vazia', () => {
    expect(parseTimeToHours('')).toBe(0);
  });
  it('devolve 0 para lixo não numérico', () => {
    expect(parseTimeToHours('abc')).toBe(0);
  });
});

describe('formatHoursToHHMM', () => {
  it('formata 3.47h como "3h 28min"', () => {
    expect(formatHoursToHHMM(3.47)).toBe('3h 28min');
  });
  it('formata hora cheia sem minutos', () => {
    expect(formatHoursToHHMM(2)).toBe('2h');
  });
  it('formata menos de 1h só em minutos', () => {
    expect(formatHoursToHHMM(0.5)).toBe('30min');
  });
  it('satura negativo para "0min"', () => {
    expect(formatHoursToHHMM(-5)).toBe('0min');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que passam**

Run: `npm run test:run -- src/lib/pricing.format.test.ts`
Expected: PASS (11 testes). Se algum falhar, o bug está no `pricing.ts` — **não** ajuste o teste sem antes confirmar o comportamento esperado com o dono.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pricing.format.test.ts
git commit -m "test(pricing): cover time parsing and formatting helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Testes de `mergePricingSettings`

**Files:**
- Create: `src/lib/pricing.merge.test.ts`

**Interfaces:**
- Consumes: `mergePricingSettings`, `DEFAULT_PRICING_SETTINGS` de `./pricing`.

- [ ] **Step 1: Escrever os testes**

```typescript
import { describe, it, expect } from 'vitest';
import { mergePricingSettings, DEFAULT_PRICING_SETTINGS } from './pricing';

describe('mergePricingSettings', () => {
  it('devolve os defaults quando o input é null', () => {
    expect(mergePricingSettings(null)).toEqual(DEFAULT_PRICING_SETTINGS);
  });

  it('devolve os defaults quando o input não é objeto', () => {
    expect(mergePricingSettings('lixo')).toEqual(DEFAULT_PRICING_SETTINGS);
    expect(mergePricingSettings(42)).toEqual(DEFAULT_PRICING_SETTINGS);
  });

  it('sobrescreve só os campos numéricos presentes', () => {
    const merged = mergePricingSettings({ retailMarkup: 3.0, minPrice: 50 });
    expect(merged.retailMarkup).toBe(3.0);
    expect(merged.minPrice).toBe(50);
    // Campos ausentes mantêm o default:
    expect(merged.wholesaleMarkup).toBe(DEFAULT_PRICING_SETTINGS.wholesaleMarkup);
    expect(merged.kwhCost).toBe(DEFAULT_PRICING_SETTINGS.kwhCost);
  });

  it('ignora valores não-numéricos e cai no default', () => {
    const merged = mergePricingSettings({ retailMarkup: 'muito', minPrice: NaN });
    expect(merged.retailMarkup).toBe(DEFAULT_PRICING_SETTINGS.retailMarkup);
    expect(merged.minPrice).toBe(DEFAULT_PRICING_SETTINGS.minPrice);
  });

  it('faz merge parcial dos presets de material', () => {
    const merged = mergePricingSettings({ materials: { pla: { spoolPrice: 130 } } });
    expect(merged.materials.pla.spoolPrice).toBe(130);
    // Demais campos do PLA mantêm o default:
    expect(merged.materials.pla.spoolWeight).toBe(DEFAULT_PRICING_SETTINGS.materials.pla.spoolWeight);
    // PETG intacto:
    expect(merged.materials.petg).toEqual(DEFAULT_PRICING_SETTINGS.materials.petg);
  });
});
```

- [ ] **Step 2: Rodar e confirmar**

Run: `npm run test:run -- src/lib/pricing.merge.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 3: Commit**

```bash
git add src/lib/pricing.merge.test.ts
git commit -m "test(pricing): cover settings merge (defaults, partial, garbage)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Testes de `computePricing` (núcleo da precificação)

**Files:**
- Create: `src/lib/pricing.test.ts`

**Interfaces:**
- Consumes: `computePricing`, `machineHourBreakdown`, `DEFAULT_MACHINE` de `./pricing`; tipo `PricingInputs`.

- [ ] **Step 1: Escrever um builder de input e os testes**

```typescript
import { describe, it, expect } from 'vitest';
import { computePricing, machineHourBreakdown, DEFAULT_MACHINE, type PricingInputs } from './pricing';

// Input base realista; cada teste sobrescreve só o que interessa.
function makeInput(overrides: Partial<PricingInputs> = {}): PricingInputs {
  return {
    material: 'pla',
    weightGrams: 100,
    hours: 4,
    quantity: 1,
    reservePct: 10,
    kwhCost: 0.97,
    startupPowerWatts: 1000,
    startupMinutes: 8,
    machine: DEFAULT_MACHINE,
    laborHours: 0,
    laborRate: 0,
    extraSupplies: 0,
    failureRatePct: 0,
    wholesaleMarkup: 1.6,
    retailMarkup: 2.5,
    minPrice: 35,
    ...overrides,
  };
}

describe('machineHourBreakdown', () => {
  it('soma depreciação + reposição no total', () => {
    const b = machineHourBreakdown(DEFAULT_MACHINE);
    expect(b.total).toBeCloseTo(b.depreciation + b.replacement, 6);
    expect(b.depreciation).toBeCloseTo(DEFAULT_MACHINE.price / DEFAULT_MACHINE.lifespanHours, 6);
  });
});

describe('computePricing — invariantes de custo', () => {
  it('custo total = soma das parcelas', () => {
    const r = computePricing(makeInput());
    const soma = r.materialCost + r.energyCost + r.machineCost + r.laborCost + r.extraSupplies + r.failureLoss;
    expect(r.totalCost).toBeCloseTo(soma, 6);
  });

  it('material embute a reserva de falha (reservePct)', () => {
    const semReserva = computePricing(makeInput({ reservePct: 0 }));
    const comReserva = computePricing(makeInput({ reservePct: 20 }));
    expect(comReserva.materialCost).toBeCloseTo(semReserva.materialCost * 1.2, 6);
  });

  it('as shares somam ~100%', () => {
    const r = computePricing(makeInput({ laborHours: 1, laborRate: 20, failureRatePct: 5 }));
    const soma = r.shares.material + r.shares.energy + r.shares.machine + r.shares.labor + r.shares.failure;
    expect(soma).toBeCloseTo(100, 3);
  });

  it('unitCost = totalCost / quantity', () => {
    const r = computePricing(makeInput({ quantity: 4 }));
    expect(r.unitCost).toBeCloseTo(r.totalCost / 4, 6);
  });
});

describe('computePricing — preços e piso mínimo', () => {
  it('atacado e varejo saem do custo × markup quando acima do piso', () => {
    const r = computePricing(makeInput());
    expect(r.wholesaleTotal).toBeCloseTo(r.totalCost * 1.6, 6);
    expect(r.retailTotal).toBeCloseTo(r.totalCost * 2.5, 6);
  });

  it('aplica o piso mínimo quando o markup fica abaixo', () => {
    // Job minúsculo: custo × markup < minPrice alto → prevalece o piso.
    const r = computePricing(makeInput({ weightGrams: 1, hours: 0.05, minPrice: 100 }));
    expect(r.retailTotal).toBe(100);
    expect(r.isBelowMinRetail).toBe(true);
  });

  it('lucro = preço de venda - custo', () => {
    const r = computePricing(makeInput());
    expect(r.profitRetail).toBeCloseTo(r.retailTotal - r.totalCost, 6);
    expect(r.profitWholesale).toBeCloseTo(r.wholesaleTotal - r.totalCost, 6);
  });
});

describe('computePricing — saturação de entradas inválidas', () => {
  it('quantidade < 1 vira 1', () => {
    const r = computePricing(makeInput({ quantity: 0 }));
    expect(r.quantity).toBe(1);
  });

  it('quantidade fracionária é truncada (floor)', () => {
    const r = computePricing(makeInput({ quantity: 3.9 }));
    expect(r.quantity).toBe(3);
  });

  it('valores negativos não geram custo negativo', () => {
    const r = computePricing(makeInput({ weightGrams: -50, hours: -2, laborRate: -10 }));
    expect(r.totalCost).toBeGreaterThanOrEqual(0);
    expect(r.materialCost).toBeGreaterThanOrEqual(0);
  });

  it('não divide por zero quando peso é 0 (costPerGram = 0)', () => {
    const r = computePricing(makeInput({ weightGrams: 0 }));
    expect(Number.isFinite(r.costPerGram)).toBe(true);
    expect(r.costPerGram).toBe(0);
  });
});

describe('computePricing — energia (pico + regime)', () => {
  it('startup limitado ao total de horas quando a impressão é curta', () => {
    // hours (0.05h = 3min) < startupMinutes (8min): tudo é pico, nada de regime.
    const r = computePricing(makeInput({ hours: 0.05, startupMinutes: 8 }));
    const esperadoKwh = (0.05 * 1000) / 1000; // só startup, 3min a 1000W
    expect(r.energyKwh).toBeCloseTo(esperadoKwh, 5);
  });
});
```

- [ ] **Step 2: Rodar e confirmar**

Run: `npm run test:run -- src/lib/pricing.test.ts`
Expected: PASS (todos). Uma falha aqui é sinal de bug real no motor — **não** relaxe o teste; investigue com `superpowers:systematic-debugging` e alinhe com o dono.

- [ ] **Step 3: Rodar a suíte inteira + typecheck + lint**

```bash
npm run test:run
npx tsc --noEmit
npm run lint
```
Expected: suíte verde; `tsc` sem saída; lint 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pricing.test.ts
git commit -m "test(pricing): cover computePricing (invariants, floor/min, energy, guards)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (rode ao final)

1. **Cobertura:** `computePricing`, `mergePricingSettings`, `machineHourBreakdown`, `parseTimeToHours`, `formatHoursToHHMM` têm teste? ✔️ (`formatBRL` é trivial — opcional.)
2. **Sem placeholder:** todos os passos têm código real e comando com saída esperada. ✔️
3. **Nomes batem com o código:** confira que os imports (`computePricing`, `PricingInputs`, `DEFAULT_MACHINE`, `mergePricingSettings`, `DEFAULT_PRICING_SETTINGS`) existem em `src/lib/pricing.ts`. ✔️

## Definição de pronto

- `npm run test:run` verde com ≥ 4 arquivos de teste.
- `npx tsc --noEmit` e `npm run lint` limpos.
- Nenhum teste ajustado para "passar" mascarando comportamento — se um teste flagrou algo estranho, virou item para a Etapa 4/2 (não foi silenciado).

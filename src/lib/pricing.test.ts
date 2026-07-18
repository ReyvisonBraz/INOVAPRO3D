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
    const soma = r.materialCost + r.energyCost + r.machineCost + r.laborCost + r.extraSupplies + r.packagingCost + r.failureLoss;
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

  it('embalagem entra no custo mesmo sem mão de obra', () => {
    const sem = computePricing(makeInput({ packagingCost: 0 }));
    const com = computePricing(makeInput({ packagingCost: 8 }));
    expect(com.totalCost - sem.totalCost).toBeCloseTo(8, 6);
  });

  it('risco considera produção e o ponto médio da perda', () => {
    const r = computePricing(makeInput({ failureRatePct: 10, failureImpactPct: 70 }));
    expect(r.failureLoss).toBeCloseTo(r.baseProductionCost * (0.1 / 0.9) * 0.7, 6);
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
  it('piso sustentável remunera as horas ocupadas', () => {
    const r = computePricing(makeInput({
      wholesaleMarkup: 1,
      retailMarkup: 1,
      minPrice: 0,
      targetProfitPerMachineHour: 5,
    }));
    expect(r.minimumSustainablePrice).toBeCloseTo(r.totalCost + r.hours * 5, 6);
    expect(r.retailTotal).toBeCloseTo(r.minimumSustainablePrice, 6);
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

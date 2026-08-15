import { describe, expect, it } from "vitest";
import {
  buildCalcSnapshot,
  CALC_SNAPSHOT_VERSION,
  mergeCalcSnapshot,
  snapshotToPricingArgs,
  type SnapshotSource,
} from "./calculatorSnapshot";
import { computeProjectPricing, type CalculatorProject } from "./calculatorProject";
import { DEFAULT_MACHINE, DEFAULT_PRICING_SETTINGS } from "./pricing";

const project: CalculatorProject = {
  name: "Ken Kaneki 20 cm",
  outputQuantity: 3,
  plates: [
    {
      id: "corpo",
      name: "Corpo",
      type: "SINGLE_COLOR",
      totalTime: "2h49m",
      pieces: 1,
      repetitions: 2,
      filaments: [
        {
          id: "preto",
          materialId: "stock-preto",
          materialName: "PLA Preto",
          materialKey: "pla",
          totalGrams: 55.28,
          pricePerGram: 0.117,
          steadyPowerWatts: 200,
        },
      ],
    },
    {
      id: "cabelo",
      name: "Cabelo",
      type: "MULTICOLOR",
      totalTime: "36m57s",
      pieces: 2,
      repetitions: 1,
      filaments: [
        {
          id: "branco",
          materialId: "stock-branco",
          materialName: "PLA Branco",
          materialKey: "pla",
          totalGrams: 5.73,
          pricePerGram: 0.12,
          steadyPowerWatts: 200,
        },
        {
          id: "petg",
          materialName: "PETG manual",
          materialKey: "petg",
          totalGrams: 3.1,
          pricePerGram: 0.137,
          steadyPowerWatts: 230,
          manual: { color: "Azul", brand: "Voolt3D", type: "PETG", pricePerKg: 137 },
        },
      ],
    },
  ],
};

const source: SnapshotSource = {
  mode: "FULL",
  project,
  printerId: "printer-1",
  printerName: "Bambu Lab P2S + AMS",
  machine: { ...DEFAULT_MACHINE, nozzlePrice: 310 },
  machineOverrides: { nozzlePrice: 310 },
  energy: { kwhCost: 0.97, startupPowerWatts: 1000, startupMinutes: 8 },
  failure: { failureRatePct: 5, failureImpactPct: 70 },
  labor: {
    requiresLabor: true,
    laborHours: 1.5,
    laborRate: 30,
    extraSupplies: 12,
    packagingCost: 6,
  },
  commercial: {
    wholesaleMarkup: 1.6,
    retailMarkup: 2.5,
    minPrice: 35,
    targetProfitPerMachineHour: 5,
    markupMode: "mult",
    priceTier: "RETAIL",
  },
  material: {
    key: "pla",
    spoolPrice: 117,
    spoolWeight: 1000,
    reservePct: 8,
    fallbackSteadyPowerWatts: 200,
  },
  client: { name: "Maria Silva", phone: "91999990000", customerId: "cust-1" },
  imageUrl: "https://exemplo/produto.webp",
  showImageOnQuote: true,
  generatedAt: "2026-08-14T18:00:00.000Z",
};

/** Recalcula exatamente como a calculadora faria com este snapshot. */
const priceFrom = (snapshot: ReturnType<typeof buildCalcSnapshot>) => {
  const args = snapshotToPricingArgs(snapshot, DEFAULT_PRICING_SETTINGS);
  return computeProjectPricing(snapshot.project, args.machine, args.settings, args.options);
};

describe("ida e volta do snapshot", () => {
  it("reproduz o mesmo preço depois de passar pelo Firestore", () => {
    const original = buildCalcSnapshot(source);
    const antes = priceFrom(original);

    // Simula gravar e reler: JSON é exatamente o que o Firestore devolve.
    const relido = mergeCalcSnapshot(JSON.parse(JSON.stringify(original)));
    expect(relido).not.toBeNull();
    const depois = priceFrom(relido!);

    expect(depois.result.totalCost).toBeCloseTo(antes.result.totalCost, 10);
    expect(depois.result.unitCost).toBeCloseTo(antes.result.unitCost, 10);
    expect(depois.result.retailTotal).toBeCloseTo(antes.result.retailTotal, 10);
    expect(depois.result.wholesaleTotal).toBeCloseTo(antes.result.wholesaleTotal, 10);
    expect(depois.result.retailUnit).toBeCloseTo(antes.result.retailUnit, 10);
    expect(depois.result.materialCost).toBeCloseTo(antes.result.materialCost, 10);
    expect(depois.result.energyKwh).toBeCloseTo(antes.result.energyKwh, 10);
    expect(depois.result.machineCost).toBeCloseTo(antes.result.machineCost, 10);
    expect(depois.result.hours).toBeCloseTo(antes.result.hours, 10);
    expect(depois.totalPieces).toBe(antes.totalPieces);
  });

  it("o snapshot relido é idêntico ao gravado", () => {
    const original = buildCalcSnapshot(source);
    const relido = mergeCalcSnapshot(JSON.parse(JSON.stringify(original)));
    expect(relido).toEqual(original);
  });

  it("carrega o que o projeto sozinho não guarda", () => {
    const snapshot = buildCalcSnapshot(source);
    expect(snapshot.version).toBe(CALC_SNAPSHOT_VERSION);
    expect(snapshot.commercial.retailMarkup).toBe(2.5);
    expect(snapshot.labor.laborRate).toBe(30);
    expect(snapshot.machine.nozzlePrice).toBe(310);
    expect(snapshot.machineOverrides).toEqual({ nozzlePrice: 310 });
    expect(snapshot.printerName).toBe("Bambu Lab P2S + AMS");
    expect(snapshot.client.name).toBe("Maria Silva");
  });

  it("a personalização da máquina sobrevive à reabertura", () => {
    const relido = mergeCalcSnapshot(JSON.parse(JSON.stringify(buildCalcSnapshot(source))))!;
    // Mesmo que o cadastro da impressora mude depois, o orçamento mantém o
    // valor que foi usado para fechar o preço com o cliente.
    expect(relido.machine.nozzlePrice).toBe(310);
    expect(snapshotToPricingArgs(relido).machine.nozzlePrice).toBe(310);
  });

  it("respeita a mão de obra desmarcada", () => {
    const semLabor = buildCalcSnapshot({
      ...source,
      labor: { ...source.labor, requiresLabor: false },
    });
    expect(snapshotToPricingArgs(semLabor).options.laborHours).toBe(0);
    expect(priceFrom(semLabor).result.laborCost).toBe(0);
  });

  it("leva a margem técnica para o recálculo", () => {
    const comReserva = buildCalcSnapshot(source);
    const semReserva = buildCalcSnapshot({
      ...source,
      material: { ...source.material, reservePct: 0 },
    });
    expect(snapshotToPricingArgs(comReserva).options.reservePct).toBe(8);
    expect(priceFrom(comReserva).result.materialCost).toBeGreaterThan(
      priceFrom(semReserva).result.materialCost,
    );
  });
});

describe("mergeCalcSnapshot defensivo", () => {
  it("devolve null para o que não dá para aproveitar", () => {
    for (const raw of [null, undefined, "texto", 7, [], {}, { project: null }]) {
      expect(mergeCalcSnapshot(raw)).toBeNull();
    }
  });

  it("aceita snapshot parcial sem gerar NaN", () => {
    const relido = mergeCalcSnapshot({ project: { plates: [] } });
    expect(relido).not.toBeNull();
    const resultado = priceFrom(relido!);
    for (const valor of [
      resultado.result.totalCost,
      resultado.result.retailTotal,
      resultado.result.wholesaleTotal,
      resultado.result.energyKwh,
    ]) {
      expect(Number.isFinite(valor)).toBe(true);
    }
    expect(relido!.project.outputQuantity).toBe(1);
    expect(relido!.commercial.retailMarkup).toBe(DEFAULT_PRICING_SETTINGS.retailMarkup);
  });

  it("conserta bandejas e filamentos corrompidos", () => {
    const relido = mergeCalcSnapshot({
      project: {
        name: "Quebrado",
        outputQuantity: -4,
        plates: [
          { totalTime: "1h", repetitions: 0, pieces: 0, filaments: "não é lista" },
          { id: "ok", type: "MULTICOLOR", filaments: [{ totalGrams: "x", pricePerGram: null }] },
        ],
      },
    })!;
    expect(relido.project.outputQuantity).toBe(1);
    expect(relido.project.plates).toHaveLength(2);
    expect(relido.project.plates[0].id).toBe("plate-1");
    expect(relido.project.plates[0].repetitions).toBe(1);
    expect(relido.project.plates[0].filaments).toEqual([]);
    expect(relido.project.plates[1].type).toBe("MULTICOLOR");
    expect(relido.project.plates[1].filaments[0].totalGrams).toBe(0);
    expect(relido.project.plates[1].filaments[0].id).toBe("ok-fil-1");
  });

  it("descarta personalização de máquina inválida", () => {
    const relido = mergeCalcSnapshot({
      project: { plates: [] },
      machineOverrides: { nozzlePrice: "caro", naoExiste: 3 },
    })!;
    expect(relido.machineOverrides).toBeUndefined();
    expect(relido.machine.nozzlePrice).toBe(DEFAULT_MACHINE.nozzlePrice);
  });

  it("não emite undefined nos campos opcionais (o Firestore rejeita)", () => {
    const snapshot = buildCalcSnapshot({
      ...source,
      printerId: undefined,
      printerName: undefined,
      imageUrl: undefined,
      machineOverrides: undefined,
      client: { name: "Só o nome" },
    });
    const serializado = JSON.stringify(snapshot);
    expect(serializado).not.toContain("undefined");
    expect(Object.values(snapshot).every((value) => value !== undefined)).toBe(true);
    expect(Object.values(snapshot.client).every((value) => value !== undefined)).toBe(true);
  });

  it("normaliza modo, tabela e material desconhecidos", () => {
    const relido = mergeCalcSnapshot({
      project: { plates: [] },
      mode: "OUTRO",
      commercial: { priceTier: "OUTRO", markupMode: "OUTRO" },
      material: { key: "abs" },
    })!;
    expect(relido.mode).toBe("QUICK");
    expect(relido.commercial.priceTier).toBe("RETAIL");
    expect(relido.commercial.markupMode).toBe("mult");
    expect(relido.material.key).toBe("pla");
  });
});

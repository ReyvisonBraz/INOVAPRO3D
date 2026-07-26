import { describe, expect, it } from "vitest";
import { computeProjectPricing, validateCalculatorProject, type CalculatorProject } from "./calculatorProject";
import { DEFAULT_MACHINE, DEFAULT_PRICING_SETTINGS } from "./pricing";

const options = {
  laborHours: 0,
  laborRate: 0,
  extraSupplies: 0,
  packagingCost: 0,
  wholesaleMarkup: DEFAULT_PRICING_SETTINGS.wholesaleMarkup,
  retailMarkup: DEFAULT_PRICING_SETTINGS.retailMarkup,
  minPrice: DEFAULT_PRICING_SETTINGS.minPrice,
};

describe("computeProjectPricing", () => {
  it("soma bandejas e respeita o preço individual de cada filamento", () => {
    const project: CalculatorProject = {
      name: "Gojo",
      outputQuantity: 1,
      plates: [
        {
          id: "black",
          name: "Partes pretas",
          type: "SINGLE_COLOR",
          totalTime: "2h",
          pieces: 2,
          repetitions: 1,
          filaments: [{
            id: "black-pla",
            materialId: "stock-black",
            materialName: "PLA Preto",
            materialKey: "pla",
            totalGrams: 100,
            pricePerGram: 0.1,
            steadyPowerWatts: 200,
          }],
        },
        {
          id: "colors",
          name: "Olhos",
          type: "MULTICOLOR",
          totalTime: "1h",
          pieces: 1,
          repetitions: 1,
          filaments: [
            {
              id: "white-pla",
              materialId: "stock-white",
              materialName: "PLA Branco",
              materialKey: "pla",
              totalGrams: 10,
              pricePerGram: 0.2,
              steadyPowerWatts: 200,
            },
            {
              id: "blue-petg",
              materialId: "stock-blue",
              materialName: "PETG Azul",
              materialKey: "petg",
              totalGrams: 5,
              pricePerGram: 0.3,
              steadyPowerWatts: 230,
            },
          ],
        },
      ],
    };

    const summary = computeProjectPricing(project, DEFAULT_MACHINE, DEFAULT_PRICING_SETTINGS, options);
    expect(summary.result.materialCost).toBeCloseTo(13.5, 6);
    expect(summary.result.hours).toBe(3);
    expect(summary.result.weightGrams).toBe(115);
    expect(summary.totalPieces).toBe(1);
    expect(summary.result.quantity).toBe(1);
    expect(summary.plates).toHaveLength(2);
  });

  it("cobra um novo aquecimento para cada repetição de cada bandeja", () => {
    const project: CalculatorProject = {
      name: "Lote",
      outputQuantity: 8,
      plates: [{
        id: "plate",
        name: "Chaveiros",
        type: "SINGLE_COLOR",
        totalTime: "1h",
        pieces: 4,
        repetitions: 2,
        filaments: [{
          id: "pla",
          materialId: "stock",
          materialName: "PLA",
          materialKey: "pla",
          totalGrams: 40,
          pricePerGram: 0.1,
          steadyPowerWatts: 200,
        }],
      }],
    };
    const summary = computeProjectPricing(project, DEFAULT_MACHINE, DEFAULT_PRICING_SETTINGS, options);
    const perRun =
      ((DEFAULT_PRICING_SETTINGS.startupMinutes / 60) * DEFAULT_PRICING_SETTINGS.startupPowerWatts +
        (1 - DEFAULT_PRICING_SETTINGS.startupMinutes / 60) * 200) /
      1000;
    expect(summary.result.energyKwh).toBeCloseTo(perRun * 2, 6);
    expect(summary.result.materialCost).toBeCloseTo(8, 6);
    expect(summary.totalPieces).toBe(8);
  });

  it("mantém chaveiros multicolor da mesma bandeja como produtos finais separados", () => {
    const project: CalculatorProject = {
      name: "20 chaveiros multicolor",
      outputQuantity: 20,
      plates: [{
        id: "keychains",
        name: "Chaveiros",
        type: "MULTICOLOR",
        totalTime: "4h",
        pieces: 20,
        repetitions: 1,
        filaments: [
          {
            id: "black",
            materialId: "black-stock",
            materialName: "PLA Preto",
            materialKey: "pla",
            totalGrams: 120,
            pricePerGram: 0.12,
            steadyPowerWatts: 200,
          },
          {
            id: "white",
            materialId: "white-stock",
            materialName: "PLA Branco",
            materialKey: "pla",
            totalGrams: 30,
            pricePerGram: 0.12,
            steadyPowerWatts: 200,
          },
        ],
      }],
    };

    const summary = computeProjectPricing(project, DEFAULT_MACHINE, DEFAULT_PRICING_SETTINGS, options);
    expect(summary.totalPieces).toBe(20);
    expect(summary.result.quantity).toBe(20);
    expect(summary.result.weightGrams).toBe(150);
    expect(summary.result.materialCost).toBeCloseTo(18, 6);
    expect(summary.result.retailUnit).toBeCloseTo(summary.result.retailTotal / 20, 6);
  });

  it("soma bandejas de um boneco multiparte sem multiplicar a quantidade vendável", () => {
    const filament = (id: string, grams: number) => ({
      id,
      materialId: `${id}-stock`,
      materialName: id,
      materialKey: "pla" as const,
      totalGrams: grams,
      pricePerGram: 0.12,
      steadyPowerWatts: 200,
    });
    const project: CalculatorProject = {
      name: "Gojo multiparte",
      outputQuantity: 1,
      plates: [
        { id: "body", name: "Corpo", type: "SINGLE_COLOR", totalTime: "2h49m", pieces: 1, repetitions: 1, filaments: [filament("preto", 55.28)] },
        { id: "hair", name: "Cabelo", type: "SINGLE_COLOR", totalTime: "36m57s", pieces: 1, repetitions: 1, filaments: [filament("branco", 5.73)] },
        { id: "skin", name: "Pele", type: "SINGLE_COLOR", totalTime: "22m4s", pieces: 1, repetitions: 1, filaments: [filament("pele", 2.07)] },
      ],
    };

    const summary = computeProjectPricing(project, DEFAULT_MACHINE, DEFAULT_PRICING_SETTINGS, options);
    expect(summary.totalPieces).toBe(1);
    expect(summary.result.quantity).toBe(1);
    expect(summary.result.weightGrams).toBeCloseTo(63.08, 6);
    expect(summary.result.hours).toBeCloseTo(3 + 48 / 60 + 1 / 3600, 6);
    expect(summary.result.retailUnit).toBe(summary.result.retailTotal);
  });
});

describe("validateCalculatorProject", () => {
  it("sinaliza bandeja multicolor incompleta", () => {
    const issues = validateCalculatorProject({
      name: "",
      outputQuantity: 0,
      plates: [{
        id: "plate",
        name: "",
        type: "MULTICOLOR",
        totalTime: "",
        pieces: 0,
        repetitions: 0,
        filaments: [],
      }],
    });
    expect(issues.map((issue) => issue.path)).toContain("project.name");
    expect(issues.map((issue) => issue.path)).toContain("project.outputQuantity");
    expect(issues.map((issue) => issue.path)).toContain("plates.plate.filaments");
    expect(issues.length).toBeGreaterThanOrEqual(6);
  });
});

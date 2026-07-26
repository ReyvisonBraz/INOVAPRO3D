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
    expect(summary.totalPieces).toBe(3);
    expect(summary.plates).toHaveLength(2);
  });

  it("cobra um novo aquecimento para cada repetição de cada bandeja", () => {
    const project: CalculatorProject = {
      name: "Lote",
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
});

describe("validateCalculatorProject", () => {
  it("sinaliza bandeja multicolor incompleta", () => {
    const issues = validateCalculatorProject({
      name: "",
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
    expect(issues.map((issue) => issue.path)).toContain("plates.plate.filaments");
    expect(issues.length).toBeGreaterThanOrEqual(6);
  });
});

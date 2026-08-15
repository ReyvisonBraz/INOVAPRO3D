import { describe, expect, it } from "vitest";
import {
  buildInventoryForecast,
  manualGramsTotal,
  requiredGramsByMaterial,
} from "./inventoryForecast";
import type { CalculatorProject } from "./calculatorProject";
import type { Material } from "../types/domain";

const material = (patch: Partial<Material> & { id: string; name: string }): Material => ({
  color: "Preto",
  ...patch,
});

const project: CalculatorProject = {
  name: "Lote",
  outputQuantity: 4,
  plates: [
    {
      id: "p1",
      name: "Bandeja 1",
      type: "SINGLE_COLOR",
      totalTime: "2h",
      pieces: 2,
      repetitions: 3,
      filaments: [
        {
          id: "f1",
          materialId: "preto",
          materialName: "PLA Preto",
          materialKey: "pla",
          totalGrams: 100,
          pricePerGram: 0.117,
          steadyPowerWatts: 200,
        },
      ],
    },
    {
      id: "p2",
      name: "Bandeja 2",
      type: "MULTICOLOR",
      totalTime: "1h",
      pieces: 1,
      repetitions: 1,
      filaments: [
        {
          id: "f2",
          materialId: "preto",
          materialName: "PLA Preto",
          materialKey: "pla",
          totalGrams: 50,
          pricePerGram: 0.117,
          steadyPowerWatts: 200,
        },
        {
          id: "f3",
          materialName: "PETG manual",
          materialKey: "petg",
          totalGrams: 20,
          pricePerGram: 0.137,
          steadyPowerWatts: 230,
          manual: { color: "Azul", brand: "Voolt3D", type: "PETG", pricePerKg: 137 },
        },
      ],
    },
  ],
};

describe("requiredGramsByMaterial", () => {
  it("soma o mesmo material entre bandejas e aplica as repetições", () => {
    const required = requiredGramsByMaterial(project);
    expect(required.get("preto")).toBe(350); // 100 × 3 + 50
    expect(required.size).toBe(1);
  });

  it("ignora filamento manual", () => {
    expect(requiredGramsByMaterial(project).has("f3")).toBe(false);
    expect(manualGramsTotal(project)).toBe(20);
  });

  it("trata repetição inválida como 1", () => {
    const required = requiredGramsByMaterial({
      name: "",
      outputQuantity: 1,
      plates: [
        {
          ...project.plates[0],
          repetitions: 0,
        },
      ],
    });
    expect(required.get("preto")).toBe(100);
  });
});

describe("buildInventoryForecast", () => {
  it("desconta o que já está reservado por outros pedidos", () => {
    const forecast = buildInventoryForecast(project, [
      material({ id: "preto", name: "PLA Preto", stockGrams: 1000, reservedGrams: 800 }),
    ]);
    const linha = forecast.rows[0];
    expect(linha.physical).toBe(1000);
    expect(linha.reserved).toBe(800);
    expect(linha.available).toBe(200);
    expect(linha.required).toBe(350);
    expect(linha.shortfall).toBe(150);
    expect(forecast.hasShortage).toBe(true);
  });

  it("não acusa falta quando o saldo cobre", () => {
    const forecast = buildInventoryForecast(project, [
      material({ id: "preto", name: "PLA Preto", stockGrams: 1000, reservedGrams: 0 }),
    ]);
    expect(forecast.rows[0].shortfall).toBe(0);
    expect(forecast.shortages).toEqual([]);
    expect(forecast.hasShortage).toBe(false);
  });

  it("converte a falta em rolos pelo peso nominal", () => {
    const forecast = buildInventoryForecast(project, [
      material({
        id: "preto",
        name: "PLA Preto",
        stockGrams: 0,
        nominalWeightGrams: 1000,
      }),
    ]);
    expect(forecast.rows[0].spoolsMissing).toBeCloseTo(0.35, 6);
  });

  it("usa 1 kg quando o material não informa o peso nominal", () => {
    const forecast = buildInventoryForecast(project, [
      material({ id: "preto", name: "PLA Preto", stockGrams: 0 }),
    ]);
    expect(forecast.rows[0].spoolsMissing).toBeCloseTo(0.35, 6);
  });

  it("separa o material que sumiu do cadastro em vez de dar falta falsa", () => {
    const forecast = buildInventoryForecast(project, []);
    expect(forecast.rows).toEqual([]);
    expect(forecast.hasShortage).toBe(false);
    expect(forecast.unknownGrams).toBe(350);
  });

  it("soma manual e rastreado no total", () => {
    const forecast = buildInventoryForecast(project, [
      material({ id: "preto", name: "PLA Preto", stockGrams: 5000 }),
    ]);
    expect(forecast.totalGrams).toBe(370);
    expect(forecast.manualGrams).toBe(20);
  });

  it("saldo negativo no cadastro não vira crédito", () => {
    const forecast = buildInventoryForecast(project, [
      material({ id: "preto", name: "PLA Preto", stockGrams: 100, reservedGrams: 500 }),
    ]);
    expect(forecast.rows[0].available).toBe(0);
    expect(forecast.rows[0].shortfall).toBe(350);
  });

  it("ordena a maior falta primeiro", () => {
    const dois: CalculatorProject = {
      ...project,
      plates: [
        {
          ...project.plates[0],
          repetitions: 1,
          filaments: [
            { ...project.plates[0].filaments[0], totalGrams: 40 },
            {
              id: "f9",
              materialId: "branco",
              materialName: "PLA Branco",
              materialKey: "pla",
              totalGrams: 900,
              pricePerGram: 0.12,
              steadyPowerWatts: 200,
            },
          ],
        },
      ],
    };
    const forecast = buildInventoryForecast(dois, [
      material({ id: "preto", name: "PLA Preto", stockGrams: 10 }),
      material({ id: "branco", name: "PLA Branco", stockGrams: 10 }),
    ]);
    expect(forecast.shortages.map((row) => row.materialId)).toEqual(["branco", "preto"]);
  });
});

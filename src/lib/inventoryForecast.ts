// ============================================================================
// PREVISÃO DE CONSUMO DE FILAMENTO
// ----------------------------------------------------------------------------
// Compara o que o projeto vai consumir com o saldo livre do estoque
// (físico − reservado). Usada pelo editor de bandejas, para avisar na hora, e
// pelo painel de previsibilidade da calculadora.
//
// Filamento manual não movimenta estoque: entra apenas como total informativo.
// ============================================================================

import type { CalculatorProject } from "./calculatorProject";
import type { Material } from "../types/domain";

export interface MaterialForecastRow {
  materialId: string;
  name: string;
  /** Gramas necessárias para o projeto inteiro, já com as repetições. */
  required: number;
  /** Saldo físico cadastrado. */
  physical: number;
  /** Gramas já reservadas por outros pedidos. */
  reserved: number;
  /** Saldo realmente disponível: físico − reservado, nunca negativo. */
  available: number;
  /** Quanto falta para atender este projeto. Zero quando há saldo. */
  shortfall: number;
  /** Rolos a comprar, pelo peso nominal do material (1 kg quando não informado). */
  spoolsMissing: number;
}

export interface InventoryForecast {
  rows: MaterialForecastRow[];
  /** Apenas as linhas com falta, ordenadas da maior para a menor. */
  shortages: MaterialForecastRow[];
  /** Gramas de filamento manual, que não movimentam estoque. */
  manualGrams: number;
  /** Gramas de material do estoque que sumiu do cadastro (id órfão). */
  unknownGrams: number;
  totalGrams: number;
  hasShortage: boolean;
}

const positive = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Soma as gramas por material do estoque, aplicando as repetições da bandeja.
 * Filamento sem `materialId` é manual e fica de fora.
 */
export function requiredGramsByMaterial(project: CalculatorProject): Map<string, number> {
  const required = new Map<string, number>();
  for (const plate of project.plates ?? []) {
    const repetitions = Math.max(1, Math.floor(positive(plate.repetitions)) || 1);
    for (const filament of plate.filaments ?? []) {
      if (!filament.materialId) continue;
      const grams = positive(filament.totalGrams) * repetitions;
      if (!grams) continue;
      required.set(filament.materialId, (required.get(filament.materialId) ?? 0) + grams);
    }
  }
  return required;
}

/** Gramas de filamento informado manualmente (sem vínculo com o estoque). */
export function manualGramsTotal(project: CalculatorProject): number {
  let total = 0;
  for (const plate of project.plates ?? []) {
    const repetitions = Math.max(1, Math.floor(positive(plate.repetitions)) || 1);
    for (const filament of plate.filaments ?? []) {
      if (filament.materialId) continue;
      total += positive(filament.totalGrams) * repetitions;
    }
  }
  return total;
}

export function buildInventoryForecast(
  project: CalculatorProject,
  materials: Material[],
): InventoryForecast {
  const required = requiredGramsByMaterial(project);
  const rows: MaterialForecastRow[] = [];
  let unknownGrams = 0;

  for (const [materialId, grams] of required) {
    const material = materials.find((item) => item.id === materialId);
    if (!material) {
      // O filamento foi excluído do cadastro depois do cálculo: não dá para
      // afirmar que falta nem que sobra, então reportamos separado.
      unknownGrams += grams;
      continue;
    }
    const physical = positive(material.stockGrams);
    const reserved = positive(material.reservedGrams);
    const available = Math.max(0, physical - reserved);
    const shortfall = Math.max(0, grams - available);
    const spoolWeight = positive(material.nominalWeightGrams) || 1000;
    rows.push({
      materialId,
      name: material.name || "Filamento",
      required: grams,
      physical,
      reserved,
      available,
      shortfall,
      spoolsMissing: shortfall > 0 ? shortfall / spoolWeight : 0,
    });
  }

  rows.sort((a, b) => b.shortfall - a.shortfall || a.name.localeCompare(b.name, "pt-BR"));
  const shortages = rows.filter((row) => row.shortfall > 0);
  const manualGrams = manualGramsTotal(project);
  const trackedGrams = [...required.values()].reduce((sum, grams) => sum + grams, 0);

  return {
    rows,
    shortages,
    manualGrams,
    unknownGrams,
    totalGrams: trackedGrams + manualGrams,
    hasShortage: shortages.length > 0,
  };
}

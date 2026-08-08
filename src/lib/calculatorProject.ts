import {
  computePricing,
  parseTimeToHours,
  type MachineConfig,
  type MaterialKey,
  type PricingResult,
  type PricingSettings,
} from "./pricing";

export type CalculatorPlateType = "SINGLE_COLOR" | "MULTICOLOR";

export interface ManualFilament {
  color: string;
  brand: string;
  type: "PLA" | "PLA_HIGH_SPEED" | "PLA_SILK" | "PETG";
  pricePerKg: number;
}

export interface CalculatorFilament {
  id: string;
  materialId?: string;
  materialName: string;
  materialKey: MaterialKey;
  totalGrams: number;
  pricePerGram: number;
  steadyPowerWatts: number;
  manual?: ManualFilament;
}

export interface CalculatorPlate {
  id: string;
  name: string;
  type: CalculatorPlateType;
  totalTime: string;
  pieces: number;
  repetitions: number;
  filaments: CalculatorFilament[];
}

export interface CalculatorProject {
  name: string;
  /** Quantidade de produtos completos vendáveis gerados pelo projeto inteiro. */
  outputQuantity: number;
  plates: CalculatorPlate[];
}

export interface ProjectPricingOptions {
  laborHours: number;
  laborRate: number;
  extraSupplies: number;
  packagingCost: number;
  wholesaleMarkup: number;
  retailMarkup: number;
  minPrice: number;
}

export interface PlatePricingSummary {
  plateId: string;
  hours: number;
  weightGrams: number;
  materialCost: number;
  energyKwh: number;
  energyCost: number;
}

export interface ProjectPricingSummary {
  result: PricingResult;
  plates: PlatePricingSummary[];
  totalPieces: number;
}

export function createEmptyPlate(index = 1): CalculatorPlate {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `plate-${Date.now()}-${index}`,
    name: `Bandeja ${index}`,
    type: "SINGLE_COLOR",
    totalTime: "",
    pieces: 1,
    repetitions: 1,
    filaments: [],
  };
}

export function computeProjectPricing(
  project: CalculatorProject,
  machine: MachineConfig,
  settings: PricingSettings,
  options: ProjectPricingOptions,
): ProjectPricingSummary {
  const plateSummaries = project.plates.map((plate) => {
    const repetitions = Math.max(1, Math.floor(Number(plate.repetitions) || 1));
    const hoursPerRun = Math.max(0, parseTimeToHours(plate.totalTime));
    const hours = hoursPerRun * repetitions;
    const weightGrams =
      plate.filaments.reduce(
        (sum, filament) => sum + Math.max(0, Number(filament.totalGrams) || 0),
        0,
      ) * repetitions;
    const materialCost =
      plate.filaments.reduce(
        (sum, filament) =>
          sum +
          Math.max(0, Number(filament.totalGrams) || 0) *
            Math.max(0, Number(filament.pricePerGram) || 0),
        0,
      ) * repetitions;

    const startupHoursPerRun = Math.min(hoursPerRun, Math.max(0, settings.startupMinutes) / 60);
    const steadyHoursPerRun = Math.max(0, hoursPerRun - startupHoursPerRun);
    const totalFilamentGrams = plate.filaments.reduce(
      (sum, filament) => sum + Math.max(0, Number(filament.totalGrams) || 0),
      0,
    );
    const weightedPower =
      totalFilamentGrams > 0
        ? plate.filaments.reduce(
            (sum, filament) =>
              sum +
              Math.max(0, Number(filament.totalGrams) || 0) *
                Math.max(0, Number(filament.steadyPowerWatts) || 0),
            0,
          ) / totalFilamentGrams
        : settings.materials.pla.steadyPowerWatts;
    const energyKwh =
      ((startupHoursPerRun * Math.max(0, settings.startupPowerWatts) +
        steadyHoursPerRun * weightedPower) /
        1000) *
      repetitions;

    return {
      plateId: plate.id,
      hours,
      weightGrams,
      materialCost,
      energyKwh,
      energyCost: energyKwh * Math.max(0, settings.kwhCost),
    };
  });

  const totals = plateSummaries.reduce(
    (sum, plate) => ({
      hours: sum.hours + plate.hours,
      weightGrams: sum.weightGrams + plate.weightGrams,
      materialCost: sum.materialCost + plate.materialCost,
      energyKwh: sum.energyKwh + plate.energyKwh,
      energyCost: sum.energyCost + plate.energyCost,
    }),
    { hours: 0, weightGrams: 0, materialCost: 0, energyKwh: 0, energyCost: 0 },
  );
  // Uma peça vendável pode ser composta por várias bandejas (ex.: um boneco
  // dividido em corpo, cabelo e mãos). Por isso, quantidade comercial não pode
  // ser inferida somando os itens físicos de cada bandeja.
  const totalPieces = Math.max(1, Math.floor(Number(project.outputQuantity) || 1));

  const result = computePricing({
    material: "pla",
    spoolPrice: 0,
    spoolWeight: 1000,
    steadyPowerWatts: 0,
    weightGrams: totals.weightGrams,
    hours: totals.hours,
    quantity: Math.max(1, totalPieces),
    reservePct: 0,
    failureRatePct: settings.failureRatePct,
    failureImpactPct: settings.failureImpactPct,
    kwhCost: settings.kwhCost,
    startupPowerWatts: 0,
    startupMinutes: 0,
    machine,
    laborHours: options.laborHours,
    laborRate: options.laborRate,
    extraSupplies: options.extraSupplies,
    packagingCost: options.packagingCost,
    targetProfitPerMachineHour: settings.targetProfitPerMachineHour,
    wholesaleMarkup: options.wholesaleMarkup,
    retailMarkup: options.retailMarkup,
    minPrice: options.minPrice,
    materialCostOverride: totals.materialCost,
    energyKwhOverride: totals.energyKwh,
    energyCostOverride: totals.energyCost,
  });

  return { result, plates: plateSummaries, totalPieces };
}

export interface ProjectValidationIssue {
  path: string;
  message: string;
}

export function validateCalculatorProject(project: CalculatorProject): ProjectValidationIssue[] {
  const issues: ProjectValidationIssue[] = [];
  if (!project.name.trim())
    issues.push({ path: "project.name", message: "Informe o nome do projeto." });
  if (project.outputQuantity < 1) {
    issues.push({ path: "project.outputQuantity", message: "Informe ao menos um produto final." });
  }
  if (!project.plates.length)
    issues.push({ path: "project.plates", message: "Adicione ao menos uma bandeja." });
  project.plates.forEach((plate, plateIndex) => {
    const base = `plates.${plate.id}`;
    if (!plate.name.trim())
      issues.push({
        path: `${base}.name`,
        message: `Informe o nome da bandeja ${plateIndex + 1}.`,
      });
    if (parseTimeToHours(plate.totalTime) <= 0)
      issues.push({ path: `${base}.totalTime`, message: "Informe um tempo total válido." });
    if (plate.pieces < 1)
      issues.push({ path: `${base}.pieces`, message: "Informe ao menos uma peça." });
    if (plate.repetitions < 1)
      issues.push({ path: `${base}.repetitions`, message: "Informe ao menos uma repetição." });
    const minimumFilaments = plate.type === "MULTICOLOR" ? 2 : 1;
    if (plate.filaments.length < minimumFilaments) {
      issues.push({
        path: `${base}.filaments`,
        message:
          plate.type === "MULTICOLOR"
            ? "Adicione ao menos dois filamentos."
            : "Adicione o filamento da bandeja.",
      });
    }
    plate.filaments.forEach((filament) => {
      if (filament.totalGrams <= 0) {
        issues.push({
          path: `${base}.filaments.${filament.id}`,
          message: "Informe o total em gramas.",
        });
      }
      if (!filament.materialId && (!filament.manual || filament.manual.pricePerKg <= 0)) {
        issues.push({
          path: `${base}.filaments.${filament.id}`,
          message: "Selecione o estoque ou informe o valor manual.",
        });
      }
    });
  });
  return issues;
}

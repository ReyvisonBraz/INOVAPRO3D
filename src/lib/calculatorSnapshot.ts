// ============================================================================
// SNAPSHOT DA CALCULADORA
// ----------------------------------------------------------------------------
// `calculationProject` guarda as bandejas, mas markups, mão de obra, energia e
// máquina vivem fora dele — por isso reabrir um orçamento só com o projeto
// devolveria outro preço. Este snapshot guarda TUDO o que foi realmente usado
// no cálculo, e `snapshotToPricingArgs` reconstrói os argumentos do motor.
//
// O par build → merge → snapshotToPricingArgs é coberto por um teste de ida e
// volta que compara o resultado centavo a centavo com o cálculo original.
// ============================================================================

import {
  DEFAULT_MACHINE,
  DEFAULT_PRICING_SETTINGS,
  type MachineConfig,
  type MaterialKey,
  type PricingSettings,
} from "./pricing";
import type {
  CalculatorFilament,
  CalculatorPlate,
  CalculatorPlateType,
  CalculatorProject,
  ManualFilament,
  ProjectPricingOptions,
} from "./calculatorProject";

export const CALC_SNAPSHOT_VERSION = 1;

export type CalculatorMode = "QUICK" | "FULL";
export type PriceTier = "RETAIL" | "WHOLESALE";
export type MarkupMode = "mult" | "pct";

export interface SnapshotEnergy {
  kwhCost: number;
  startupPowerWatts: number;
  startupMinutes: number;
}

export interface SnapshotFailure {
  failureRatePct: number;
  failureImpactPct: number;
}

export interface SnapshotLabor {
  requiresLabor: boolean;
  laborHours: number;
  laborRate: number;
  extraSupplies: number;
  packagingCost: number;
}

export interface SnapshotCommercial {
  wholesaleMarkup: number;
  retailMarkup: number;
  minPrice: number;
  targetProfitPerMachineHour: number;
  markupMode: MarkupMode;
  priceTier: PriceTier;
}

export interface SnapshotMaterial {
  key: MaterialKey;
  /** Referência de carretel usada para semear filamentos manuais. */
  spoolPrice: number;
  spoolWeight: number;
  /** Margem técnica aplicada sobre o custo do filamento. */
  reservePct: number;
  /** Potência usada quando a bandeja ainda não tem filamento. */
  fallbackSteadyPowerWatts: number;
}

export interface SnapshotClient {
  name: string;
  lastName?: string;
  phone?: string;
  customerId?: string;
}

export interface QuoteCalcSnapshot {
  version: number;
  mode: CalculatorMode;
  project: CalculatorProject;
  printerId?: string;
  printerName?: string;
  /** Máquina EFETIVA — já com as personalizações do orçamento aplicadas. */
  machine: MachineConfig;
  /** Apenas os campos personalizados, para poder restaurar do cadastro. */
  machineOverrides?: Partial<MachineConfig>;
  energy: SnapshotEnergy;
  failure: SnapshotFailure;
  labor: SnapshotLabor;
  commercial: SnapshotCommercial;
  material: SnapshotMaterial;
  client: SnapshotClient;
  imageUrl?: string;
  showImageOnQuote: boolean;
  /** Momento em que o cálculo foi congelado (ISO). */
  generatedAt: string;
}

/** Estado da calculadora aceito por `buildCalcSnapshot`. */
export type SnapshotSource = Omit<QuoteCalcSnapshot, "version" | "generatedAt"> & {
  generatedAt?: string;
};

// ----------------------------------------------------------------------------
// Saneamento (o documento vem do Firestore e pode estar parcial ou corrompido)
// ----------------------------------------------------------------------------

const numOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const positiveOr = (value: unknown, fallback: number): number =>
  Math.max(0, numOr(value, fallback));

const textOr = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const optionalText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const MANUAL_TYPES: ManualFilament["type"][] = ["PLA", "PLA_HIGH_SPEED", "PLA_SILK", "PETG"];

function sanitizeMachine(raw: unknown): MachineConfig {
  const r = asRecord(raw);
  return {
    price: positiveOr(r.price, DEFAULT_MACHINE.price),
    lifespanHours: Math.max(1, numOr(r.lifespanHours, DEFAULT_MACHINE.lifespanHours)),
    nozzlePrice: positiveOr(r.nozzlePrice, DEFAULT_MACHINE.nozzlePrice),
    nozzleLifeHours: Math.max(1, numOr(r.nozzleLifeHours, DEFAULT_MACHINE.nozzleLifeHours)),
    platePrice: positiveOr(r.platePrice, DEFAULT_MACHINE.platePrice),
    plateLifeHours: Math.max(1, numOr(r.plateLifeHours, DEFAULT_MACHINE.plateLifeHours)),
    beltsPrice: positiveOr(r.beltsPrice, DEFAULT_MACHINE.beltsPrice),
    beltsLifeHours: Math.max(1, numOr(r.beltsLifeHours, DEFAULT_MACHINE.beltsLifeHours)),
    maintPerHour: positiveOr(r.maintPerHour, DEFAULT_MACHINE.maintPerHour),
  };
}

function sanitizeOverrides(raw: unknown): Partial<MachineConfig> | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  const overrides: Partial<MachineConfig> = {};
  for (const key of Object.keys(DEFAULT_MACHINE) as (keyof MachineConfig)[]) {
    const value = r[key];
    if (typeof value === "number" && Number.isFinite(value)) overrides[key] = value;
  }
  return Object.keys(overrides).length ? overrides : undefined;
}

function sanitizeManual(raw: unknown): ManualFilament | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  const type = MANUAL_TYPES.find((candidate) => candidate === r.type) ?? "PLA";
  return {
    color: textOr(r.color, ""),
    brand: textOr(r.brand, ""),
    type,
    pricePerKg: positiveOr(r.pricePerKg, 0),
  };
}

function sanitizeFilament(raw: unknown, plateId: string, index: number): CalculatorFilament {
  const r = asRecord(raw);
  const manual = sanitizeManual(r.manual);
  return {
    id: optionalText(r.id) ?? `${plateId}-fil-${index + 1}`,
    materialId: optionalText(r.materialId),
    materialName: textOr(r.materialName, "Filamento"),
    materialKey: r.materialKey === "petg" ? "petg" : "pla",
    totalGrams: positiveOr(r.totalGrams, 0),
    pricePerGram: positiveOr(r.pricePerGram, 0),
    steadyPowerWatts: positiveOr(
      r.steadyPowerWatts,
      DEFAULT_PRICING_SETTINGS.materials.pla.steadyPowerWatts,
    ),
    ...(manual ? { manual } : {}),
  };
}

function sanitizePlate(raw: unknown, index: number): CalculatorPlate {
  const r = asRecord(raw);
  const id = optionalText(r.id) ?? `plate-${index + 1}`;
  const type: CalculatorPlateType = r.type === "MULTICOLOR" ? "MULTICOLOR" : "SINGLE_COLOR";
  const filaments = Array.isArray(r.filaments)
    ? r.filaments.map((filament, filamentIndex) => sanitizeFilament(filament, id, filamentIndex))
    : [];
  return {
    id,
    name: textOr(r.name, `Bandeja ${index + 1}`),
    type,
    totalTime: textOr(r.totalTime, ""),
    pieces: Math.max(1, Math.floor(numOr(r.pieces, 1))),
    repetitions: Math.max(1, Math.floor(numOr(r.repetitions, 1))),
    filaments,
  };
}

function sanitizeProject(raw: unknown): CalculatorProject {
  const r = asRecord(raw);
  const plates = Array.isArray(r.plates) ? r.plates.map(sanitizePlate) : [];
  return {
    name: textOr(r.name, ""),
    outputQuantity: Math.max(1, Math.floor(numOr(r.outputQuantity, 1))),
    plates,
  };
}

// ----------------------------------------------------------------------------
// API pública
// ----------------------------------------------------------------------------

/** Congela o estado atual da calculadora num documento gravável. */
export function buildCalcSnapshot(source: SnapshotSource): QuoteCalcSnapshot {
  const machine = sanitizeMachine(source.machine);
  const overrides = sanitizeOverrides(source.machineOverrides);
  return {
    version: CALC_SNAPSHOT_VERSION,
    mode: source.mode === "FULL" ? "FULL" : "QUICK",
    project: sanitizeProject(source.project),
    ...(optionalText(source.printerId) ? { printerId: source.printerId } : {}),
    ...(optionalText(source.printerName) ? { printerName: source.printerName } : {}),
    machine,
    ...(overrides ? { machineOverrides: overrides } : {}),
    energy: {
      kwhCost: positiveOr(source.energy?.kwhCost, DEFAULT_PRICING_SETTINGS.kwhCost),
      startupPowerWatts: positiveOr(
        source.energy?.startupPowerWatts,
        DEFAULT_PRICING_SETTINGS.startupPowerWatts,
      ),
      startupMinutes: positiveOr(
        source.energy?.startupMinutes,
        DEFAULT_PRICING_SETTINGS.startupMinutes,
      ),
    },
    failure: {
      failureRatePct: positiveOr(source.failure?.failureRatePct, 0),
      failureImpactPct: positiveOr(
        source.failure?.failureImpactPct,
        DEFAULT_PRICING_SETTINGS.failureImpactPct,
      ),
    },
    labor: {
      requiresLabor: source.labor?.requiresLabor === true,
      laborHours: positiveOr(source.labor?.laborHours, 0),
      laborRate: positiveOr(source.labor?.laborRate, 0),
      extraSupplies: positiveOr(source.labor?.extraSupplies, 0),
      packagingCost: positiveOr(source.labor?.packagingCost, 0),
    },
    commercial: {
      wholesaleMarkup: positiveOr(
        source.commercial?.wholesaleMarkup,
        DEFAULT_PRICING_SETTINGS.wholesaleMarkup,
      ),
      retailMarkup: positiveOr(
        source.commercial?.retailMarkup,
        DEFAULT_PRICING_SETTINGS.retailMarkup,
      ),
      minPrice: positiveOr(source.commercial?.minPrice, DEFAULT_PRICING_SETTINGS.minPrice),
      targetProfitPerMachineHour: positiveOr(
        source.commercial?.targetProfitPerMachineHour,
        DEFAULT_PRICING_SETTINGS.targetProfitPerMachineHour,
      ),
      markupMode: source.commercial?.markupMode === "pct" ? "pct" : "mult",
      priceTier: source.commercial?.priceTier === "WHOLESALE" ? "WHOLESALE" : "RETAIL",
    },
    material: {
      key: source.material?.key === "petg" ? "petg" : "pla",
      spoolPrice: positiveOr(
        source.material?.spoolPrice,
        DEFAULT_PRICING_SETTINGS.materials.pla.spoolPrice,
      ),
      spoolWeight: Math.max(
        1,
        numOr(source.material?.spoolWeight, DEFAULT_PRICING_SETTINGS.materials.pla.spoolWeight),
      ),
      reservePct: positiveOr(source.material?.reservePct, 0),
      fallbackSteadyPowerWatts: positiveOr(
        source.material?.fallbackSteadyPowerWatts,
        DEFAULT_PRICING_SETTINGS.materials.pla.steadyPowerWatts,
      ),
    },
    client: {
      name: textOr(source.client?.name, "").trim(),
      ...(optionalText(source.client?.lastName) ? { lastName: source.client?.lastName } : {}),
      ...(optionalText(source.client?.phone) ? { phone: source.client?.phone } : {}),
      ...(optionalText(source.client?.customerId) ? { customerId: source.client?.customerId } : {}),
    },
    ...(optionalText(source.imageUrl) ? { imageUrl: source.imageUrl } : {}),
    showImageOnQuote: source.showImageOnQuote !== false,
    generatedAt: optionalText(source.generatedAt) ?? new Date().toISOString(),
  };
}

/**
 * Lê o snapshot gravado no orçamento. Devolve `null` quando não há nada
 * aproveitável — aí a calculadora cai no modo degradado, usando apenas
 * `calculationProject` e os parâmetros atuais, com aviso na tela.
 */
export function mergeCalcSnapshot(raw: unknown): QuoteCalcSnapshot | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.project !== "object" || r.project === null) return null;

  return buildCalcSnapshot({
    mode: r.mode === "FULL" ? "FULL" : "QUICK",
    project: sanitizeProject(r.project),
    printerId: optionalText(r.printerId),
    printerName: optionalText(r.printerName),
    machine: sanitizeMachine(r.machine),
    machineOverrides: sanitizeOverrides(r.machineOverrides),
    energy: asRecord(r.energy) as unknown as SnapshotEnergy,
    failure: asRecord(r.failure) as unknown as SnapshotFailure,
    labor: asRecord(r.labor) as unknown as SnapshotLabor,
    commercial: asRecord(r.commercial) as unknown as SnapshotCommercial,
    material: asRecord(r.material) as unknown as SnapshotMaterial,
    client: asRecord(r.client) as unknown as SnapshotClient,
    imageUrl: optionalText(r.imageUrl),
    showImageOnQuote: r.showImageOnQuote !== false,
    generatedAt: optionalText(r.generatedAt),
  });
}

export interface SnapshotPricingArgs {
  machine: MachineConfig;
  settings: PricingSettings;
  options: ProjectPricingOptions;
}

/**
 * Reconstrói os três argumentos de `computeProjectPricing` a partir do
 * snapshot. `base` entra só para os campos de negócio que o snapshot não
 * precisa carregar (presets de material, desconto PIX, parcelas).
 */
export function snapshotToPricingArgs(
  snapshot: QuoteCalcSnapshot,
  base: PricingSettings = DEFAULT_PRICING_SETTINGS,
): SnapshotPricingArgs {
  return {
    machine: snapshot.machine,
    settings: {
      ...base,
      kwhCost: snapshot.energy.kwhCost,
      startupPowerWatts: snapshot.energy.startupPowerWatts,
      startupMinutes: snapshot.energy.startupMinutes,
      failureRatePct: snapshot.failure.failureRatePct,
      failureImpactPct: snapshot.failure.failureImpactPct,
      targetProfitPerMachineHour: snapshot.commercial.targetProfitPerMachineHour,
    },
    options: {
      laborHours: snapshot.labor.requiresLabor ? snapshot.labor.laborHours : 0,
      laborRate: snapshot.labor.laborRate,
      extraSupplies: snapshot.labor.extraSupplies,
      packagingCost: snapshot.labor.packagingCost,
      wholesaleMarkup: snapshot.commercial.wholesaleMarkup,
      retailMarkup: snapshot.commercial.retailMarkup,
      minPrice: snapshot.commercial.minPrice,
      reservePct: snapshot.material.reservePct,
      fallbackSteadyPowerWatts: snapshot.material.fallbackSteadyPowerWatts,
    },
  };
}

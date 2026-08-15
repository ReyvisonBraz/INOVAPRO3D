// ============================================================================
// CADASTRO DE IMPRESSORAS
// ----------------------------------------------------------------------------
// Uma impressora é um `MachineConfig` com identidade (nome, foto, padrões de
// energia). O motor de preços continua recebendo apenas os 9 campos de custo
// que já recebia do documento `settings/machine`, então `lib/pricing.ts` não é
// bifurcado e os testes existentes seguem valendo.
//
// A calculadora pode personalizar valores para um orçamento específico sem
// nunca gravar no cadastro: os ajustes vivem em um `Partial<MachineConfig>`
// separado, aplicado por cima da impressora escolhida.
// ============================================================================

import { DEFAULT_MACHINE, machineHourBreakdown, type MachineConfig } from "./pricing";
import type { Printer } from "../types/domain";

/** Nome usado ao converter o antigo `settings/machine` em impressora. */
export const DEFAULT_PRINTER_NAME = "Impressora principal";

/** As 9 chaves de custo que o motor de preços conhece. */
export const MACHINE_CONFIG_KEYS = [
  "price",
  "lifespanHours",
  "nozzlePrice",
  "nozzleLifeHours",
  "platePrice",
  "plateLifeHours",
  "beltsPrice",
  "beltsLifeHours",
  "maintPerHour",
] as const satisfies readonly (keyof MachineConfig)[];

export interface PrinterCostField {
  key: keyof MachineConfig;
  label: string;
  /** Rótulo curto para telas estreitas e para o painel de personalização. */
  shortLabel: string;
  min: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  help: string;
}

/**
 * Metadados dos campos de custo. Fonte única de rótulos e textos de ajuda,
 * consumida pelo formulário do painel E pela personalização por orçamento.
 */
export const PRINTER_COST_FIELDS: PrinterCostField[] = [
  {
    key: "price",
    label: "Preço da máquina",
    shortLabel: "Máquina",
    min: 0,
    step: 100,
    prefix: "R$",
    help: "Valor investido nesta impressora e nos acessórios incluídos no cálculo. A depreciação por hora é este preço dividido pela vida útil.",
  },
  {
    key: "lifespanHours",
    label: "Vida útil",
    shortLabel: "Vida útil",
    min: 1,
    step: 100,
    suffix: "h",
    help: "Total estimado de horas produtivas antes de uma grande reforma ou troca. Quanto menor, maior a depreciação por hora.",
  },
  {
    key: "nozzlePrice",
    label: "Preço do bico",
    shortLabel: "Bico",
    min: 0,
    step: 10,
    prefix: "R$",
    help: "Custo de reposição do bico (hotend) desta impressora.",
  },
  {
    key: "nozzleLifeHours",
    label: "Vida do bico",
    shortLabel: "Vida bico",
    min: 1,
    step: 50,
    suffix: "h",
    help: "Horas de impressão até o bico perder precisão e precisar de troca.",
  },
  {
    key: "platePrice",
    label: "Preço da placa",
    shortLabel: "Placa",
    min: 0,
    step: 10,
    prefix: "R$",
    help: "Custo de reposição da placa de impressão / PEI.",
  },
  {
    key: "plateLifeHours",
    label: "Vida da placa",
    shortLabel: "Vida placa",
    min: 1,
    step: 50,
    suffix: "h",
    help: "Horas de impressão até a placa perder aderência.",
  },
  {
    key: "beltsPrice",
    label: "Preço das correias",
    shortLabel: "Correias",
    min: 0,
    step: 10,
    prefix: "R$",
    help: "Custo do par de correias desta impressora.",
  },
  {
    key: "beltsLifeHours",
    label: "Vida das correias",
    shortLabel: "Vida correias",
    min: 1,
    step: 50,
    suffix: "h",
    help: "Horas de impressão até as correias esticarem e exigirem troca.",
  },
  {
    key: "maintPerHour",
    label: "Manutenção por hora",
    shortLabel: "Manutenção",
    min: 0,
    step: 0.01,
    prefix: "R$",
    suffix: "/h",
    help: "Fundo por hora para graxa, tubo PTFE, limpeza e pequenos imprevistos desta máquina.",
  },
];

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const optionalFinite = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const trimmedOr = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const optionalTrimmed = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

/** Projeta a impressora nos 9 campos que o motor de preços conhece. */
export function machineConfigFromPrinter(printer: MachineConfig): MachineConfig {
  return {
    price: printer.price,
    lifespanHours: printer.lifespanHours,
    nozzlePrice: printer.nozzlePrice,
    nozzleLifeHours: printer.nozzleLifeHours,
    platePrice: printer.platePrice,
    plateLifeHours: printer.plateLifeHours,
    beltsPrice: printer.beltsPrice,
    beltsLifeHours: printer.beltsLifeHours,
    maintPerHour: printer.maintPerHour,
  };
}

/**
 * Converte o antigo singleton `settings/machine` em uma impressora cadastrável.
 * Usado uma única vez, na semeadura, quando a coleção `printers` está vazia.
 */
export function printerFromMachineConfig(
  machine: MachineConfig,
  name: string = DEFAULT_PRINTER_NAME,
): Omit<Printer, "id"> {
  return {
    ...machineConfigFromPrinter(machine),
    name: trimmedOr(name, DEFAULT_PRINTER_NAME),
    isDefault: true,
    active: true,
    order: 0,
  };
}

/**
 * Combina um documento bruto do Firestore com `DEFAULT_MACHINE`, garantindo
 * uma impressora sempre válida. Mesmo espírito de `mergePricingSettings`:
 * aceita parcial ou corrompido e nunca devolve `NaN`.
 */
export function mergePrinter(raw: unknown, id: string): Printer {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    id,
    name: trimmedOr(r.name, DEFAULT_PRINTER_NAME),
    model: optionalTrimmed(r.model),
    photoUrl: optionalTrimmed(r.photoUrl),
    price: finiteOr(r.price, DEFAULT_MACHINE.price),
    lifespanHours: Math.max(1, finiteOr(r.lifespanHours, DEFAULT_MACHINE.lifespanHours)),
    nozzlePrice: finiteOr(r.nozzlePrice, DEFAULT_MACHINE.nozzlePrice),
    nozzleLifeHours: Math.max(1, finiteOr(r.nozzleLifeHours, DEFAULT_MACHINE.nozzleLifeHours)),
    platePrice: finiteOr(r.platePrice, DEFAULT_MACHINE.platePrice),
    plateLifeHours: Math.max(1, finiteOr(r.plateLifeHours, DEFAULT_MACHINE.plateLifeHours)),
    beltsPrice: finiteOr(r.beltsPrice, DEFAULT_MACHINE.beltsPrice),
    beltsLifeHours: Math.max(1, finiteOr(r.beltsLifeHours, DEFAULT_MACHINE.beltsLifeHours)),
    maintPerHour: Math.max(0, finiteOr(r.maintPerHour, DEFAULT_MACHINE.maintPerHour)),
    defaultSteadyPowerWatts: optionalFinite(r.defaultSteadyPowerWatts),
    startupPowerWatts: optionalFinite(r.startupPowerWatts),
    startupMinutes: optionalFinite(r.startupMinutes),
    isDefault: r.isDefault === true,
    active: r.active !== false,
    order: finiteOr(r.order, 0),
    notes: optionalTrimmed(r.notes),
    createdAt: r.createdAt as Printer["createdAt"],
    updatedAt: r.updatedAt as Printer["updatedAt"],
  };
}

/**
 * Aplica os ajustes de um orçamento sobre a impressora escolhida.
 * Não muta a base e ignora valores ausentes ou inválidos — assim um campo
 * limpo pelo usuário volta a valer o que está cadastrado.
 */
export function applyMachineOverrides(
  base: MachineConfig,
  overrides?: Partial<MachineConfig> | null,
): MachineConfig {
  const result = machineConfigFromPrinter(base);
  if (!overrides) return result;
  for (const key of MACHINE_CONFIG_KEYS) {
    const value = overrides[key];
    if (typeof value === "number" && Number.isFinite(value)) result[key] = value;
  }
  return result;
}

/**
 * Devolve apenas os campos realmente diferentes do cadastro. É isto que vai
 * para o rascunho e para o snapshot do orçamento — guardar a máquina inteira
 * impediria a impressora de "evoluir" nos campos que não foram tocados.
 */
export function diffMachineOverrides(
  base: MachineConfig,
  current: MachineConfig,
): Partial<MachineConfig> {
  const diff: Partial<MachineConfig> = {};
  for (const key of MACHINE_CONFIG_KEYS) {
    const value = current[key];
    if (typeof value === "number" && Number.isFinite(value) && value !== base[key]) {
      diff[key] = value;
    }
  }
  return diff;
}

/** Quantos campos foram personalizados neste orçamento. */
export function countMachineOverrides(overrides?: Partial<MachineConfig> | null): number {
  if (!overrides) return 0;
  return MACHINE_CONFIG_KEYS.filter((key) => {
    const value = overrides[key];
    return typeof value === "number" && Number.isFinite(value);
  }).length;
}

/** Ordena para exibição: padrão primeiro, depois `order` e nome. */
export function sortPrinters(printers: Printer[]): Printer[] {
  return [...printers].sort((a, b) => {
    if (Boolean(a.isDefault) !== Boolean(b.isDefault)) return a.isDefault ? -1 : 1;
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

/**
 * Impressora usada quando o orçamento não escolheu nenhuma: a marcada como
 * padrão, senão a primeira ativa, senão a primeira da lista.
 */
export function pickDefaultPrinter(printers: Printer[]): Printer | null {
  if (!printers.length) return null;
  const ordered = sortPrinters(printers);
  return (
    ordered.find((printer) => printer.isDefault && printer.active !== false) ??
    ordered.find((printer) => printer.active !== false) ??
    ordered[0]
  );
}

/** Custo-máquina por hora desta impressora (depreciação + reposição). */
export function printerHourlyCost(printer: MachineConfig): number {
  return machineHourBreakdown(machineConfigFromPrinter(printer)).total;
}

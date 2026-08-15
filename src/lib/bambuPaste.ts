// ============================================================================
// COLAR DO BAMBU STUDIO
// ----------------------------------------------------------------------------
// Interpreta o texto que o Bambu Studio mostra no painel de fatiamento (ou que
// o usuário copia de lá) e devolve bandejas prontas para o projeto. O texto
// real varia bastante entre versões/idiomas do slicer, então o parser é
// tolerante: qualquer coisa que não reconhecer vira um aviso, nunca um erro
// silencioso — e nenhum filamento é tratado como "de graça".
// ============================================================================

import { parseTimeToHours } from "./pricing";
import {
  createEmptyPlate,
  type CalculatorFilament,
  type CalculatorPlate,
} from "./calculatorProject";
import type { Material } from "../types/domain";

export interface ParsedSlicerFilament {
  /** Texto original da linha, usado para casar com o estoque. */
  label: string;
  grams: number;
}

export interface ParsedSlicerPlate {
  name?: string;
  timeText?: string;
  hours: number;
  filaments: ParsedSlicerFilament[];
  totalGrams: number;
}

export interface ParsedSlicerPaste {
  plates: ParsedSlicerPlate[];
  totalHours: number;
  totalGrams: number;
  warnings: string[];
}

// Só reconhece "Plate N" como cabeçalho quando a linha inteira é isso — uma
// linha de tabela colada com tabs ("Plate 1\tPLA Basic\tBlack\t12.4g") não
// pode virar um cabeçalho vazio que descarta o resto da linha.
const PLATE_HEADER = /^(?:plate|placa|bandeja)\s*#?\s*(\d+)\s*[:：]?\s*$/i;
const TIME_KEYWORD_LINE =
  /(?:total\s*time|estimated\s*time|print\s*time|tempo\s*total|tempo\s*de\s*impress[aã]o|tempo\s*estimado)\s*[:：]?\s*(.+)/i;
// Cada alternativa exige ao menos uma unidade real, para o match nunca ser
// vazio (senão o "primeiro match" de uma linha seria sempre a string vazia
// na posição 0). O `(?!m)` depois de minutos evita casar "4m" dentro de um
// diâmetro de bico como "0.4mm".
const TIME_TOKEN =
  /\d+\s*d(?:\s*\d+\s*h)?(?:\s*\d+\s*m(?!m))?(?:\s*\d+\s*s)?|\d+\s*h(?:\s*\d+\s*m(?!m))?(?:\s*\d+\s*s)?|\d+\s*m(?!m)(?:\s*\d+\s*s)?|\d+\s*s/i;
/** Linha de filamento: um rótulo qualquer terminando em "N g" ou "N,NN g". */
const FILAMENT_LINE = /^(.*?)[\s:：]*[-–—]?\s*(\d+(?:[.,]\d+)?)\s*g\b\s*$/i;
/** Peso "solto" dentro de uma linha maior (tabela colada com tabs). */
const INLINE_WEIGHT = /(\d+(?:[.,]\d+)?)\s*g\b/i;

/** Converte "24.53" (decimal en-US) ou "24,53" (decimal pt-BR) em número. */
function toNumber(text: string): number {
  const trimmed = text.trim();
  if (trimmed.includes(",")) {
    // Vírgula é o decimal; qualquer ponto antes dela é separador de milhar.
    const parsed = Number(trimmed.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Extrai o primeiro tempo reconhecível de um bloco de linhas. */
function extractTime(lines: string[]): { timeText?: string; hours: number } {
  for (const line of lines) {
    const withKeyword = line.match(TIME_KEYWORD_LINE);
    if (withKeyword) {
      const candidate = withKeyword[1].trim();
      const hours = parseTimeToHours(candidate);
      if (hours > 0) return { timeText: candidate, hours };
    }
  }
  for (const line of lines) {
    // Uma linha inteira dedicada só ao tempo, sem outra informação junto
    // (evita capturar "12g" de uma linha de filamento como se fosse tempo).
    if (/g\b/i.test(line)) continue;
    const match = line.match(TIME_TOKEN);
    if (match && match[0].trim() && /\d/.test(match[0])) {
      const hours = parseTimeToHours(match[0]);
      if (hours > 0) return { timeText: match[0].trim(), hours };
    }
  }
  return { hours: 0 };
}

/** Extrai as linhas de filamento (rótulo + gramas) de um bloco. */
function extractFilaments(lines: string[]): ParsedSlicerFilament[] {
  const filaments: ParsedSlicerFilament[] = [];
  for (const rawLine of lines) {
    const line = rawLine.replace(/\t+/g, " ").trim();
    if (!line) continue;
    if (TIME_KEYWORD_LINE.test(line)) continue;
    const direct = line.match(FILAMENT_LINE);
    if (direct) {
      const label = direct[1].trim() || "Filamento";
      const grams = toNumber(direct[2]);
      if (grams > 0) {
        filaments.push({ label, grams });
        continue;
      }
    }
    // Linha de tabela ("AMS A1\tPLA Basic\tBlack\t12.4g") — pega o peso e usa
    // o resto da linha, sem o peso, como rótulo.
    const inline = line.match(INLINE_WEIGHT);
    if (inline) {
      const grams = toNumber(inline[1]);
      const label = line
        .replace(INLINE_WEIGHT, "")
        .replace(/[\s:：\-–—]+$/, "")
        .trim();
      if (grams > 0) filaments.push({ label: label || "Filamento", grams });
    }
  }
  return filaments;
}

/** Divide o texto colado em blocos por bandeja ("Plate 1", "Placa 2", ...). */
function splitIntoPlateBlocks(text: string): { name?: string; lines: string[] }[] {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => line.length > 0 || (index > 0 && all[index - 1].length > 0));

  const blocks: { name?: string; lines: string[] }[] = [];
  let current: { name?: string; lines: string[] } | null = null;

  for (const line of lines) {
    const header = line.match(PLATE_HEADER);
    if (header) {
      current = { name: `Bandeja ${header[1]}`, lines: [] };
      blocks.push(current);
      continue;
    }
    if (!current) {
      current = { lines: [] };
      blocks.push(current);
    }
    current.lines.push(line);
  }
  return blocks.filter((block) => block.lines.some((line) => line.length > 0));
}

/**
 * Interpreta o texto colado do Bambu Studio. Nunca lança — o pior caso é
 * devolver zero bandejas com um aviso explicando o que faltou.
 */
export function parseBambuPaste(text: string): ParsedSlicerPaste {
  const warnings: string[] = [];
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return { plates: [], totalHours: 0, totalGrams: 0, warnings: ["Cole o texto do fatiamento."] };
  }

  const blocks = splitIntoPlateBlocks(trimmed);
  const plates: ParsedSlicerPlate[] = [];

  blocks.forEach((block, index) => {
    const { timeText, hours } = extractTime(block.lines);
    const filaments = extractFilaments(block.lines);
    const totalGrams = filaments.reduce((sum, filament) => sum + filament.grams, 0);

    if (!hours && !totalGrams) return; // bloco vazio (ex.: linha em branco entre placas)

    if (!hours) {
      warnings.push(
        `${block.name ?? `Bandeja ${index + 1}`}: não encontrei o tempo de impressão — confira manualmente.`,
      );
    }
    if (!filaments.length) {
      warnings.push(
        `${block.name ?? `Bandeja ${index + 1}`}: não encontrei filamento com peso em gramas.`,
      );
    }

    plates.push({
      name: block.name,
      timeText,
      hours,
      filaments,
      totalGrams,
    });
  });

  if (!plates.length) {
    warnings.push(
      "Não reconheci nenhuma bandeja neste texto. Cole o resumo do fatiamento com tempo e peso em gramas.",
    );
  }

  return {
    plates,
    totalHours: plates.reduce((sum, plate) => sum + plate.hours, 0),
    totalGrams: plates.reduce((sum, plate) => sum + plate.totalGrams, 0),
    warnings,
  };
}

export interface ApplyPasteContext {
  mode: "REPLACE" | "APPEND";
  materials: Material[];
  /** Preço de referência (R$/kg) usado quando o filamento não casa com o estoque. */
  fallbackPricePerKg: { pla: number; petg: number };
}

function materialKeyFromLabel(label: string): "pla" | "petg" {
  return /petg/i.test(label) ? "petg" : "pla";
}

/** Tenta casar o rótulo colado ("PLA Basic Black") com um material do estoque. */
function matchInventoryMaterial(label: string, materials: Material[]): Material | undefined {
  const normalized = label.toLowerCase();
  return materials.find((material) => {
    const name = (material.name || "").toLowerCase();
    const color = (material.color || "").toLowerCase();
    if (!name && !color) return false;
    return (
      (name && normalized.includes(name)) ||
      (color &&
        normalized.includes(color) &&
        normalized.includes((material.type || "").toLowerCase()))
    );
  });
}

function toCalculatorFilament(
  parsed: ParsedSlicerFilament,
  index: number,
  plateId: string,
  ctx: ApplyPasteContext,
): CalculatorFilament {
  const inventoryMatch = matchInventoryMaterial(parsed.label, ctx.materials);
  const key = materialKeyFromLabel(parsed.label);
  const id = `${plateId}-paste-${index + 1}`;

  if (inventoryMatch) {
    const pricePerGram = Math.max(0, Number(inventoryMatch.pricePerGram) || 0);
    return {
      id,
      materialId: inventoryMatch.id,
      materialName: inventoryMatch.name,
      materialKey: key,
      totalGrams: parsed.grams,
      pricePerGram: pricePerGram || (ctx.fallbackPricePerKg[key] || 0) / 1000,
      steadyPowerWatts: key === "petg" ? 230 : 200,
    };
  }

  // Sem correspondência no estoque: vira filamento manual com preço de
  // referência — nunca entra no custo como se fosse gratuito.
  const pricePerKg = ctx.fallbackPricePerKg[key] || 0;
  return {
    id,
    materialName: parsed.label || "Filamento colado",
    materialKey: key,
    totalGrams: parsed.grams,
    pricePerGram: pricePerKg / 1000,
    steadyPowerWatts: key === "petg" ? 230 : 200,
    manual: {
      color: parsed.label || "",
      brand: "",
      type: key === "petg" ? "PETG" : "PLA",
      pricePerKg,
    },
  };
}

function toCalculatorPlate(
  parsed: ParsedSlicerPlate,
  index: number,
  ctx: ApplyPasteContext,
): CalculatorPlate {
  const base = createEmptyPlate(index + 1);
  const filaments = parsed.filaments.map((filament, filamentIndex) =>
    toCalculatorFilament(filament, filamentIndex, base.id, ctx),
  );
  return {
    ...base,
    name: parsed.name || base.name,
    type: filaments.length > 1 ? "MULTICOLOR" : "SINGLE_COLOR",
    totalTime: parsed.timeText || "",
    pieces: 1,
    repetitions: 1,
    filaments,
  };
}

export interface ApplyPasteResult {
  plates: CalculatorPlate[];
  warnings: string[];
}

/**
 * Converte o resultado do parser em bandejas do projeto. Não decide sozinho
 * se substitui ou soma às existentes — quem chama informa `mode` e junta o
 * resultado ao `CalculatorProject` como preferir.
 */
export function applyPasteToProject(
  parsed: ParsedSlicerPaste,
  ctx: ApplyPasteContext,
): ApplyPasteResult {
  const warnings = [...parsed.warnings];
  const unmatched = parsed.plates
    .flatMap((plate) => plate.filaments)
    .filter((filament) => !matchInventoryMaterial(filament.label, ctx.materials));
  if (unmatched.length) {
    warnings.push(
      `${unmatched.length} ${unmatched.length === 1 ? "filamento colado não bate" : "filamentos colados não batem"} com o estoque — entraram como manual, com preço de referência. Confira antes de salvar.`,
    );
  }

  return {
    plates: parsed.plates.map((plate, index) => toCalculatorPlate(plate, index, ctx)),
    warnings,
  };
}

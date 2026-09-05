import { describe, expect, it } from "vitest";
import {
  applyPasteToProject,
  parseBambuPaste,
  slicerImageExtractionToPasteText,
} from "./bambuPaste";
import type { Material } from "../types/domain";

const material = (patch: Partial<Material> & { id: string; name: string }): Material => ({
  color: "",
  ...patch,
});

describe("parseBambuPaste", () => {
  it("interpreta uma bandeja única com filamento simples", () => {
    const text = `Plate 1\nPrint time: 2h 30m\nPLA Basic (Black): 45.20g`;
    const parsed = parseBambuPaste(text);
    expect(parsed.plates).toHaveLength(1);
    expect(parsed.plates[0].name).toBe("Bandeja 1");
    expect(parsed.plates[0].hours).toBeCloseTo(2.5, 5);
    expect(parsed.plates[0].filaments).toEqual([{ label: "PLA Basic (Black)", grams: 45.2 }]);
    expect(parsed.plates[0].totalGrams).toBeCloseTo(45.2, 5);
    expect(parsed.warnings).toEqual([]);
  });

  it("interpreta múltiplas bandejas multicolor", () => {
    const text = [
      "Plate 1",
      "Print time: 1h 20m",
      "PLA Basic (Black): 23.45g",
      "PLA Basic (White): 12.30g",
      "",
      "Plate 2",
      "Print time: 45m",
      "PETG HF (Red): 34.20g",
    ].join("\n");
    const parsed = parseBambuPaste(text);
    expect(parsed.plates).toHaveLength(2);
    expect(parsed.plates[0].filaments).toHaveLength(2);
    expect(parsed.plates[0].hours).toBeCloseTo(1 + 20 / 60, 5);
    expect(parsed.plates[1].filaments).toEqual([{ label: "PETG HF (Red)", grams: 34.2 }]);
    expect(parsed.plates[1].hours).toBeCloseTo(45 / 60, 5);
    expect(parsed.totalHours).toBeCloseTo(1 + 20 / 60 + 45 / 60, 5);
    expect(parsed.totalGrams).toBeCloseTo(23.45 + 12.3 + 34.2, 5);
  });

  it("aceita placas em português", () => {
    const text = "Placa 1\nTempo total: 3h\nFilamento: 100g";
    const parsed = parseBambuPaste(text);
    expect(parsed.plates[0].name).toBe("Bandeja 1");
    expect(parsed.plates[0].hours).toBe(3);
  });

  it("interpreta slots de AMS com múltiplos espaços", () => {
    const text = [
      "Plate 1",
      "Estimated time: 4h 12m",
      "AMS A1  PLA Basic  Black  12.4g",
      "AMS A2  PLA Basic  White  8.7g",
    ].join("\n");
    const parsed = parseBambuPaste(text);
    expect(parsed.plates[0].filaments).toHaveLength(2);
    expect(parsed.plates[0].filaments[0].grams).toBeCloseTo(12.4, 5);
    expect(parsed.plates[0].filaments[1].grams).toBeCloseTo(8.7, 5);
  });

  it("aceita decimal com vírgula (padrão pt-BR)", () => {
    const text = "Plate 1\nTempo total: 2h\nPLA Preto: 24,53g";
    const parsed = parseBambuPaste(text);
    expect(parsed.plates[0].filaments[0].grams).toBeCloseTo(24.53, 5);
  });

  it("interpreta dias no tempo: 1d 4h 12m", () => {
    const text = "Plate 1\nTotal time: 1d 4h 12m\nPLA Preto: 500g";
    const parsed = parseBambuPaste(text);
    expect(parsed.plates[0].hours).toBeCloseTo(28.2, 5);
  });

  it("interpreta segundos: 36m57s", () => {
    const text = "Plate 1\nPrint time: 36m57s\nPLA Preto: 10g";
    const parsed = parseBambuPaste(text);
    expect(parsed.plates[0].hours).toBeCloseTo(36 / 60 + 57 / 3600, 6);
  });

  it("reconhece um tempo solto sem rótulo, quando não há outra palavra-chave", () => {
    const text = "Plate 1\n2h 30m\nPLA Preto: 40g";
    const parsed = parseBambuPaste(text);
    expect(parsed.plates[0].hours).toBeCloseTo(2.5, 5);
  });

  it("não confunde diâmetro de bico (0.4mm) com minutos", () => {
    const text = "Plate 1\nNozzle: 0.4mm\nPLA Preto: 40g";
    const parsed = parseBambuPaste(text);
    // Sem tempo reconhecível, o parser avisa em vez de inventar "4 minutos".
    expect(parsed.plates[0].hours).toBe(0);
    expect(parsed.warnings.some((w) => w.includes("tempo"))).toBe(true);
  });

  it("sem marcador de bandeja, trata o texto inteiro como uma bandeja só", () => {
    const text = "Tempo total: 1h\nPLA Preto: 30g";
    const parsed = parseBambuPaste(text);
    expect(parsed.plates).toHaveLength(1);
    expect(parsed.plates[0].hours).toBe(1);
  });

  it("avisa quando não reconhece nada, mas nunca lança", () => {
    for (const garbage of ["", "   ", "isso não é um fatiamento", "1234567890"]) {
      const parsed = parseBambuPaste(garbage);
      expect(parsed.plates.length + parsed.warnings.length).toBeGreaterThan(0);
      expect(Number.isFinite(parsed.totalHours)).toBe(true);
      expect(Number.isFinite(parsed.totalGrams)).toBe(true);
    }
  });

  it("avisa quando falta peso ou tempo, mas ainda aproveita o que reconheceu", () => {
    const semPeso = parseBambuPaste("Plate 1\nPrint time: 2h");
    expect(semPeso.plates).toHaveLength(1);
    expect(semPeso.warnings.some((w) => w.includes("filamento"))).toBe(true);

    const semTempo = parseBambuPaste("Plate 1\nPLA Preto: 40g");
    expect(semTempo.plates).toHaveLength(1);
    expect(semTempo.warnings.some((w) => w.includes("tempo"))).toBe(true);
  });
});

describe("applyPasteToProject", () => {
  const materials: Material[] = [
    material({ id: "preto", name: "PLA Preto", color: "Preto", type: "PLA" }),
  ];
  const ctx = {
    mode: "REPLACE" as const,
    materials,
    fallbackPricePerKg: { pla: 117, petg: 137 },
  };

  it("casa filamento colado com o estoque pelo nome", () => {
    const parsed = parseBambuPaste("Plate 1\nPrint time: 2h\nPLA Preto: 40g");
    const applied = applyPasteToProject(parsed, ctx);
    expect(applied.plates[0].filaments[0].materialId).toBe("preto");
    expect(applied.warnings.some((w) => w.includes("não bate"))).toBe(false);
  });

  it("filamento sem correspondência vira manual com preço de referência, nunca de graça", () => {
    const parsed = parseBambuPaste("Plate 1\nPrint time: 2h\nPETG Amarelo Fluor: 40g");
    const applied = applyPasteToProject(parsed, ctx);
    const filament = applied.plates[0].filaments[0];
    expect(filament.materialId).toBeUndefined();
    expect(filament.manual).toBeDefined();
    expect(filament.manual?.pricePerKg).toBe(137);
    expect(filament.pricePerGram).toBeGreaterThan(0);
    expect(applied.warnings.some((w) => w.includes("não bate"))).toBe(true);
  });

  it("marca a bandeja como multicolor quando há 2+ filamentos", () => {
    const parsed = parseBambuPaste("Plate 1\nPrint time: 2h\nPLA Preto: 20g\nPLA Branco: 10g");
    const applied = applyPasteToProject(parsed, ctx);
    expect(applied.plates[0].type).toBe("MULTICOLOR");
  });

  it("marca a bandeja como cor única com 1 filamento só", () => {
    const parsed = parseBambuPaste("Plate 1\nPrint time: 2h\nPLA Preto: 20g");
    const applied = applyPasteToProject(parsed, ctx);
    expect(applied.plates[0].type).toBe("SINGLE_COLOR");
  });

  it("cada filamento tem id único mesmo entre bandejas", () => {
    const parsed = parseBambuPaste(
      "Plate 1\nPrint time: 1h\nPLA Preto: 10g\n\nPlate 2\nPrint time: 1h\nPLA Preto: 10g",
    );
    const applied = applyPasteToProject(parsed, ctx);
    const ids = applied.plates.flatMap((plate) => plate.filaments.map((f) => f.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("slicerImageExtractionToPasteText", () => {
  it("transforma a leitura estruturada em texto revisável pelo parser existente", () => {
    const converted = slicerImageExtractionToPasteText({
      plates: [
        {
          name: "Plate 1",
          timeText: "2h 18m",
          filaments: [
            { label: "AMS A1 PLA Basic Black", grams: 42.7 },
            { label: "AMS A2 PLA Basic White", grams: 8.3 },
          ],
        },
      ],
      warnings: [],
    });
    const parsed = parseBambuPaste(converted.text);
    expect(parsed.totalHours).toBeCloseTo(2.3, 5);
    expect(parsed.totalGrams).toBe(51);
    expect(parsed.plates[0].filaments).toHaveLength(2);
  });

  it("preserva tempos por placa e consumo total mostrado pelo resumo do Bambu", () => {
    const converted = slicerImageExtractionToPasteText({
      plates: [
        { name: "Placa 1", timeText: "27m52s" },
        { name: "Placa 2", timeText: "36m54s" },
      ],
      filaments: [
        { label: "Filamento 1 Branco", grams: 10.94 },
        { label: "Filamento 2 Vermelho", grams: 7.54 },
      ],
      warnings: [],
    });
    const parsed = parseBambuPaste(converted.text);
    expect(parsed.plates).toHaveLength(2);
    expect(parsed.totalGrams).toBeCloseTo(18.48, 5);
    expect(parsed.totalHours).toBeCloseTo((27 * 60 + 52 + 36 * 60 + 54) / 3600, 5);
    expect(converted.warnings[0]).toContain("consumo total");
  });

  it("preserva o consumo quando o recorte não mostra placas nem tempo", () => {
    const converted = slicerImageExtractionToPasteText({
      plates: [],
      filaments: [
        { label: "Filamento 1", grams: 1.04 },
        { label: "Filamento 4", grams: 2.84 },
      ],
      warnings: ["A seção de tempos não está visível."],
    });
    const parsed = parseBambuPaste(converted.text);

    expect(converted.text).toContain("Filamento 1: 1.04 g");
    expect(parsed.plates).toHaveLength(1);
    expect(parsed.totalGrams).toBeCloseTo(3.88, 5);
    expect(parsed.totalHours).toBe(0);
    expect(converted.warnings[0]).toContain("preencha o tempo manualmente");
  });

  it("descarta números inválidos ou absurdos vindos do modelo", () => {
    const converted = slicerImageExtractionToPasteText({
      plates: [{ name: "Plate 1", timeText: "1h", filaments: [{ label: "PLA", grams: 999_999 }] }],
      warnings: [],
    });
    expect(converted.text).toContain("Print time: 1h");
    expect(converted.text).not.toContain("999999");
  });

  it("falha de forma legível quando a resposta não tem dados aproveitáveis", () => {
    const converted = slicerImageExtractionToPasteText({ plates: [], warnings: [] });
    expect(converted.text).toBe("");
    expect(converted.warnings[0]).toContain("Não encontrei");
  });
});

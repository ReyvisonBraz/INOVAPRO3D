import { describe, expect, it } from "vitest";
import type { CompanyProfile, Quote } from "../types/domain";
import type { CalculatorProject } from "./calculatorProject";
import { buildCalcSnapshot } from "./calculatorSnapshot";
import { DEFAULT_MACHINE, DEFAULT_PRICING_SETTINGS } from "./pricing";
import { buildQuoteDocumentData, deriveProductSpecAuto, formatQuoteNumber } from "./quoteDocument";

const issuedAt = new Date("2026-08-15T12:00:00-03:00");

const company: CompanyProfile = {
  tradeName: "INOVAPRO3D",
  document: "00111222000133",
  defaultValidityDays: 10,
  paymentTerms: "50% + 50% via PIX",
  leadTimeText: "5 dias úteis",
};

const legacyQuote = (patch: Partial<Quote> = {}): Quote => ({
  id: patch.id ?? "legacy-quote-1",
  userId: patch.userId ?? "admin-1",
  status: patch.status ?? "PENDING",
  fileName: patch.fileName ?? "Suporte personalizado",
  materialId: patch.materialId ?? "PLA",
  infill: patch.infill ?? 20,
  userName: patch.userName ?? "Maria Silva",
  quantity: patch.quantity ?? 2,
  unitPrice: patch.unitPrice ?? 50,
  total: patch.total ?? 100,
  ...patch,
});

const project = {
  name: "Dragão articulado",
  outputQuantity: 3,
  plates: [
    {
      id: "plate-1",
      name: "Corpo",
      type: "SINGLE_COLOR" as const,
      totalTime: "2h30m",
      pieces: 5,
      repetitions: 2,
      filaments: [
        {
          id: "fil-1",
          materialId: "pla-preto",
          materialName: "PLA Preto",
          materialKey: "pla" as const,
          totalGrams: 40,
          pricePerGram: 0.1,
          steadyPowerWatts: 120,
        },
      ],
    },
  ],
};

const snapshot = buildCalcSnapshot({
  mode: "FULL",
  project,
  printerId: "printer-1",
  printerName: "Bambu Lab P2S + AMS",
  machine: DEFAULT_MACHINE,
  energy: {
    kwhCost: DEFAULT_PRICING_SETTINGS.kwhCost,
    startupPowerWatts: DEFAULT_PRICING_SETTINGS.startupPowerWatts,
    startupMinutes: DEFAULT_PRICING_SETTINGS.startupMinutes,
  },
  failure: { failureRatePct: 5, failureImpactPct: 50 },
  labor: {
    requiresLabor: true,
    laborHours: 1,
    laborRate: 30,
    extraSupplies: 5,
    packagingCost: 4,
  },
  commercial: {
    wholesaleMarkup: 2,
    retailMarkup: 2.5,
    minPrice: 35,
    targetProfitPerMachineHour: 5,
    markupMode: "mult",
    priceTier: "RETAIL",
  },
  material: {
    key: "pla",
    spoolPrice: 100,
    spoolWeight: 1000,
    reservePct: 0,
    fallbackSteadyPowerWatts: 120,
  },
  client: { name: "Maria", lastName: "Silva" },
  showImageOnQuote: true,
});

describe("formatQuoteNumber", () => {
  it("preserva número explícito", () => {
    expect(formatQuoteNumber(legacyQuote({ documentNumber: "orc-2026-000123" }))).toBe(
      "ORC-2026-000123",
    );
  });

  it("gera número estável e legível a partir do id", () => {
    const quote = legacyQuote();
    const first = formatQuoteNumber(quote);
    expect(first).toMatch(/^ORC-\d{4}-\d{6}$/);
    expect(formatQuoteNumber(quote)).toBe(first);
  });
});

describe("buildQuoteDocumentData", () => {
  it("gera proposta completa para orçamento legado", () => {
    const document = buildQuoteDocumentData(legacyQuote(), company, { issuedAt });

    expect(document.customer.name).toBe("Maria Silva");
    expect(document.company.tradeName).toBe("INOVAPRO3D");
    expect(document.validUntil.toISOString().slice(0, 10)).toBe("2026-08-25");
    expect(document.items).toHaveLength(1);
    expect(document.items[0].quantity).toBe(2);
    expect(document.subtotal - document.discount + document.surcharge + document.shipping).toBe(
      document.total,
    );
    expect(document.production.degraded).toBe(true);
    expect(document.production.note).toContain("anterior");
  });

  it("respeita subtotal, desconto, acréscimo e frete", () => {
    const document = buildQuoteDocumentData(
      legacyQuote({ subtotal: 120, discount: 15, surcharge: 5, shippingRate: 10, total: 120 }),
      company,
      { issuedAt },
    );

    expect(document.subtotal - document.discount + document.surcharge + document.shipping).toBe(
      document.total,
    );
  });

  it("recalcula a ficha técnica pelo snapshot sem usar parâmetros atuais", () => {
    const quote = legacyQuote({
      id: "snapshot-quote",
      fileName: project.name,
      quantity: project.outputQuantity,
      total: snapshot.commercial.retailMarkup * 100,
      calcSnapshot: snapshot,
      printerName: snapshot.printerName,
      priceTier: "RETAIL",
    });
    const document = buildQuoteDocumentData(quote, company, { issuedAt });

    expect(document.production.degraded).toBe(false);
    expect(document.production.printerName).toBe("Bambu Lab P2S + AMS");
    expect(document.production.plates).toHaveLength(1);
    expect(document.production.plates[0]).toMatchObject({
      name: "Corpo",
      repetitions: 2,
      grams: 80,
      filaments: "PLA Preto",
    });
    expect(document.production.result?.hours).toBe(5);
    expect(document.items[0].quantity).toBe(3);
  });

  it("oculta a imagem quando o orçamento mandar", () => {
    const document = buildQuoteDocumentData(
      legacyQuote({ imageUrl: "https://example.com/produto.png", showImageOnQuote: false }),
      company,
      { issuedAt },
    );
    expect(document.imageUrl).toContain("produto.png");
    expect(document.showImage).toBe(false);
  });
});

describe("deriveProductSpecAuto", () => {
  const plateWith = (filaments: CalculatorProject["plates"][number]["filaments"]) => ({
    id: "p1",
    name: "Bandeja 1",
    type: "SINGLE_COLOR" as const,
    totalTime: "1h",
    pieces: 1,
    repetitions: 1,
    filaments,
  });

  it("lê tipo, marca e cor de filamento manual", () => {
    const derived = deriveProductSpecAuto({
      name: "Quadro",
      outputQuantity: 1,
      plates: [
        plateWith([
          {
            id: "f1",
            materialName: "Manual",
            materialKey: "pla",
            totalGrams: 100,
            pricePerGram: 0.1,
            steadyPowerWatts: 120,
            manual: { color: "Dourado", brand: "Voolt", type: "PLA_SILK", pricePerKg: 120 },
          },
        ]),
      ],
    });

    expect(derived.material).toBe("PLA Silk Voolt");
    expect(derived.colors).toBe("Dourado");
  });

  it("lê cor e marca do material do estoque", () => {
    const derived = deriveProductSpecAuto(
      {
        name: "Quadro",
        outputQuantity: 1,
        plates: [
          plateWith([
            {
              id: "f1",
              materialId: "pla-preto",
              materialName: "PLA Preto",
              materialKey: "pla",
              totalGrams: 100,
              pricePerGram: 0.1,
              steadyPowerWatts: 120,
            },
          ]),
        ],
      },
      [{ id: "pla-preto", name: "PLA Preto", type: "PLA", color: "Preto", brand: "3D Fila" }],
    );

    expect(derived.material).toBe("PLA 3D Fila");
    expect(derived.colors).toBe("Preto");
  });

  it("deduplica repetições e cai no nome do filamento sem estoque casado", () => {
    const filament = {
      id: "f1",
      materialId: "sumiu",
      materialName: "PETG Translúcido",
      materialKey: "petg" as const,
      totalGrams: 100,
      pricePerGram: 0.1,
      steadyPowerWatts: 130,
    };
    const derived = deriveProductSpecAuto({
      name: "Quadro",
      outputQuantity: 1,
      plates: [plateWith([filament, { ...filament, id: "f2" }])],
    });

    expect(derived.material).toBe("PETG Translúcido");
    expect(derived.colors).toBe("");
  });
});

describe("ficha do produto no documento", () => {
  it("formata medidas, herda material/cores das bandejas e traz o peso do cálculo", () => {
    const document = buildQuoteDocumentData(
      legacyQuote({
        id: "spec-quote",
        calcSnapshot: snapshot,
        productSpec: { width: 40, height: 30, depth: 2, unit: "cm", finish: "Verniz fosco" },
      }),
      company,
      {
        issuedAt,
        materials: [{ id: "pla-preto", name: "PLA Preto", type: "PLA", color: "Preto" }],
      },
    );

    expect(document.productSpec?.dimensions).toBe("40 × 30 × 2 cm");
    expect(document.productSpec?.material).toBe("PLA");
    expect(document.productSpec?.colors).toBe("Preto");
    expect(document.productSpec?.finish).toBe("Verniz fosco");
    expect(document.productSpec?.weight).toMatch(/ g$/);
    expect(document.showProductSpec).toBe(true);
    expect(document.highlightCustomerNotes).toBe(true);
  });

  it("omite eixos não informados e o material digitado vence o automático", () => {
    const document = buildQuoteDocumentData(
      legacyQuote({
        calcSnapshot: snapshot,
        productSpec: { width: 12.5, height: 8, unit: "mm", material: "Resina" },
      }),
      company,
      { issuedAt },
    );

    expect(document.productSpec?.dimensions).toBe("12,5 × 8 mm");
    expect(document.productSpec?.material).toBe("Resina");
  });

  it("respeita os interruptores de exibição", () => {
    const document = buildQuoteDocumentData(
      legacyQuote({
        productSpec: { width: 10, unit: "cm" },
        showProductSpecOnQuote: false,
        highlightCustomerNotes: false,
      }),
      company,
      { issuedAt },
    );

    expect(document.showProductSpec).toBe(false);
    expect(document.highlightCustomerNotes).toBe(false);
  });

  it("não monta a ficha quando não há nada a mostrar", () => {
    const document = buildQuoteDocumentData(
      legacyQuote({ weight: 0, quantity: 1, total: 100 }),
      company,
      { issuedAt },
    );

    expect(document.productSpec).toBeUndefined();
  });
});

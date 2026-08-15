import type { CompanyProfile, Material, Quote } from "../types/domain";
import { computeProjectPricing, type CalculatorProject } from "./calculatorProject";
import { mergeCalcSnapshot, snapshotToPricingArgs } from "./calculatorSnapshot";
import { computeValidUntil, DEFAULT_COMPANY_PROFILE, mergeCompanyProfile } from "./company";
import { buildInventoryForecast, type InventoryForecast } from "./inventoryForecast";
import { machineHourBreakdown, parseTimeToHours, type PricingResult } from "./pricing";

export interface QuoteDocumentItem {
  description: string;
  detail?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ProductionPlateRow {
  id: string;
  name: string;
  type: "Cor única" | "Multicolor";
  time: string;
  hours: number;
  pieces: number;
  repetitions: number;
  filaments: string;
  grams: number;
  materialCost: number;
}

export interface QuoteDocumentProduction {
  degraded: boolean;
  note?: string;
  printerName: string;
  printerPhotoUrl?: string;
  project: CalculatorProject;
  plates: ProductionPlateRow[];
  result?: PricingResult;
  energyKwh?: number;
  machineHourCost?: number;
  inventory?: InventoryForecast;
}

export interface QuoteDocumentData {
  quoteId: string;
  quoteNumber: string;
  company: CompanyProfile;
  issuedAt: Date;
  validUntil: Date;
  customer: {
    name: string;
    phone?: string;
    email?: string;
  };
  priceTier: "RETAIL" | "WHOLESALE";
  paymentTerms?: string;
  leadTimeText?: string;
  imageUrl?: string;
  showImage: boolean;
  items: QuoteDocumentItem[];
  subtotal: number;
  discount: number;
  surcharge: number;
  shipping: number;
  total: number;
  unitPrice: number;
  customerNotes?: string;
  production: QuoteDocumentProduction;
}

export interface BuildQuoteDocumentOptions {
  issuedAt?: Date;
  materials?: Material[];
  printerPhotoUrl?: string;
}

const money = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

const positiveInteger = (value: unknown, fallback = 1): number => {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const dateFromFirestore = (value: Quote["createdAt"]): Date | null => {
  if (!value) return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === "object" && "seconds" in value && Number.isFinite(value.seconds)) {
    return new Date(value.seconds * 1000);
  }
  return null;
};

const dateFromText = (value?: string): Date | null => {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
};

/** Hash curto e determinístico para IDs alfanuméricos do Firestore. */
function stableSixDigits(value: string): string {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return String(Math.abs(hash) % 1_000_000).padStart(6, "0");
}

export function formatQuoteNumber(
  quote: Pick<Quote, "id" | "documentNumber" | "createdAt">,
): string {
  if (quote.documentNumber?.trim()) return quote.documentNumber.trim().toUpperCase();
  const issuedAt = dateFromFirestore(quote.createdAt) ?? new Date();
  return `ORC-${issuedAt.getFullYear()}-${stableSixDigits(quote.id)}`;
}

function legacyProject(quote: Quote): CalculatorProject {
  return (
    quote.calculationProject ?? {
      name: quote.fileName || "Peça personalizada",
      outputQuantity: positiveInteger(quote.quantity),
      plates: [],
    }
  );
}

export function buildQuoteDocumentData(
  quote: Quote,
  companyInput: CompanyProfile = DEFAULT_COMPANY_PROFILE,
  options: BuildQuoteDocumentOptions = {},
): QuoteDocumentData {
  const company = mergeCompanyProfile(companyInput);
  const snapshot = mergeCalcSnapshot(quote.calcSnapshot);
  const project = snapshot?.project ?? legacyProject(quote);
  const issuedAt = options.issuedAt ?? dateFromFirestore(quote.createdAt) ?? new Date();
  const validUntil =
    dateFromText(quote.validUntil) ?? computeValidUntil(issuedAt, company.defaultValidityDays);

  let result: PricingResult | undefined;
  let plateRows: ProductionPlateRow[] = [];
  if (snapshot) {
    const args = snapshotToPricingArgs(snapshot);
    const pricing = computeProjectPricing(project, args.machine, args.settings, args.options);
    result = pricing.result;
    plateRows = project.plates.map((plate) => {
      const summary = pricing.plates.find((candidate) => candidate.plateId === plate.id);
      return {
        id: plate.id,
        name: plate.name,
        type: plate.type === "MULTICOLOR" ? "Multicolor" : "Cor única",
        time: plate.totalTime,
        hours: summary?.hours ?? parseTimeToHours(plate.totalTime) * plate.repetitions,
        pieces: plate.pieces,
        repetitions: plate.repetitions,
        filaments: plate.filaments.map((filament) => filament.materialName).join(" · "),
        grams: summary?.weightGrams ?? 0,
        materialCost: summary?.materialCost ?? 0,
      };
    });
  }

  const priceTier = snapshot?.commercial.priceTier ?? quote.priceTier ?? "RETAIL";
  const calculatedTotal = result
    ? priceTier === "WHOLESALE"
      ? result.wholesaleTotal
      : result.retailTotal
    : 0;
  const total = money(quote.total ?? quote.estimatedPrice ?? calculatedTotal);
  const discount = money(quote.discount);
  const surcharge = money(quote.surcharge);
  const shipping = money(quote.shippingRate);
  const explicitItemsSubtotal = quote.items?.reduce(
    (sum, item) => sum + money(item.price) * positiveInteger(item.quantity),
    0,
  );
  const subtotal = money(
    quote.subtotal ??
      (explicitItemsSubtotal && explicitItemsSubtotal > 0
        ? explicitItemsSubtotal
        : total + discount - surcharge - shipping),
  );
  const quantity = positiveInteger(project.outputQuantity ?? quote.quantity);
  const itemTotal = subtotal || total;
  const items: QuoteDocumentItem[] = quote.items?.length
    ? quote.items.map((item) => ({
        description: item.name,
        detail: item.options?.material
          ? `Impressão 3D FDM · ${String(item.options.material)}`
          : undefined,
        quantity: positiveInteger(item.quantity),
        unitPrice: money(item.price),
        total: money(item.price) * positiveInteger(item.quantity),
      }))
    : [
        {
          description: project.name || quote.fileName || "Peça personalizada",
          detail: `Impressão 3D FDM · ${quote.materialId || "material conforme ficha"}`,
          quantity,
          unitPrice: itemTotal / quantity,
          total: itemTotal,
        },
      ];

  return {
    quoteId: quote.id,
    quoteNumber: formatQuoteNumber(quote),
    company,
    issuedAt,
    validUntil,
    customer: {
      name: quote.userName?.trim() || snapshot?.client.name || "Cliente",
      ...(quote.phone || snapshot?.client.phone
        ? { phone: quote.phone || snapshot?.client.phone }
        : {}),
      ...(quote.userEmail ? { email: quote.userEmail } : {}),
    },
    priceTier,
    paymentTerms: quote.paymentTerms || company.paymentTerms,
    leadTimeText: company.leadTimeText,
    ...(quote.imageUrl || snapshot?.imageUrl
      ? { imageUrl: quote.imageUrl || snapshot?.imageUrl }
      : {}),
    showImage: (quote.showImageOnQuote ?? snapshot?.showImageOnQuote ?? true) !== false,
    items,
    subtotal,
    discount,
    surcharge,
    shipping,
    total,
    unitPrice: money(quote.unitPrice) || total / quantity,
    ...(quote.notes ? { customerNotes: quote.notes } : {}),
    production: {
      degraded: !snapshot,
      ...(!snapshot
        ? {
            note: "Orçamento anterior à ficha técnica completa. Confirme os parâmetros antes de produzir.",
          }
        : {}),
      printerName: snapshot?.printerName || quote.printerName || "Impressora não informada",
      ...(options.printerPhotoUrl ? { printerPhotoUrl: options.printerPhotoUrl } : {}),
      project,
      plates: plateRows,
      ...(result
        ? {
            result,
            energyKwh: result.energyKwh,
            machineHourCost: machineHourBreakdown(snapshot!.machine).total,
          }
        : {}),
      ...(options.materials
        ? { inventory: buildInventoryForecast(project, options.materials) }
        : {}),
    },
  };
}

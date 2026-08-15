// ============================================================================
// SALVAR ORÇAMENTO NO SISTEMA (a partir da calculadora)
// ----------------------------------------------------------------------------
// A calculadora (pública /calculadora, e embutida no painel) usa este helper
// para criar OU atualizar um orçamento na coleção `quotes`, aparecendo na aba
// "Orçamentos" do painel. A criação com dados completos exige um admin
// autenticado (ver firestore.rules → isValidQuoteCreate/isAdmin); a
// atualização usa `allow write: if isAdmin()`.
//
// `buildQuotePayload` é a única forma de montar o documento — criar e
// atualizar chamam a mesma função com `isUpdate` diferente, então o formato
// gravado nunca diverge entre os dois caminhos.
// ============================================================================

import {
  addDoc,
  collection,
  deleteField,
  doc,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type UpdateData,
} from "firebase/firestore";
import { auth, db, getStorageInstance } from "../services/firebase";
import type { MaterialUsage, QuoteStatus } from "../types/domain";
import type { CalculatorProject } from "./calculatorProject";
import type { QuoteCalcSnapshot } from "./calculatorSnapshot";

export interface SaveQuoteInput {
  /** Nome do cliente (obrigatório para identificar o orçamento). */
  clientName: string;
  /** WhatsApp/telefone do cliente (somente dígitos ou formatado). */
  phone?: string;
  /** Cadastro do CRM selecionado ou criado pela calculadora. */
  customerId?: string;
  /** Tabela comercial escolhida para esta proposta. */
  priceTier?: "RETAIL" | "WHOLESALE";
  /** Nome da peça / modelo 3D. */
  pieceName?: string;
  /** Rótulo do material (ex.: "PLA"). */
  materialLabel: string;
  /** Peso do job/lote em gramas. */
  weight: number;
  /** Tempo de impressão (texto amigável, ex.: "2h 30m"). */
  printTime: string;
  /** Quantidade de peças no lote. */
  quantity: number;
  /** Preço final sugerido ao cliente (varejo, total do lote). */
  price: number;
  /** Preço unitário de varejo. */
  unitPrice?: number;
  /** Custo real de produção (interno). */
  costTotal?: number;
  retailReference?: number;
  wholesaleReference?: number;
  sustainableFloor?: number;
  /** URL de uma imagem opcional do produto. String vazia remove a imagem. */
  imageUrl?: string;
  /** Observações internas (resumo de custos, etc.). */
  notes?: string;
  /** Observação visível ao cliente na proposta impressa. */
  customerNotes?: string;
  /** Filamentos reais do estoque e consumo previsto por cor/SKU. */
  materialUsages?: MaterialUsage[];
  /** Estrutura de bandejas usada para reproduzir e auditar o cálculo. */
  calculationProject?: CalculatorProject;
  /** Estado completo da calculadora — o que permite reabrir com o mesmo preço. */
  calcSnapshot?: QuoteCalcSnapshot;
  /** Status do orçamento. Ignorado na criação (sempre nasce PENDING). */
  status?: QuoteStatus;
  infill?: number;
  printerId?: string;
  printerName?: string;
  /** Exibir a imagem do produto na proposta impressa ao cliente. */
  showImageOnQuote?: boolean;
  documentNumber?: string;
  validUntil?: string;
  paymentTerms?: string;
}

const optional = <T>(value: T | undefined | null): value is T =>
  value !== undefined && value !== null && value !== ("" as unknown as T);

/**
 * Monta o documento gravado em `quotes`. Pura e testável: nunca lê o
 * Firestore, só decide o que entra no payload.
 *
 * `isUpdate: false` (criação) grava `userId`/`status`/`createdAt` — os campos
 * de identidade do orçamento. `isUpdate: true` nunca toca nesses três: uma
 * atualização não pode trocar o dono nem ressuscitar um orçamento aprovado
 * de volta para PENDING.
 */
export function buildQuotePayload(
  input: SaveQuoteInput,
  opts: { isUpdate: boolean } = { isUpdate: false },
): Record<string, unknown> {
  const phoneClean = (input.phone || "").replace(/\D/g, "");
  const data: Record<string, unknown> = {
    userName: input.clientName.trim() || "Cliente",
    fileName: (input.pieceName || "").trim() || "Peça personalizada",
    materialId: input.materialLabel,
    infill: optional(input.infill) ? Math.max(0, Math.min(100, Number(input.infill))) : 0,
    weight: Math.max(0, Number(input.weight) || 0),
    printTime: input.printTime || "",
    quantity: Math.max(1, Math.floor(Number(input.quantity) || 1)),
    total: Math.max(0, Number(input.price) || 0),
    estimatedPrice: Math.max(0, Number(input.price) || 0),
    source: "calculator",
    updatedAt: serverTimestamp(),
  };

  if (opts.isUpdate) {
    if (optional(input.status)) data.status = input.status;
  } else {
    data.userId = auth.currentUser?.uid || "guest";
    data.userEmail = auth.currentUser?.email || "";
    data.status = input.status ?? "PENDING";
    data.createdAt = serverTimestamp();
  }

  if (phoneClean) data.phone = phoneClean;
  if (optional(input.customerId)) data.customerId = input.customerId;
  if (optional(input.priceTier)) data.priceTier = input.priceTier;
  if (optional(input.unitPrice)) data.unitPrice = Math.max(0, Number(input.unitPrice) || 0);
  if (optional(input.costTotal)) data.costTotal = Math.max(0, Number(input.costTotal) || 0);
  if (optional(input.retailReference))
    data.retailReference = Math.max(0, Number(input.retailReference) || 0);
  if (optional(input.wholesaleReference))
    data.wholesaleReference = Math.max(0, Number(input.wholesaleReference) || 0);
  if (optional(input.sustainableFloor))
    data.sustainableFloor = Math.max(0, Number(input.sustainableFloor) || 0);
  if (optional(input.printerId)) data.printerId = input.printerId;
  if (optional(input.printerName)) data.printerName = input.printerName;
  if (input.showImageOnQuote !== undefined) data.showImageOnQuote = input.showImageOnQuote;
  if (optional(input.documentNumber)) data.documentNumber = input.documentNumber;
  if (optional(input.validUntil)) data.validUntil = input.validUntil;
  if (optional(input.paymentTerms)) data.paymentTerms = input.paymentTerms;
  if (optional(input.notes)) data.adminNotes = input.notes;
  if (optional(input.customerNotes)) data.notes = input.customerNotes;

  // String vazia = o usuário removeu a imagem; `undefined` = não mexer nela.
  if (input.imageUrl) {
    data.imageUrl = input.imageUrl;
  } else if (opts.isUpdate && input.imageUrl === "") {
    data.imageUrl = deleteField();
  }

  if (input.materialUsages?.length) {
    data.materialUsages = input.materialUsages
      .filter((usage) => usage.materialId && Number(usage.estimatedGrams) > 0)
      .map((usage) => ({
        materialId: usage.materialId,
        materialName: usage.materialName || "Filamento",
        ...(usage.plateId ? { plateId: usage.plateId } : {}),
        ...(usage.plateName ? { plateName: usage.plateName } : {}),
        ...(usage.inventoryTracked === false ? { inventoryTracked: false } : {}),
        ...(usage.manualColor ? { manualColor: usage.manualColor } : {}),
        ...(usage.manualBrand ? { manualBrand: usage.manualBrand } : {}),
        ...(usage.manualType ? { manualType: usage.manualType } : {}),
        ...(Number.isFinite(usage.pricePerKg) ? { pricePerKg: usage.pricePerKg } : {}),
        estimatedGrams: Math.max(0, Number(usage.estimatedGrams) || 0),
      }));
  }
  if (input.calculationProject) data.calculationProject = input.calculationProject;
  if (input.calcSnapshot) {
    data.calcSnapshot = input.calcSnapshot;
    // A ficha voltou a bater com o preço exibido — a tarja de "desatualizado"
    // some assim que a calculadora grava um snapshot novo.
    if (opts.isUpdate) data.calcSnapshotStale = deleteField();
  }

  return data;
}

/** Cria um orçamento novo. Retorna o id criado. */
export async function saveQuoteFromCalc(input: SaveQuoteInput): Promise<string> {
  const data = buildQuotePayload(input, { isUpdate: false });
  const ref = await addDoc(collection(db, "quotes"), data);
  return ref.id;
}

/**
 * Atualiza um orçamento existente. Nunca toca em `userId`, `status` (a menos
 * que `input.status` seja informado) ou `createdAt`.
 */
export async function updateQuoteFromCalc(quoteId: string, input: SaveQuoteInput): Promise<void> {
  const data = buildQuotePayload(input, { isUpdate: true });
  await updateDoc(doc(db, "quotes", quoteId), data as UpdateData<DocumentData>);
}

/**
 * O que a calculadora chama ao salvar: cria quando não há `quoteId`,
 * atualiza quando há. `created` diz ao chamador qual dos dois aconteceu.
 */
export async function saveOrUpdateQuoteFromCalc(
  input: SaveQuoteInput & { quoteId?: string | null },
): Promise<{ id: string; created: boolean }> {
  const { quoteId, ...rest } = input;
  if (quoteId) {
    await updateQuoteFromCalc(quoteId, rest);
    return { id: quoteId, created: false };
  }
  const id = await saveQuoteFromCalc(rest);
  return { id, created: true };
}

/**
 * Envia uma imagem opcional do produto para o Storage e devolve a URL pública.
 * Caminho: `quotes/{uid}/timestamp-nome.ext`. Requer admin (ver storage.rules).
 */
export async function uploadQuoteImage(file: File): Promise<string> {
  const { ref: storageRef, uploadBytes, getDownloadURL } = await import("firebase/storage");
  const uid = auth.currentUser?.uid || "anon";
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeName =
    file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 50) || "imagem";
  const path = `quotes/${uid}/${Date.now()}-${safeName}.${extension}`;
  const fileRef = storageRef(await getStorageInstance(), path);
  await uploadBytes(fileRef, file, {
    contentType: file.type,
    customMetadata: { uploadedBy: uid, source: "calculator-quote" },
  });
  return getDownloadURL(fileRef);
}

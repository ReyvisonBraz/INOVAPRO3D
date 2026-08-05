// ============================================================================
// SALVAR ORÇAMENTO NO SISTEMA (a partir das calculadoras)
// ----------------------------------------------------------------------------
// As duas calculadoras (pública /calculadora e "Cálculo Maker Rápido" do admin)
// usam este helper para gravar um orçamento na coleção `quotes`, aparecendo na
// aba "Orçamentos" do painel. A criação com dados completos exige um admin
// autenticado (ver firestore.rules → isValidQuoteCreate/isAdmin).
// ============================================================================

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db, getStorageInstance } from "../services/firebase";
import type { MaterialUsage } from "../types/domain";
import type { CalculatorProject } from "./calculatorProject";

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
  /** URL de uma imagem opcional do produto. */
  imageUrl?: string;
  /** Observações internas (resumo de custos, etc.). */
  notes?: string;
  /** Filamentos reais do estoque e consumo previsto por cor/SKU. */
  materialUsages?: MaterialUsage[];
  /** Estrutura de bandejas usada para reproduzir e auditar o cálculo. */
  calculationProject?: CalculatorProject;
}

/** Extensões visuais/legíveis não previstas no tipo Quote base. */
const optional = <T,>(value: T | undefined | null): value is T =>
  value !== undefined && value !== null && value !== ("" as unknown as T);

/**
 * Grava o orçamento na coleção `quotes`. Retorna o id criado.
 * Campos `undefined` são omitidos (o Firestore não aceita undefined).
 */
export async function saveQuoteFromCalc(input: SaveQuoteInput): Promise<string> {
  const phoneClean = (input.phone || "").replace(/\D/g, "");
  const data: Record<string, unknown> = {
    userId: auth.currentUser?.uid || "guest",
    userName: input.clientName.trim() || "Cliente",
    userEmail: auth.currentUser?.email || "",
    status: "PENDING",
    fileName: (input.pieceName || "").trim() || "Peça personalizada",
    materialId: input.materialLabel,
    infill: 0,
    weight: Math.max(0, Number(input.weight) || 0),
    printTime: input.printTime || "",
    quantity: Math.max(1, Math.floor(Number(input.quantity) || 1)),
    total: Math.max(0, Number(input.price) || 0),
    estimatedPrice: Math.max(0, Number(input.price) || 0),
    source: "calculator",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
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
  if (optional(input.imageUrl)) data.imageUrl = input.imageUrl;
  if (optional(input.notes)) data.adminNotes = input.notes;
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

  const ref = await addDoc(collection(db, "quotes"), data);
  return ref.id;
}

/**
 * Envia uma imagem opcional do produto para o Storage e devolve a URL pública.
 * Caminho: `quotes/{uid}/timestamp-nome.ext`. Requer admin (ver storage.rules).
 */
export async function uploadQuoteImage(file: File): Promise<string> {
  const { ref: storageRef, uploadBytes, getDownloadURL } = await import("firebase/storage");
  const uid = auth.currentUser?.uid || "anon";
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeName = file.name
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

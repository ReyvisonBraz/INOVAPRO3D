// ============================================================================
// ACESSO A DADOS DAS IMPRESSORAS
// ----------------------------------------------------------------------------
// Fonte única de leitura/escrita da coleção `printers`, usada pelo painel e
// pela calculadora. O documento antigo `settings/machine` NUNCA é apagado: a
// impressora padrão o espelha, então qualquer código que ainda leia o caminho
// antigo continua funcionando.
// ============================================================================

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type UpdateData,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  machineConfigFromPrinter,
  mergePrinter,
  printerFromMachineConfig,
  sortPrinters,
} from "../lib/printers";
import { DEFAULT_MACHINE, type MachineConfig } from "../lib/pricing";
import type { Printer } from "../types/domain";

export const PRINTERS_COLLECTION = "printers";
const LEGACY_MACHINE_DOC = ["settings", "machine"] as const;

/** Erro esperado quando as regras do Firestore ainda não foram publicadas. */
export function isPermissionDenied(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code || "";
  return code === "permission-denied" || code === "firestore/permission-denied";
}

/** Mensagem acionável para o admin quando falta publicar as regras. */
export const RULES_NOT_DEPLOYED_MESSAGE =
  "Impressoras bloqueadas: publique as regras com `firebase deploy --only firestore:rules`.";

/**
 * Lê todas as impressoras. A ordenação é feita no cliente de propósito:
 * `orderBy` no Firestore descartaria documentos sem o campo `order`.
 */
export async function fetchPrinters(): Promise<Printer[]> {
  const snapshot = await getDocs(collection(db, PRINTERS_COLLECTION));
  return sortPrinters(snapshot.docs.map((entry) => mergePrinter(entry.data(), entry.id)));
}

/** Lê o antigo singleton `settings/machine`, usado como fallback. */
export async function fetchLegacyMachineConfig(): Promise<MachineConfig | null> {
  const snapshot = await getDoc(doc(db, ...LEGACY_MACHINE_DOC));
  if (!snapshot.exists()) return null;
  // `mergePrinter` já satura e completa os 9 campos contra o DEFAULT_MACHINE.
  return machineConfigFromPrinter(mergePrinter(snapshot.data(), "legacy"));
}

/**
 * Mantém `settings/machine` como espelho da impressora padrão, para que
 * qualquer leitor antigo continue vendo os mesmos números.
 */
export async function mirrorDefaultPrinterToSettings(
  printer: MachineConfig & { id: string },
): Promise<void> {
  await setDoc(
    doc(db, ...LEGACY_MACHINE_DOC),
    {
      ...machineConfigFromPrinter(printer),
      mirroredFromPrinterId: printer.id,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export type PrinterDraft = Omit<Printer, "id" | "createdAt" | "updatedAt">;

/** Remove `undefined` — o Firestore rejeita esses campos. */
function toDocument(draft: Partial<PrinterDraft>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(draft)) {
    if (value !== undefined) data[key] = value;
  }
  return data;
}

export async function createPrinter(draft: PrinterDraft): Promise<string> {
  const reference = await addDoc(collection(db, PRINTERS_COLLECTION), {
    ...toDocument(draft),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reference.id;
}

export async function updatePrinter(id: string, draft: Partial<PrinterDraft>): Promise<void> {
  await updateDoc(doc(db, PRINTERS_COLLECTION, id), {
    ...toDocument(draft),
    updatedAt: serverTimestamp(),
  } as UpdateData<DocumentData>);
}

export async function deletePrinter(id: string): Promise<void> {
  await deleteDoc(doc(db, PRINTERS_COLLECTION, id));
}

/**
 * Promove uma impressora a padrão garantindo o invariante de padrão único:
 * as irmãs perdem a marca no mesmo lote.
 */
export async function setDefaultPrinter(
  printers: Pick<Printer, "id" | "isDefault">[],
  id: string,
): Promise<void> {
  const batch = writeBatch(db);
  for (const printer of printers) {
    const shouldBeDefault = printer.id === id;
    if (Boolean(printer.isDefault) === shouldBeDefault) continue;
    batch.update(doc(db, PRINTERS_COLLECTION, printer.id), {
      isDefault: shouldBeDefault,
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

/**
 * Cria a primeira impressora a partir do `settings/machine` existente (ou dos
 * padrões) quando a coleção está vazia. Devolve o id criado, ou null se já
 * havia impressoras cadastradas.
 */
export async function seedPrintersIfEmpty(
  fallbackMachine: MachineConfig = DEFAULT_MACHINE,
  name?: string,
): Promise<string | null> {
  const existing = await fetchPrinters();
  if (existing.length) return null;
  const legacy = await fetchLegacyMachineConfig().catch(() => null);
  return createPrinter(printerFromMachineConfig(legacy ?? fallbackMachine, name));
}

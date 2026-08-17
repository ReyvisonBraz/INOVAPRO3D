// ============================================================================
// ACESSO A DADOS DA EMPRESA (settings/company)
// ----------------------------------------------------------------------------
// Identidade impressa nos documentos. Leitura restrita a admin pelas regras,
// então todo consumidor precisa tolerar falha e cair no perfil padrão de
// `lib/company.ts` — nenhum documento pode sair sem cabeçalho.
// ============================================================================

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_COMPANY_PROFILE, mergeCompanyProfile } from "../lib/company";
import type { CompanyProfile } from "../types/domain";

const COMPANY_DOC = ["settings", "company"] as const;

/** Lê o perfil da empresa. Nunca lança: sem cadastro, devolve o padrão. */
export async function fetchCompanyProfile(): Promise<CompanyProfile> {
  try {
    const snapshot = await getDoc(doc(db, ...COMPANY_DOC));
    return mergeCompanyProfile(snapshot.exists() ? snapshot.data() : null);
  } catch {
    return { ...DEFAULT_COMPANY_PROFILE };
  }
}

/** Grava o perfil. `undefined` é removido porque o Firestore o rejeita. */
export async function saveCompanyProfile(profile: CompanyProfile): Promise<void> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(profile)) {
    if (value === undefined || key === "updatedAt") continue;
    if (key === "address" && value && typeof value === "object") {
      const address: Record<string, unknown> = {};
      for (const [field, fieldValue] of Object.entries(value)) {
        if (fieldValue !== undefined) address[field] = fieldValue;
      }
      data.address = address;
      continue;
    }
    data[key] = value;
  }
  // O documento pertence exclusivamente a este formulário. A substituição
  // também remove campos que o admin apagou, evitando dados antigos no papel.
  await setDoc(doc(db, ...COMPANY_DOC), { ...data, updatedAt: serverTimestamp() });
}

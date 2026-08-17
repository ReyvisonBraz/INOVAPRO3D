// ============================================================================
// IDENTIDADE DA EMPRESA (settings/company)
// ----------------------------------------------------------------------------
// Alimenta o cabeçalho e o rodapé dos documentos impressos: proposta comercial
// e ficha técnica de produção. Enquanto o admin não preenche o cadastro, os
// defaults vêm de `lib/config.ts`, então nenhum documento sai em branco.
// ============================================================================

import { CONTACT, SOCIAL } from "./config";
import type { CompanyAddress, CompanyPaymentMethod, CompanyProfile } from "../types/domain";

/** Validade padrão da proposta, em dias corridos. */
export const DEFAULT_VALIDITY_DAYS = 7;

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  tradeName: CONTACT.businessName,
  phone: CONTACT.whatsapp,
  whatsapp: CONTACT.whatsapp,
  email: CONTACT.email,
  instagram: SOCIAL.instagramHandle,
  facebook: SOCIAL.facebook,
  tiktok: SOCIAL.tiktok,
  logoUrl: "/app-icon-512.webp",
  defaultValidityDays: DEFAULT_VALIDITY_DAYS,
  paymentTerms: "50% na aprovação e 50% na entrega · PIX, cartão ou dinheiro",
  acceptedPaymentMethods: ["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH"],
  leadTimeText: "5 a 7 dias úteis após a aprovação",
};

export const PAYMENT_METHOD_LABELS: Record<CompanyPaymentMethod, string> = {
  PIX: "PIX",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  CASH: "Dinheiro",
  BANK_TRANSFER: "Transferência",
  BOLETO: "Boleto",
};

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as CompanyPaymentMethod[];

function mergePaymentMethods(raw: unknown): CompanyPaymentMethod[] {
  if (!Array.isArray(raw)) return [...(DEFAULT_COMPANY_PROFILE.acceptedPaymentMethods ?? [])];
  return [
    ...new Set(
      raw.filter((value): value is CompanyPaymentMethod =>
        PAYMENT_METHODS.includes(value as CompanyPaymentMethod),
      ),
    ),
  ];
}

const optionalTrimmed = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

function mergeAddress(raw: unknown): CompanyAddress | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  const address: CompanyAddress = {
    zipCode: optionalTrimmed(r.zipCode),
    street: optionalTrimmed(r.street),
    number: optionalTrimmed(r.number),
    complement: optionalTrimmed(r.complement),
    neighborhood: optionalTrimmed(r.neighborhood),
    city: optionalTrimmed(r.city),
    state: optionalTrimmed(r.state)?.toUpperCase(),
  };
  return Object.values(address).some(Boolean) ? address : undefined;
}

/**
 * Combina o documento bruto do Firestore com os defaults. Mesmo espírito de
 * `mergePricingSettings`: aceita ausente, parcial ou corrompido e devolve
 * sempre um perfil utilizável pelos documentos.
 */
export function mergeCompanyProfile(raw: unknown): CompanyProfile {
  const base = DEFAULT_COMPANY_PROFILE;
  if (typeof raw !== "object" || raw === null) return { ...base };
  const r = raw as Record<string, unknown>;

  const validity = Number(r.defaultValidityDays);
  return {
    tradeName: optionalTrimmed(r.tradeName) ?? base.tradeName,
    legalName: optionalTrimmed(r.legalName),
    document: optionalTrimmed(r.document),
    stateRegistration: optionalTrimmed(r.stateRegistration),
    phone: optionalTrimmed(r.phone) ?? base.phone,
    whatsapp: optionalTrimmed(r.whatsapp) ?? base.whatsapp,
    email: optionalTrimmed(r.email) ?? base.email,
    site: optionalTrimmed(r.site),
    instagram: optionalTrimmed(r.instagram) ?? base.instagram,
    facebook: optionalTrimmed(r.facebook) ?? base.facebook,
    tiktok: optionalTrimmed(r.tiktok) ?? base.tiktok,
    linkedin: optionalTrimmed(r.linkedin),
    logoUrl: optionalTrimmed(r.logoUrl) ?? base.logoUrl,
    address: mergeAddress(r.address),
    defaultValidityDays: Number.isFinite(validity)
      ? Math.max(1, Math.floor(validity))
      : base.defaultValidityDays,
    paymentTerms: optionalTrimmed(r.paymentTerms) ?? base.paymentTerms,
    acceptedPaymentMethods: mergePaymentMethods(r.acceptedPaymentMethods),
    warrantyTerms: optionalTrimmed(r.warrantyTerms),
    leadTimeText: optionalTrimmed(r.leadTimeText) ?? base.leadTimeText,
    quoteFooterNote: optionalTrimmed(r.quoteFooterNote),
    updatedAt: r.updatedAt as CompanyProfile["updatedAt"],
  };
}

/** Endereço em uma linha para o cabeçalho do documento. */
export function formatCompanyAddress(address?: CompanyAddress): string {
  if (!address) return "";
  const street = [address.street, address.number].filter(Boolean).join(", ");
  const streetWithComplement = [street, address.complement].filter(Boolean).join(" — ");
  const cityState = [address.city, address.state].filter(Boolean).join("/");
  const locality = [address.neighborhood, cityState].filter(Boolean).join(", ");
  return [streetWithComplement, locality, address.zipCode && `CEP ${address.zipCode}`]
    .filter(Boolean)
    .join(" · ");
}

/** Formata CPF (11 dígitos) ou CNPJ (14). Devolve o original se não bater. */
export function formatDocument(document?: string): string {
  const digits = (document || "").replace(/\D/g, "");
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return (document || "").trim();
}

/** Rótulo do documento: "CNPJ 00.000.000/0001-00". Vazio quando não há. */
export function formatDocumentLabel(document?: string): string {
  const digits = (document || "").replace(/\D/g, "");
  const formatted = formatDocument(document);
  if (!formatted) return "";
  if (digits.length === 14) return `CNPJ ${formatted}`;
  if (digits.length === 11) return `CPF ${formatted}`;
  return formatted;
}

/** Telefone brasileiro legível: (91) 98077-4776. Aceita com ou sem DDI 55. */
export function formatCompanyPhone(phone?: string): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return (phone || "").trim();
}

/** Data de validade da proposta a partir da emissão. */
export function computeValidUntil(issuedAt: Date, validityDays: number): Date {
  const days = Number.isFinite(validityDays) ? Math.max(1, Math.floor(validityDays)) : 1;
  const result = new Date(issuedAt.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

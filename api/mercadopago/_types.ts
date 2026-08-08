import type { PaymentMethod, PaymentStatus } from "../../src/types/domain.js";

// Mercado Pago API Types
export interface MercadoPagoPaymentRequest {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  external_reference: string;
  statement_descriptor?: string;
  notification_url?: string;
  payer?: {
    email?: string;
  };
  additional_info?: {
    ip_address?: string;
  };
}

export interface MercadoPagoPaymentResponse {
  id: number;
  status: string;
  status_detail?: string;
  payment_method_id?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
      date_of_expiration?: string;
    };
  };
}

export interface MercadoPagoPaymentStatusResponse {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  payment_method_id: string;
  date_created: string;
  date_approved?: string;
  external_reference?: string;
}

// Internal Types
export interface CreatePaymentData {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  paymentMethod: "pix" | "credit_card" | "debit_card";
  idempotencyKey: string;
  email?: string;
}

export interface CreatePaymentResult {
  paymentId: string;
  status: string;
  statusDetail?: string;
  paymentMethodId?: string;
  qrCodeBase64?: string;
  qrCodeUrl?: string;
  pixCode?: string;
  expirationDate?: string;
}

export interface PaymentStatusResult {
  id: string;
  status: string;
  statusDetail: string;
  transactionAmount: number;
  currencyId: string;
  paymentMethodId: string;
  dateCreated: string;
  dateApproved?: string;
  externalReference?: string;
}

// Mapeamento de status
export function mapMercadoPagoStatus(mpStatus: string): PaymentStatus {
  const normalized = mpStatus.toLowerCase();
  switch (normalized) {
    case "approved":
      return "APPROVED";
    case "pending":
    case "in_process":
    case "authorized":
      return "PENDING";
    case "rejected":
      return "REJECTED";
    case "cancelled":
    case "canceled":
      return "CANCELED";
    case "expired":
      return "EXPIRED";
    case "refunded":
      return "REFUNDED";
    case "charged_back":
      return "CHARGED_BACK";
    default:
      return "PROCESSING";
  }
}

export function mapMercadoPagoPaymentMethod(mpMethod: string): PaymentMethod {
  const normalized = mpMethod.toLowerCase();
  if (normalized === "pix") return "pix";
  if (normalized === "credit_card") return "credit_card";
  if (normalized === "debit_card") return "debit_card";
  return "unknown";
}

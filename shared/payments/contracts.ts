export type PaymentStatus =
  | "NOT_STARTED"
  | "PROCESSING"
  | "PENDING"
  | "APPROVED"
  | "EXPIRED"
  | "REJECTED"
  | "CANCELED"
  | "REFUNDED"
  | "CHARGED_BACK";

export type PaymentMethod = "pix" | "credit_card" | "debit_card" | "manual" | "unknown";

/** Efeito financeiro sobre a liberação do pedido para produção. */
export type FulfillmentAction =
  "NONE" | "RELEASE_FULFILLMENT" | "KEEP_AWAITING_PAYMENT" | "HOLD_FULFILLMENT";

/** Contrato neutro retornado por qualquer provedor de pagamento. */
export interface PaymentSnapshot {
  providerPaymentId: string;
  providerOrderId?: string;
  externalReference: string;
  status: PaymentStatus;
  providerStatus: string;
  statusDetail?: string;
  amountCents: number;
  currency: "BRL";
  paymentMethod: PaymentMethod;
  createdAt: string;
  approvedAt?: string;
  expiresAt?: string;
  qrCodeBase64?: string;
  qrCodeUrl?: string;
  pixCode?: string;
}

export interface CreatePixPaymentInput {
  orderId: string;
  attemptNumber: number;
  idempotencyKey: string;
  amountCents: number;
  description: string;
  payerEmail: string;
  expirationMinutes: number;
}

/** Porta implementada pelo adaptador Mercado Pago; o domínio não conhece JSON externo. */
export interface PaymentProvider {
  createPix(input: CreatePixPaymentInput): Promise<PaymentSnapshot>;
  getPayment(providerPaymentId: string): Promise<PaymentSnapshot>;
  cancelPayment(providerPaymentId: string, idempotencyKey: string): Promise<PaymentSnapshot>;
  refundPayment(providerPaymentId: string, idempotencyKey: string): Promise<PaymentSnapshot>;
}

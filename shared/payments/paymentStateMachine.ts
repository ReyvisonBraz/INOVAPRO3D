import type { FulfillmentAction, PaymentStatus } from "./contracts";

export interface PaymentTransition {
  accepted: boolean;
  previousStatus: PaymentStatus;
  nextStatus: PaymentStatus;
  fulfillmentAction: FulfillmentAction;
  reason: "INITIAL" | "ADVANCE" | "LATE_APPROVAL" | "NO_CHANGE" | "STALE_OR_INVALID";
}

const FINAL_PAYMENT_STATUSES = new Set<PaymentStatus>([
  "APPROVED",
  "EXPIRED",
  "REJECTED",
  "CANCELED",
  "REFUNDED",
  "CHARGED_BACK",
]);

export function isFinalPaymentStatus(status: PaymentStatus): boolean {
  return FINAL_PAYMENT_STATUSES.has(status);
}

export function fulfillmentActionFor(status: PaymentStatus): FulfillmentAction {
  switch (status) {
    case "APPROVED":
      return "RELEASE_FULFILLMENT";
    case "EXPIRED":
    case "REJECTED":
    case "CANCELED":
      return "KEEP_AWAITING_PAYMENT";
    case "REFUNDED":
    case "CHARGED_BACK":
      return "HOLD_FULFILLMENT";
    default:
      return "NONE";
  }
}

/**
 * Impede regressões causadas por webhooks atrasados. Aprovação tardia ainda é
 * aceita após expiração/recusa porque o estado consultado no provedor é a fonte
 * de verdade. Após aprovação, somente estorno ou chargeback podem avançar.
 */
export function resolvePaymentTransition(
  previousStatus: PaymentStatus,
  nextStatus: PaymentStatus,
): PaymentTransition {
  const base = {
    previousStatus,
    nextStatus,
    fulfillmentAction: fulfillmentActionFor(nextStatus),
  };

  if (previousStatus === nextStatus) {
    return { ...base, accepted: false, reason: "NO_CHANGE" };
  }

  if (previousStatus === "NOT_STARTED") {
    return { ...base, accepted: true, reason: "INITIAL" };
  }

  if (previousStatus === "PROCESSING" || previousStatus === "PENDING") {
    return { ...base, accepted: true, reason: "ADVANCE" };
  }

  if (
    (previousStatus === "EXPIRED" ||
      previousStatus === "REJECTED" ||
      previousStatus === "CANCELED") &&
    nextStatus === "APPROVED"
  ) {
    return { ...base, accepted: true, reason: "LATE_APPROVAL" };
  }

  if (
    previousStatus === "APPROVED" &&
    (nextStatus === "REFUNDED" || nextStatus === "CHARGED_BACK")
  ) {
    return { ...base, accepted: true, reason: "ADVANCE" };
  }

  return { ...base, accepted: false, reason: "STALE_OR_INVALID" };
}

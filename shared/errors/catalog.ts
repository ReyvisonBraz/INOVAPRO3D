export const ERROR_CATALOG = {
  METHOD_NOT_ALLOWED: {
    httpStatus: 405,
    message: "Esta operação não é permitida.",
    retryable: false,
  },
  INVALID_REQUEST: {
    httpStatus: 400,
    message: "Não foi possível validar os dados enviados.",
    retryable: false,
  },
  AUTH_REQUIRED: {
    httpStatus: 401,
    message: "Sua sessão expirou. Entre novamente para continuar.",
    retryable: false,
  },
  FORBIDDEN: {
    httpStatus: 403,
    message: "Você não tem permissão para realizar esta operação.",
    retryable: false,
  },
  ORDER_NOT_FOUND: {
    httpStatus: 404,
    message: "Não encontramos este pedido.",
    retryable: false,
  },
  ORDER_ALREADY_PAID: {
    httpStatus: 409,
    message: "Este pedido já foi pago.",
    retryable: false,
  },
  ORDER_CANCELED: {
    httpStatus: 409,
    message: "Este pedido foi cancelado.",
    retryable: false,
  },
  INVALID_ORDER_TOTAL: {
    httpStatus: 422,
    message: "Não foi possível validar o valor deste pedido.",
    retryable: false,
  },
  ORDER_CREATION_FAILED: {
    httpStatus: 500,
    message: "Não foi possível criar o pedido agora. Tente novamente.",
    retryable: true,
  },
  WEBHOOK_SIGNATURE_INVALID: {
    httpStatus: 401,
    message: "Não foi possível validar a notificação.",
    retryable: false,
  },
  RATE_LIMITED: {
    httpStatus: 429,
    message: "Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.",
    retryable: true,
  },
  SERVICE_CONFIGURATION_ERROR: {
    httpStatus: 503,
    message: "O serviço está temporariamente indisponível.",
    retryable: true,
  },
  PAYMENT_CONFIGURATION_ERROR: {
    httpStatus: 503,
    message: "O pagamento está temporariamente indisponível.",
    retryable: true,
  },
  PAYMENT_PROVIDER_ERROR: {
    httpStatus: 502,
    message: "Não conseguimos comunicar com o serviço de pagamento. Tente novamente.",
    retryable: true,
  },
  PAYMENT_PROCESSING_FAILED: {
    httpStatus: 500,
    message: "Não foi possível gerar o Pix agora. Tente novamente.",
    retryable: true,
  },
  INTERNAL_ERROR: {
    httpStatus: 500,
    message: "Ocorreu um erro inesperado. Tente novamente.",
    retryable: true,
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && Object.hasOwn(ERROR_CATALOG, value);
}

export interface PublicErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    correlationId: string;
  };
}

export function createPublicErrorResponse(
  code: ErrorCode,
  correlationId: string,
): PublicErrorResponse {
  const definition = ERROR_CATALOG[code];
  return {
    error: {
      code,
      message: definition.message,
      retryable: definition.retryable,
      correlationId,
    },
  };
}

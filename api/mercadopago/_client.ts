// Cliente HTTP robusto para API do Mercado Pago
// Inclui retry com backoff exponencial, timeout e logs estruturados

import { getMercadoPagoServerConfig } from "./_config.js";

const API_BASE_URL = "https://api.mercadopago.com/v1";

class MercadoPagoApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MercadoPagoApiError";
  }

  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

// Log estruturado com mascaramento de dados sensíveis
function log(level: "info" | "warn" | "error", message: string, data?: Record<string, unknown>) {
  const maskedData = data ? maskSensitiveData(data) : undefined;
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: "mercadopago",
      message,
      ...maskedData,
    }),
  );
}

// Mascarar dados sensíveis nos logs
function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...data };
  const sensitiveKeys = ["accessToken", "secret", "key", "token", "password"];

  for (const key of Object.keys(masked)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      masked[key] = "***MASKED***";
    }
  }

  return masked;
}

// Retry com backoff exponencial
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelay = 500): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Repetir um 400/401/404 não muda o resultado e aumenta a latência.
      // Erros de rede continuam elegíveis porque não possuem status HTTP.
      if (error instanceof MercadoPagoApiError && !error.retryable) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        log("warn", `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
          error: lastError.message,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Timeout wrapper
async function withTimeout<T>(fn: () => Promise<T>, timeoutMs = 10_000): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

// Request com autenticação
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { accessToken } = getMercadoPagoServerConfig();

  if (!accessToken) {
    throw new Error("Mercado Pago não configurado no servidor");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  headers.Authorization = `Bearer ${accessToken}`;

  const requestOptions: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new MercadoPagoApiError(
      error.message || `Erro na API: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  return response.json();
}

// Criar pagamento
export async function createPayment(data: {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  paymentMethod: "pix";
  idempotencyKey: string;
  email?: string;
}): Promise<{
  paymentId: string;
  status: string;
  statusDetail?: string;
  paymentMethodId?: string;
  qrCodeBase64?: string;
  qrCodeUrl?: string;
  pixCode?: string;
  expirationDate?: string;
}> {
  return withRetry(async () => {
    return withTimeout(async () => {
      log("info", "Criando pagamento", {
        orderId: data.orderId,
        paymentMethod: data.paymentMethod,
      });

      const body: Record<string, unknown> = {
        transaction_amount: data.amount,
        description: data.description,
        payment_method_id: data.paymentMethod,
        external_reference: data.orderId,
        statement_descriptor: "INOVAPRO3D",
        additional_info: {
          ip_address: "127.0.0.1",
        },
      };

      if (data.email) {
        body.payer = { email: data.email };
      }

      // Adiciona notification_url apenas se configurada
      const { webhookUrl } = getMercadoPagoServerConfig();
      if (webhookUrl.startsWith("https://")) {
        body.notification_url = webhookUrl;
      }

      const result = await apiRequest<{
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
      }>("/payments", {
        method: "POST",
        headers: {
          "X-Idempotency-Key": data.idempotencyKey,
        },
        body: JSON.stringify(body),
      });

      const response: {
        paymentId: string;
        status: string;
        statusDetail?: string;
        paymentMethodId?: string;
        qrCodeBase64?: string;
        qrCodeUrl?: string;
        pixCode?: string;
        expirationDate?: string;
      } = {
        paymentId: result.id.toString(),
        status: result.status,
        statusDetail: result.status_detail,
        paymentMethodId: result.payment_method_id,
      };

      if (result.point_of_interaction?.transaction_data) {
        const pixData = result.point_of_interaction.transaction_data;
        response.qrCodeBase64 = pixData.qr_code_base64;
        response.qrCodeUrl = pixData.ticket_url;
        response.pixCode = pixData.qr_code;
        response.expirationDate = pixData.date_of_expiration;
      }

      log("info", "Pagamento criado", { paymentId: response.paymentId, status: response.status });

      return response;
    });
  });
}

// Consultar status do pagamento
export async function getPaymentStatus(paymentId: string): Promise<{
  id: string;
  status: string;
  statusDetail: string;
  transactionAmount: number;
  currencyId: string;
  paymentMethodId: string;
  dateCreated: string;
  dateApproved?: string;
  externalReference?: string;
}> {
  return withRetry(async () => {
    return withTimeout(async () => {
      log("info", "Consultando status do pagamento", { paymentId });

      const result = await apiRequest<{
        id: number;
        status: string;
        status_detail: string;
        transaction_amount: number;
        currency_id: string;
        payment_method_id: string;
        date_created: string;
        date_approved?: string;
        external_reference?: string;
      }>(`/payments/${paymentId}`, {
        method: "GET",
      });

      const response: {
        id: string;
        status: string;
        statusDetail: string;
        transactionAmount: number;
        currencyId: string;
        paymentMethodId: string;
        dateCreated: string;
        dateApproved?: string;
        externalReference?: string;
      } = {
        id: result.id.toString(),
        status: result.status,
        statusDetail: result.status_detail,
        transactionAmount: result.transaction_amount,
        currencyId: result.currency_id,
        paymentMethodId: result.payment_method_id,
        dateCreated: result.date_created,
        dateApproved: result.date_approved,
        externalReference: result.external_reference,
      };

      log("info", "Status do pagamento consultado", { paymentId, status: response.status });

      return response;
    });
  });
}

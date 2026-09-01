export type MercadoPagoEnvironment = "test" | "production";

export interface MercadoPagoServerConfig {
  accessToken: string;
  webhookSecret: string;
  webhookUrl: string;
  environment: MercadoPagoEnvironment;
  enabled: boolean;
}

/**
 * Lê segredos apenas no servidor. Manter esta configuração fora de `src/`
 * impede que tokens privados sejam incluídos acidentalmente no navegador.
 */
export function getMercadoPagoServerConfig(): MercadoPagoServerConfig {
  return {
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ?? "",
    webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() ?? "",
    webhookUrl: process.env.MERCADOPAGO_WEBHOOK_URL?.trim() ?? "",
    environment: process.env.MERCADOPAGO_ENVIRONMENT === "production" ? "production" : "test",
    enabled: process.env.MERCADOPAGO_ENABLED === "true",
  };
}

export function validatePaymentServerConfig(config = getMercadoPagoServerConfig()): string[] {
  const errors: string[] = [];
  if (!config.enabled) errors.push("Integração do Mercado Pago desativada");
  if (!config.accessToken) errors.push("MERCADOPAGO_ACCESS_TOKEN não configurado");
  if (!config.webhookUrl.startsWith("https://")) {
    errors.push("MERCADOPAGO_WEBHOOK_URL deve usar HTTPS");
  }
  return errors;
}

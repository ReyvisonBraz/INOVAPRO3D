/** Configuração pública. Nunca adicione segredos neste arquivo: ele vai para o navegador. */
export const mercadoPagoBrowserConfig = Object.freeze({
  publicKey: (import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string | undefined)?.trim() ?? "",
  enabled: import.meta.env.VITE_MERCADOPAGO_ENABLED === "true",
  environment:
    import.meta.env.VITE_MERCADOPAGO_ENVIRONMENT === "production" ? "production" : "test",
});

/** O checkout só aparece quando a chave pública existe e a feature flag está ativa. */
export function isEnabled(): boolean {
  return mercadoPagoBrowserConfig.enabled && mercadoPagoBrowserConfig.publicKey.length > 0;
}

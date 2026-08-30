// Escape de dados de usuário antes de interpolar em HTML.
// Módulo puro, sem dependências — usado tanto pelo Express (server.ts) quanto
// pelas funções serverless da Vercel (api/).
//
// Regra do projeto: nenhum dado vindo do cliente entra em e-mail ou em mensagem
// do Telegram sem passar por aqui. Os dois canais interpretam HTML, então um
// nome de cliente como `<a/href=https://evil.com>` viraria link clicável —
// phishing enviado pelo nosso próprio domínio verificado.

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapa `& < > " '` para uso seguro em corpo de HTML e em atributos. */
export function escapeHtml(value: unknown): string {
  if (value == null) return "";
  return String(value).replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}

/**
 * Escapa e limita o tamanho. O corte acontece antes do escape para que o limite
 * valha sobre o texto que o usuário realmente vê, e nunca no meio de uma
 * entidade (`&amp;` cortado em `&am` quebraria a renderização).
 */
export function escapeHtmlTruncated(value: unknown, maxLength: number): string {
  if (value == null) return "";
  return escapeHtml(String(value).slice(0, maxLength));
}

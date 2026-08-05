import { formatBRL } from "./pricing";

export interface CommercialQuoteMessageInput {
  customerName?: string | null;
  projectName?: string | null;
  quantity?: number;
  total: number;
  orderId?: string;
  validityDays?: number;
}

export function buildCommercialQuoteMessage(input: CommercialQuoteMessageInput): string {
  const customerName = input.customerName?.trim() || "Cliente";
  const projectName = input.projectName?.trim() || "seu projeto personalizado";
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));
  const total = Math.max(0, Number(input.total) || 0);
  const validityDays = Math.max(1, Math.floor(Number(input.validityDays) || 7));
  const orderMessage = input.orderId
    ? ` O pedido #${input.orderId.slice(0, 8)} também foi gerado.`
    : "";
  const unitLine = quantity > 1 ? `\n• Valor por unidade: ${formatBRL(total / quantity)}` : "";

  return `Olá, *${customerName}*!\n\nPreparamos sua proposta para *${projectName}*.${orderMessage}\n\n*Proposta comercial:*\n• Quantidade: ${quantity} unidade(s)\n• Valor total: ${formatBRL(total)}${unitLine}\n• Validade: ${validityDays} dias\n\nSe estiver de acordo, responda esta mensagem para confirmarmos os detalhes e programarmos a produção.\n\n*INOVAPRO3D*`;
}

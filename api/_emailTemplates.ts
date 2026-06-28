// Templates de e-mail (HTML inline, compatível com clientes de e-mail).
// Funções puras — sem dependências.

export interface OrderEmailData {
  orderId: string;
  customerName?: string;
  total?: number;
  paymentMethod?: string;
  appUrl?: string;
}

function brl(v?: number): string {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function paymentLabel(method?: string): string {
  if (method === "pix_manual") return "PIX";
  if (method === "stripe") return "Cartão ou PIX (Stripe)";
  return method || "—";
}

function shell(title: string, bodyHtml: string, appUrl: string): string {
  const base = (appUrl || "https://www.inovapro3d.com.br").replace(/\/+$/, "");
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:#0b0c15;padding:22px 28px;">
          <span style="font-size:18px;font-weight:800;letter-spacing:-0.3px;color:#ffffff;">INOVA<span style="color:#3b82f6;">PRO</span>3D</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 6px;font-size:20px;color:#0f172a;">${title}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          INOVAPRO3D — Impressão 3D profissional · <a href="${base}" style="color:#2563eb;text-decoration:none;">inovapro3d.com.br</a><br>
          Dúvidas? Responda este e-mail ou fale no WhatsApp.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;">${label}</a>`;
}

export function orderConfirmationEmail(d: OrderEmailData): { subject: string; html: string; text: string } {
  const shortId = d.orderId.slice(0, 10).toUpperCase();
  const base = (d.appUrl || "https://www.inovapro3d.com.br").replace(/\/+$/, "");
  const ordersUrl = `${base}/meus-pedidos`;
  const name = d.customerName ? d.customerName.split(" ")[0] : "";

  const subject = `Pedido #${shortId} recebido — INOVAPRO3D`;

  const body = `
    <p style="margin:0 0 14px;font-size:14px;color:#475569;line-height:1.6;">
      ${name ? `Olá, <strong>${name}</strong>! ` : ""}Recebemos o seu pedido e ele já está no nosso sistema. 🎉
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #e2e8f0;border-radius:12px;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid #eef2f7;font-size:13px;color:#64748b;">Protocolo</td>
          <td style="padding:14px 16px;border-bottom:1px solid #eef2f7;font-size:13px;color:#0f172a;font-weight:700;text-align:right;">#${shortId}</td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #eef2f7;font-size:13px;color:#64748b;">Pagamento</td>
          <td style="padding:14px 16px;border-bottom:1px solid #eef2f7;font-size:13px;color:#0f172a;text-align:right;">${paymentLabel(d.paymentMethod)}</td></tr>
      <tr><td style="padding:14px 16px;font-size:13px;color:#64748b;">Total</td>
          <td style="padding:14px 16px;font-size:16px;color:#2563eb;font-weight:800;text-align:right;">${brl(d.total)}</td></tr>
    </table>
    <p style="margin:0 0 18px;font-size:13px;color:#475569;line-height:1.6;">
      Você pode acompanhar cada etapa do pedido — da produção ao envio — na sua conta.
    </p>
    <p style="margin:0 0 8px;">${button(ordersUrl, "Acompanhar meu pedido")}</p>
  `;

  const html = shell("Pedido recebido!", body, base);
  const text =
    `Pedido #${shortId} recebido — INOVAPRO3D\n\n` +
    `${name ? `Olá, ${name}! ` : ""}Recebemos o seu pedido.\n` +
    `Pagamento: ${paymentLabel(d.paymentMethod)}\n` +
    `Total: ${brl(d.total)}\n\n` +
    `Acompanhe em: ${ordersUrl}\n`;

  return { subject, html, text };
}

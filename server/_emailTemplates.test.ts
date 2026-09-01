import { describe, expect, it } from "vitest";
import { orderConfirmationEmail } from "./_emailTemplates";

describe("orderConfirmationEmail", () => {
  it("escapa todos os dados interpolados no HTML final", () => {
    const email = orderConfirmationEmail({
      orderId: "pedido-seguro",
      customerName: "<img/src=x/onerror=alert(1)>",
      total: 149.9,
      paymentMethod: "<a/href=https://evil.test>PIX</a>",
      appUrl: 'https://example.test/\" onmouseover=\"alert(1)',
    });

    expect(email.html).not.toContain("<img/src");
    expect(email.html).not.toContain("<a/href=https://evil.test>");
    expect(email.html).not.toContain('" onmouseover="');
    expect(email.html).toContain("&lt;img/src=x/onerror=alert(1)&gt;");
    expect(email.html).toContain("&lt;a/href=https://evil.test&gt;PIX&lt;/a&gt;");
    expect(email.html).toContain("&quot; onmouseover=&quot;");
  });

  it("mantém o texto puro legível sem entidades HTML", () => {
    const email = orderConfirmationEmail({
      orderId: "abc123",
      customerName: "Ana&João",
      total: 25,
      paymentMethod: "PIX",
    });

    expect(email.text).toContain("Olá, Ana&João!");
    expect(email.text).not.toContain("&amp;");
    expect(email.subject).toBe("Pedido #ABC123 recebido — INOVAPRO3D");
  });
});

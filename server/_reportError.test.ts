import { describe, expect, it } from "vitest";
import { buildErrorReport } from "./_reportError";

describe("buildErrorReport", () => {
  it("preserva o diagnóstico no documento e escapa a mensagem enviada ao Telegram", () => {
    const report = buildErrorReport({
      message: "<a/href=https://evil.test>Falha</a>",
      where: "checkout<script>alert(1)</script>",
      route: "/checkout?name=Ana&João",
      userEmail: "ana@example.com<b>admin</b>",
    });

    expect(report.valid).toBe(true);
    expect(report.data.message).toBe("<a/href=https://evil.test>Falha</a>");
    expect(report.telegramText).not.toContain("<a/href=https://evil.test>");
    expect(report.telegramText).not.toContain("<script>");
    expect(report.telegramText).toContain("&lt;a/href=https://evil.test&gt;Falha&lt;/a&gt;");
    expect(report.telegramText).toContain("Ana&amp;João");
  });

  it("rejeita relato sem mensagem ou observação", () => {
    expect(buildErrorReport({ where: "checkout" }).valid).toBe(false);
  });
});

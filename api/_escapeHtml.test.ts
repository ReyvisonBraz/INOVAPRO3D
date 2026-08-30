import { describe, expect, it } from "vitest";
import { escapeHtml, escapeHtmlTruncated } from "./_escapeHtml";

describe("escapeHtml", () => {
  it("escapa os cinco caracteres que alteram markup", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("neutraliza um link injetado sem espaços", () => {
    // `<a/href=...>` é a forma que contorna um filtro que só bloqueia espaços —
    // era assim que um nome de cliente virava link clicável no e-mail.
    expect(escapeHtml("<a/href=https://evil.com>Clique</a>")).not.toContain("<a");
  });

  it("escapa o & antes dos demais, sem gerar entidade dupla", () => {
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("trata null e undefined como string vazia", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("preserva texto comum, inclusive acentos e emoji", () => {
    expect(escapeHtml("Ana Paula — pedido 🎉")).toBe("Ana Paula — pedido 🎉");
  });
});

describe("escapeHtmlTruncated", () => {
  it("corta antes de escapar, para não partir uma entidade ao meio", () => {
    // Cortando depois do escape, "&amp;" viraria "&am" e quebraria a renderização.
    expect(escapeHtmlTruncated("&&&", 1)).toBe("&amp;");
  });

  it("respeita o limite sobre o texto visível", () => {
    expect(escapeHtmlTruncated("abcdef", 3)).toBe("abc");
  });
});

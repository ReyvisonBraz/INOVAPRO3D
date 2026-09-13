import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCspPolicy,
  CSP_HEADER_NAME,
  extractInlineScripts,
  findInlineEventHandlers,
  inlineScriptHashes,
  reportingEndpointsHeader,
} from "./cspPolicy";

describe("CSP policy", () => {
  it("extrai apenas scripts sem src e preserva whitespace", () => {
    const html = `<script>\n  primeiro();\n</script><script src="/app.js"></script><script>segundo()</script>`;

    expect(extractInlineScripts(html)).toEqual(["\n  primeiro();\n", "segundo()"]);
  });

  it("gera hashes SHA-256 no formato aceito pela CSP", () => {
    const script = "bootstrap()";
    const expected = createHash("sha256").update(script).digest("base64");

    expect(inlineScriptHashes(`<script>${script}</script>`)).toEqual([`'sha256-${expected}'`]);
  });

  it("remove unsafe-inline de script sem remover dos estilos React", () => {
    const policy = buildCspPolicy("<script>bootstrap()</script>");
    const scriptDirective = policy.split("; ").find((value) => value.startsWith("script-src "));

    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).toContain("report-uri /api/csp-report; report-to csp");
  });

  it("libera o CSS do prompt SendPulse, que as violações de produção apontaram", () => {
    const styleDirective = buildCspPolicy("<script>bootstrap()</script>")
      .split("; ")
      .find((value) => value.startsWith("style-src "));

    // Sem isto, ligar a política em enforce deixa o prompt de push sem
    // formatação — foram 28 violações de style-src-elem em produção.
    expect(styleDirective).toContain("https://web.webpushs.com");
  });

  it("não libera o beacon do Cloudflare Insights", () => {
    // Decisão do dono do projeto: a estatística não é usada. Fica registrado
    // em teste para que uma inclusão futura seja deliberada, não acidental.
    expect(buildCspPolicy("<script>bootstrap()</script>")).not.toContain("cloudflareinsights");
  });

  it("detecta handlers HTML que os hashes de script não autorizam", () => {
    expect(findInlineEventHandlers(`<link onload="ready()"><img ONERROR="fail()">`)).toEqual([
      "onload",
      "onerror",
    ]);
  });

  it("mantém o index real coberto por três hashes", () => {
    const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

    expect(inlineScriptHashes(html)).toHaveLength(3);
    expect(findInlineEventHandlers(html)).toEqual([]);
  });

  it("mantém a configuração versionada da Vercel sincronizada", () => {
    const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    const config = JSON.parse(
      readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"),
    ) as {
      headers: Array<{
        source: string;
        headers: Array<{ key: string; value: string }>;
      }>;
    };
    const globalHeaders = config.headers.find((entry) => entry.source === "/(.*)")?.headers;
    const policy = globalHeaders?.find((header) => header.key === CSP_HEADER_NAME)?.value;

    expect(policy).toBe(buildCspPolicy(html));
    // O par enforce + Report-Only com a MESMA política duplicaria cada
    // violação no coletor: em enforce, report-uri/report-to já relatam.
    expect(
      globalHeaders?.some((header) => header.key === "Content-Security-Policy-Report-Only"),
    ).toBe(false);
  });

  it("recusa endpoint de reporting sem HTTPS", () => {
    expect(() => reportingEndpointsHeader("http://example.test/report")).toThrow("HTTPS");
  });
});

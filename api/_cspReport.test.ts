import { describe, expect, it } from "vitest";
import {
  cspReportFingerprint,
  isTrustedCspDocument,
  parseCspReportPayload,
  sanitizeCspUrl,
  type CspReportSummary,
} from "./_cspReport";

describe("CSP report normalization", () => {
  it("normaliza o formato legado sem guardar query, hash ou política completa", () => {
    const reports = parseCspReportPayload({
      "csp-report": {
        "document-uri": "https://www.inovapro3d.com.br/produto/12345678?token=secret#tab",
        "blocked-uri":
          "https://cdn.example.com/users/550e8400-e29b-41d4-a716-446655440000/a.js?v=1",
        "effective-directive": "script-src-elem",
        "original-policy": "default-src 'none'; token=secret",
        disposition: "report",
        "status-code": 200,
      },
    });

    expect(reports).toEqual([
      {
        documentUri: "https://www.inovapro3d.com.br/produto/:id",
        blockedUri: "https://cdn.example.com/users/:id/a.js",
        effectiveDirective: "script-src-elem",
        sourceFile: null,
        disposition: "report",
        statusCode: 200,
        lineNumber: null,
        columnNumber: null,
      },
    ]);
    expect(JSON.stringify(reports)).not.toContain("original-policy");
    expect(JSON.stringify(reports)).not.toContain("secret");
  });

  it("normaliza lotes da Reporting API e ignora outros tipos", () => {
    const reports = parseCspReportPayload([
      {
        type: "csp-violation",
        body: {
          documentURL: "https://inovapro3d.com.br/checkout",
          blockedURL: "inline",
          effectiveDirective: "script-src-elem",
          sourceFile: "https://inovapro3d.com.br/assets/app.js?build=abc",
          disposition: "enforce",
          lineNumber: 42.9,
        },
      },
      { type: "network-error", body: {} },
    ]);

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      documentUri: "https://inovapro3d.com.br/checkout",
      blockedUri: "inline",
      sourceFile: "https://inovapro3d.com.br/assets/app.js",
      disposition: "enforce",
      lineNumber: 42,
    });
  });

  it("limita lotes a dez relatos", () => {
    const payload = Array.from({ length: 20 }, () => ({
      type: "csp-violation",
      body: { documentURL: "https://inovapro3d.com.br/" },
    }));

    expect(parseCspReportPayload(payload)).toHaveLength(10);
  });

  it("reduz esquemas especiais e descarta entradas arbitrárias", () => {
    expect(sanitizeCspUrl("data:text/javascript,alert(1)")).toBe("data:");
    expect(sanitizeCspUrl("blob:https://inovapro3d.com.br/id")).toBe("blob:");
    expect(sanitizeCspUrl("javascript:alert(1)")).toBe("unknown");
    expect(sanitizeCspUrl("texto livre com segredo")).toBe("unknown");
  });

  it("aceita apenas documentos dos domínios controlados", () => {
    const base = {
      documentUri: "https://inovapro3d-preview-abc.vercel.app/catalogo",
    } as CspReportSummary;

    expect(isTrustedCspDocument(base)).toBe(true);
    expect(isTrustedCspDocument({ ...base, documentUri: "https://attacker.example/" })).toBe(false);
    expect(
      isTrustedCspDocument({ ...base, documentUri: "http://localhost:4173/catalogo" }, [
        "localhost:4173",
      ]),
    ).toBe(true);
  });

  it("agrega caminhos diferentes do mesmo recurso na mesma impressão digital", () => {
    const first = parseCspReportPayload({
      "csp-report": {
        "document-uri": "https://inovapro3d.com.br/a",
        "blocked-uri": "https://cdn.example.com/assets/a.js",
        "effective-directive": "script-src-elem",
        disposition: "report",
      },
    })[0];
    const second = { ...first, blockedUri: "https://cdn.example.com/other/b.js" };

    expect(cspReportFingerprint(first)).toBe(cspReportFingerprint(second));
  });
});

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordCspReports } from "./_cspReportRecorder.js";
import handler from "./csp-report";

vi.mock("./_cspReportRecorder.js", () => ({
  recordCspReports: vi.fn(),
}));

interface MockResponse {
  bodyEnded: boolean;
  headers: Map<string, string>;
  statusCode: number;
}

function request(
  body: string,
  options: {
    contentLength?: number;
    contentType?: string;
    ip?: string;
    method?: string;
  } = {},
): VercelRequest {
  const headers: Record<string, string> = {};
  if (options.contentType !== null) {
    headers["content-type"] = options.contentType ?? "application/csp-report";
  }
  if (options.contentLength !== undefined) {
    headers["content-length"] = String(options.contentLength);
  }

  return {
    method: options.method ?? "POST",
    headers,
    socket: { remoteAddress: options.ip ?? "127.0.0.10" },
    async *[Symbol.asyncIterator]() {
      if (body) yield Buffer.from(body);
    },
  } as unknown as VercelRequest;
}

function response(): VercelResponse & MockResponse {
  const res: MockResponse & Partial<VercelResponse> = {
    bodyEnded: false,
    headers: new Map(),
    statusCode: 200,
    setHeader(name, value) {
      this.headers.set(name.toLowerCase(), String(value));
      return this as VercelResponse;
    },
    status(code) {
      this.statusCode = code;
      return this as VercelResponse;
    },
    end() {
      this.bodyEnded = true;
      return this as VercelResponse;
    },
  };
  return res as VercelResponse & MockResponse;
}

function legacyPayload(documentUri = "https://www.inovapro3d.com.br/catalogo"): string {
  return JSON.stringify({
    "csp-report": {
      "document-uri": documentUri,
      "blocked-uri": "inline",
      "effective-directive": "script-src-elem",
      disposition: "report",
    },
  });
}

describe("CSP report endpoint", () => {
  beforeEach(() => {
    vi.mocked(recordCspReports).mockReset();
  });

  it("recusa métodos e media types não suportados", async () => {
    const wrongMethod = response();
    await handler(request("", { method: "GET" }), wrongMethod);

    expect(wrongMethod.statusCode).toBe(405);
    expect(wrongMethod.headers.get("allow")).toBe("POST");
    expect(wrongMethod.headers.get("cache-control")).toBe("no-store");

    const wrongType = response();
    await handler(request("{}", { contentType: "text/plain", ip: "127.0.0.11" }), wrongType);
    expect(wrongType.statusCode).toBe(415);
  });

  it("recusa JSON malformado e corpos declarados acima de 32 KiB", async () => {
    const malformed = response();
    await handler(request("{", { ip: "127.0.0.12" }), malformed);
    expect(malformed.statusCode).toBe(400);

    const oversized = response();
    await handler(request("", { contentLength: 32 * 1024 + 1, ip: "127.0.0.13" }), oversized);
    expect(oversized.statusCode).toBe(413);
  });

  it("registra apenas relatos sanitizados de documentos confiáveis", async () => {
    const res = response();
    await handler(request(legacyPayload(), { ip: "127.0.0.14" }), res);

    expect(res.statusCode).toBe(204);
    expect(res.bodyEnded).toBe(true);
    expect(recordCspReports).toHaveBeenCalledOnce();
    expect(vi.mocked(recordCspReports).mock.calls[0][0][0]).toMatchObject({
      documentUri: "https://www.inovapro3d.com.br/catalogo",
      blockedUri: "inline",
      effectiveDirective: "script-src-elem",
    });
  });

  it("descarta silenciosamente relatos de documentos externos", async () => {
    const res = response();
    await handler(request(legacyPayload("https://attacker.example/"), { ip: "127.0.0.15" }), res);

    expect(res.statusCode).toBe(204);
    expect(recordCspReports).not.toHaveBeenCalled();
  });
});

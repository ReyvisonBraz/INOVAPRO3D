import { describe, expect, it } from "vitest";
import { resolveServerRuntime } from "./_serverRuntime";

describe("resolveServerRuntime", () => {
  it("usa produção quando NODE_ENV é explicitamente production", () => {
    expect(resolveServerRuntime({ nodeEnv: " production " })).toEqual({
      mode: "production",
      isProduction: true,
      source: "NODE_ENV=production",
      warnings: [],
    });
  });

  it("faz npm start prevalecer por meio de --serve-static", () => {
    expect(resolveServerRuntime({ args: ["--serve-static"], distExists: true })).toEqual({
      mode: "production",
      isProduction: true,
      source: "--serve-static",
      warnings: [],
    });
  });

  it("aceita SERVE_STATIC=true e alerta sobre NODE_ENV conflitante", () => {
    const runtime = resolveServerRuntime({
      nodeEnv: "development",
      serveStatic: "true",
    });

    expect(runtime.mode).toBe("production");
    expect(runtime.source).toBe("SERVE_STATIC=true");
    expect(runtime.warnings).toHaveLength(1);
    expect(runtime.warnings[0]).toContain("production prevalecerá");
  });

  it("assume desenvolvimento com aviso quando NODE_ENV está ausente", () => {
    const runtime = resolveServerRuntime({});

    expect(runtime.mode).toBe("development");
    expect(runtime.source).toBe("padrão seguro de desenvolvimento");
    expect(runtime.warnings[0]).toContain("NODE_ENV não definido");
  });

  it("avisa quando existe build que será ignorado em desenvolvimento", () => {
    const runtime = resolveServerRuntime({ nodeEnv: "development", distExists: true });

    expect(runtime.mode).toBe("development");
    expect(runtime.warnings).toEqual([
      "dist/index.html existe, mas não foi solicitado modo estático; o build será ignorado.",
    ]);
  });

  it("trata NODE_ENV=test como modo de desenvolvimento explícito", () => {
    const runtime = resolveServerRuntime({ nodeEnv: "test" });

    expect(runtime).toMatchObject({
      mode: "development",
      isProduction: false,
      source: "NODE_ENV=test",
    });
  });

  it("recusa NODE_ENV desconhecido", () => {
    expect(() => resolveServerRuntime({ nodeEnv: "staging" })).toThrow("NODE_ENV inválido");
  });

  it("recusa SERVE_STATIC ambíguo", () => {
    expect(() => resolveServerRuntime({ serveStatic: "yes" })).toThrow("SERVE_STATIC inválido");
  });

  it("recusa produção quando o build está ausente", () => {
    expect(() => resolveServerRuntime({ args: ["--serve-static"], distExists: false })).toThrow(
      "Execute npm run build",
    );
  });
});

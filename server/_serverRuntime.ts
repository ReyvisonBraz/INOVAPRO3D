export type ServerMode = "development" | "production";

export interface ServerRuntimeInput {
  nodeEnv?: string;
  serveStatic?: string;
  args?: readonly string[];
  distExists?: boolean;
}

export interface ServerRuntimeConfig {
  mode: ServerMode;
  isProduction: boolean;
  source: string;
  warnings: string[];
}

function normalizeNodeEnv(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "development" || normalized === "production" || normalized === "test") {
    return normalized;
  }
  throw new Error(`NODE_ENV inválido: "${normalized}". Use development, test ou production.`);
}

function parseServeStatic(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "false") return false;
  if (normalized === "true") return true;
  throw new Error(`SERVE_STATIC inválido: "${normalized}". Use true ou false.`);
}

/**
 * Decide como o servidor deve entregar o frontend sem depender de condições
 * espalhadas por `server.ts`. O pedido explícito para servir `dist/` prevalece
 * sobre NODE_ENV para que `npm start` nunca exponha o middleware de
 * desenvolvimento por acidente.
 */
export function resolveServerRuntime(input: ServerRuntimeInput): ServerRuntimeConfig {
  const nodeEnv = normalizeNodeEnv(input.nodeEnv);
  const staticFromCli = input.args?.includes("--serve-static") === true;
  const staticFromEnv = parseServeStatic(input.serveStatic);
  const staticRequested = staticFromCli || staticFromEnv;
  const warnings: string[] = [];

  if ((staticRequested || nodeEnv === "production") && input.distExists === false) {
    throw new Error(
      "dist/index.html ausente. Execute npm run build antes de iniciar o servidor em produção.",
    );
  }

  if (staticRequested) {
    if (nodeEnv && nodeEnv !== "production") {
      warnings.push(
        `Frontend estático solicitado com NODE_ENV=${nodeEnv}; o modo production prevalecerá.`,
      );
    }
    return {
      mode: "production",
      isProduction: true,
      source: staticFromCli ? "--serve-static" : "SERVE_STATIC=true",
      warnings,
    };
  }

  if (nodeEnv === "production") {
    return {
      mode: "production",
      isProduction: true,
      source: "NODE_ENV=production",
      warnings,
    };
  }

  if (!nodeEnv) {
    warnings.push(
      "NODE_ENV não definido; iniciando Vite em desenvolvimento. Use npm start para servir dist/.",
    );
  }
  if (input.distExists) {
    warnings.push(
      "dist/index.html existe, mas não foi solicitado modo estático; o build será ignorado.",
    );
  }

  return {
    mode: "development",
    isProduction: false,
    source: nodeEnv ? `NODE_ENV=${nodeEnv}` : "padrão seguro de desenvolvimento",
    warnings,
  };
}

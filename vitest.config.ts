import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Funções puras: ambiente node basta (sem jsdom nesta etapa).
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "api/**/*.test.ts"],
  },
});

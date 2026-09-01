import { defineConfig } from "vitest/config";

// Configuração separada porque esta suíte precisa do emulador do Firestore
// (Java + jar baixado). `npm run check` continua determinístico e sem
// dependência externa; as regras rodam por `npm run test:rules`.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/rules/**/*.test.ts"],
    // O emulador sobe uma vez; testes em paralelo disputariam o mesmo banco.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});

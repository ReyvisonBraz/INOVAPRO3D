import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/", ".vercel/", "node_modules/", "*.config.js", "*.config.ts"] },
  {
    files: [
      "src/**/*.{ts,tsx}",
      "api/**/*.ts",
      "server/**/*.ts",
      "shared/**/*.ts",
      "scripts/**/*.ts",
      "tests/**/*.ts",
      "server.ts",
    ],
    extends: [...tseslint.configs.recommended],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "warn",
      // Sincronizar estado a partir de localStorage/props ao montar é um
      // padrão legítimo usado em vários pontos; a regra nova é opinativa
      // demais para virar erro aqui.
      "react-hooks/set-state-in-effect": "warn",
      // O código usa `any` de forma pontual e consciente (payloads Firestore,
      // dados externos). Aviso em vez de erro para não travar o fluxo.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  eslintConfigPrettier,
);

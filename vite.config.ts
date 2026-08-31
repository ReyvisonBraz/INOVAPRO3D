import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "non-blocking-app-css",
        enforce: "post",
        transformIndexHtml: {
          order: "post",
          handler(html, context) {
            if (!context.bundle) return html;
            return html.replace(
              /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
              '<link id="inova-app-styles" rel="preload" as="style" crossorigin href="$1"><noscript><link rel="stylesheet" crossorigin href="$1"></noscript>',
            );
          },
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        react: path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== "true",
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            // Helpers minúsculos usados pelo app eager: se caírem nos chunks
            // pesados (3d/charts), o entry passa a importá-los estaticamente
            // e o code-splitting desses chunks deixa de funcionar.
            if (
              id.includes("vite/preload-helper") ||
              id.includes("node_modules/clsx") ||
              id.includes("node_modules/zustand") ||
              id.includes("node_modules/@babel/runtime") ||
              id.includes("node_modules/use-sync-external-store")
            )
              return "vendor-react";
            if (id.includes("node_modules/three") || id.includes("node_modules/@react-three"))
              return "vendor-3d";
            if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-"))
              return "vendor-charts";
            if (id.includes("node_modules/framer-motion")) return "vendor-motion";
            // Storage isolado: só o admin faz upload, então não entra no chunk eager.
            if (id.includes("firebase/storage") || id.includes("@firebase/storage"))
              return "vendor-fb-storage";
            if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase"))
              return "vendor-firebase";
            if (
              id.includes("node_modules/react") ||
              id.includes("node_modules/react-dom") ||
              id.includes("node_modules/react-router")
            )
              return "vendor-react";
          },
        },
      },
    },
  };
});

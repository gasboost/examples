import { gasboost } from "@gasboost/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ command, mode }) => {
  const { build, dev } = gasboost({ entry: "src/backend/main.ts" });

  if (mode === "server") {
    return {
      plugins: [build],
      build: { outDir: "dist", emptyOutDir: false },
    };
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      viteSingleFile(),
      ...(command === "serve" ? [dev] : []),
    ],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src/frontend", import.meta.url)) },
    },
    build: { outDir: "dist", emptyOutDir: true },
  };
});

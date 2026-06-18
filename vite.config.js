import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cp } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-example-data",
      async closeBundle() {
        await cp("example_data", "dist/example_data", { recursive: true });
      },
    },
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
});

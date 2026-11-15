import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    // Pupil workbooks are test data, not source: watching them crashes Vite on Windows
    // when Excel or Explorer holds a lock (EBUSY).
    watch: {
      ignored: ["**/example_data/**", "**/example_folder_klassenleraar/**"],
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
});

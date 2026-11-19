import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Tauri erwartet einen festen Port (siehe src-tauri/tauri.conf.json → build.devUrl).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});

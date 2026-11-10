import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the build works under GitHub Pages' /<repo-name>/ path.
  base: "./",
  server: {
    port: 3002,
    strictPort: true,
    host: "127.0.0.1",
  },
});

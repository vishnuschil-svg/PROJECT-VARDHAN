import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget = process.env.VARDHAN_BACKEND_TARGET || "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },
    },
    watch: {
      ignored: [
        "**/artifacts/**",
        "**/playwright/**",
        "**/validation-browser-profile-*/**",
        "**/test-results/**",
      ],
    },
  },
  optimizeDeps: {
    exclude: ["chrome"],
  },
});

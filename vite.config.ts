import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    // Served under /web/ behind nginx on the VM; dev server stays at root.
    base: mode === "production" ? "/web/" : "/",
    plugins: [react()],
    server: {
      proxy: env.VITE_PROXY_TARGET
        ? {
            "/api": {
              target: env.VITE_PROXY_TARGET,
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
    },
  };
});

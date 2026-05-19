import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_PROXY_TARGET ?? "http://localhost:8000";
  const enableProxy = env.VITE_DEV_PROXY === "1" || mode === "test";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      allowedHosts: ["abridgeai.hcmut.app", "abridgeai.tech"],
      hmr: {
        host: "abridgeai.hcmut.app",
        protocol: "wss",
        clientPort: 443,
      },
      proxy: enableProxy
        ? {
            "/api/v1": { target: proxyTarget, changeOrigin: true },
            "/healthz": { target: proxyTarget, changeOrigin: true },
            "/readyz": { target: proxyTarget, changeOrigin: true },
          }
        : undefined,
    },
  };
});

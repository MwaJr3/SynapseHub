import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", port: 5181, strictPort: true,
    allowedHosts: [".e2b.app", "localhost", "127.0.0.1"],
    proxy: Object.fromEntries(
      ["/api", "/docs", "/openapi.json"].map((path) => [
        path, { target: process.env.VITE_API_TARGET || "http://127.0.0.1:8018", changeOrigin: false },
      ]),
    ),
  },
  preview: { host: "0.0.0.0", port: 5181, allowedHosts: [".e2b.app", "localhost"] },
})

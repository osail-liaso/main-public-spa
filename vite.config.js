import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ImportMetaEnvPlugin from "@import-meta-env/unplugin";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    cors: true,
    strictPort: true,
    headers: {
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },

  plugins: [
    vue(),
    ImportMetaEnvPlugin.vite({
      example: ".env.example",
    }),
  ],

  resolve: {
    alias: [{ find: "@", replacement: "/src" }],
    dedupe: ["vue"],
  },
});

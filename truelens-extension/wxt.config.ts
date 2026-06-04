import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  srcDir: "src",
  imports: false,
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  autoIcons: {
    baseIconPath: "assets/icon.png",
    sizes: [16, 32, 48, 128],
    developmentIndicator: "overlay",
  },
  manifest: {
    name: "TrueLens",
    description:
      "AI-powered browser extension to verify content authenticity. Analyze selected text for AI-generated content and fact-check claims instantly.",
    version: "1.0.0",
    permissions: ["activeTab", "storage"],
    host_permissions: ["*://*/*"],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }),
});

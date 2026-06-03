import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  srcDir: "src",
  imports: false, // Disable auto-imports to avoid conflicts with React's import system
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  autoIcons: {
    baseIconPath: "assets/icon.png", // relative to srcDir
    sizes: [16, 32, 48, 128],
    developmentIndicator: "overlay", // or "grayscale" or false
  },
  manifest: {
    name: "Gray Matter",
    description:
      "AI-powered browser extension for neurodivergent users. Simplifies layouts, rewrites complex text, adjusts colors, and reduces distractions.",
    version: "1.0.0",
    permissions: [
      "activeTab",
      "scripting",
      "storage",
      "unlimitedStorage",
      "tabs",
    ],
    // icons: {
    //   "16": "/icon/16.png",
    //   "32": "/icon/32.png",
    //   "48": "/icon/48.png",
    //   "128": "/icon/128.png",
    // },
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

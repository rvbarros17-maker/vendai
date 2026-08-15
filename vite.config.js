import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Vendaí",
        short_name: "Vendaí",
        description: "Vendas simples, com ou sem internet",
        theme_color: "#0F5C56",
        background_color: "#F7F1E6",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell (HTML/CSS/JS) fica em cache = abre offline sempre.
        // Os dados (Firestore) já ficam offline por conta própria via
        // persistentLocalCache configurado em src/js/firebase.js.
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
});

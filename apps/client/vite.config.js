import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            manifest: {
                name: "Coffee Shop Inventory",
                short_name: "Inventory",
                description: "Inventory for coffee shop and storage",
                theme_color: "#1a1a1a",
                background_color: "#1a1a1a",
                display: "standalone",
                orientation: "portrait",
            },
            workbox: { globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"] },
        }),
    ],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    server: {
        port: 5173,
        host: true, // listen on 0.0.0.0 so you can open the app from your phone on the same Wi‑Fi
        proxy: { "/api": { target: "http://localhost:3000", changeOrigin: true } },
    },
});

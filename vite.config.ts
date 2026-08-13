import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "three",
              test: /node_modules[\\/]three(?:[\\/]|-stdlib)/,
              maxSize: 450_000,
              priority: 2,
            },
            {
              name: "react-three",
              test: /node_modules[\\/]@react-three[\\/]/,
            },
            {
              name: "react",
              test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
            },
            {
              name: "base-ui",
              test: /node_modules[\\/]@base-ui[\\/]/,
            },
          ],
        },
      },
    },
  },
});

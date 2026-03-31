import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  root: "src/examples",
  build: {
    outDir: "../../docs",
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        main: resolve(__dirname, "src/examples/index.html"),
        simple: resolve(__dirname, "src/examples/simple.html"),
      },
    },
  },
  base: "./",
});

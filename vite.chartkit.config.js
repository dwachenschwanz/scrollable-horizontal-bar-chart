import { resolve } from "node:path";
import { copyFile } from "node:fs/promises";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "copy-chartkit-css",
      async closeBundle() {
        await copyFile(
          resolve(__dirname, "src/shared/chart-resize.css"),
          resolve(__dirname, "dist/chartkit/chart-resize.css"),
        );
      },
    },
  ],
  build: {
    emptyOutDir: true,
    lib: {
      entry: {
        "demo-controls": resolve(__dirname, "src/chartkit/demo-controls.js"),
        index: resolve(__dirname, "src/chartkit/index.js"),
      },
      formats: ["es"],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    outDir: "dist/chartkit",
    rollupOptions: {
      external: ["highcharts"],
      output: {
        chunkFileNames: "chunks/[name].js",
      },
    },
  },
});

import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
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

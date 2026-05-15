import { defineConfig } from "vite";

export default defineConfig({
  base: "/uncertainty-range-comparison/",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/highcharts")) {
            return "highcharts";
          }
        },
      },
    },
  },
});

import { defineConfig } from "vite";

export default defineConfig({
  base: "/scrollable-horizontal-bar-chart/",
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

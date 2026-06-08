import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  testDir: "./test/browser",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm run dev:bar",
      reuseExistingServer: true,
      timeout: 30_000,
      url: "http://127.0.0.1:5173/scrollable-horizontal-bar-chart/",
    },
    {
      command: "npm run dev:uncertainty",
      reuseExistingServer: true,
      timeout: 30_000,
      url: "http://127.0.0.1:5174/uncertainty-range-comparison/",
    },
  ],
});

import { access } from "node:fs/promises";

const publicApi = await import("../dist/chartkit/index.js");
const demoControlsApi = await import("../dist/chartkit/demo-controls.js");
const packagePublicApi = await import("scrollable-horizontal-bar-chart");
const packageDemoControlsApi = await import("scrollable-horizontal-bar-chart/demo-controls");

await access(new URL("../dist/chartkit/chart-resize.css", import.meta.url));

const requiredPublicExports = [
  "createBarChartViewModel",
  "createChartHeightResizeControls",
  "createUncertaintyChartViewModel",
  "mountBarChart",
  "mountUncertaintyChart",
];
const requiredDemoExports = [
  "createAxisFormatControls",
  "createChartWindowControls",
  "createControlTabs",
  "createDataTableControls",
  "createFloatingSidebarController",
];

for (const exportName of requiredPublicExports) {
  if (typeof publicApi[exportName] !== "function") {
    throw new Error(`Missing chartkit export: ${exportName}`);
  }
  if (typeof packagePublicApi[exportName] !== "function") {
    throw new Error(`Missing package chartkit export: ${exportName}`);
  }
}

for (const exportName of requiredDemoExports) {
  if (typeof demoControlsApi[exportName] !== "function") {
    throw new Error(`Missing demo controls export: ${exportName}`);
  }
  if (typeof packageDemoControlsApi[exportName] !== "function") {
    throw new Error(`Missing package demo controls export: ${exportName}`);
  }
}

console.log("chartkit package smoke test passed");

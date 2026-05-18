const publicApi = await import("../dist/chartkit/index.js");
const demoControlsApi = await import("../dist/chartkit/demo-controls.js");

const requiredPublicExports = [
  "createBarChartViewModel",
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
}

for (const exportName of requiredDemoExports) {
  if (typeof demoControlsApi[exportName] !== "function") {
    throw new Error(`Missing demo controls export: ${exportName}`);
  }
}

console.log("chartkit package smoke test passed");

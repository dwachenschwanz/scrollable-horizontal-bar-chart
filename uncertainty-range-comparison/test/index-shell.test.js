import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("index shell keeps expected default selected options", () => {
  assert.match(
    indexHtml,
    /<option value="5" selected>5<\/option>/,
    "Bars per page should default to 5"
  );
  assert.match(
    indexHtml,
    /<option value="horizontal" selected>Horizontal<\/option>/,
    "Orientation should default to horizontal"
  );
  assert.match(
    indexHtml,
    /<option value="baseDesc" selected>Base high to low<\/option>/,
    "Sort should default to base high to low"
  );
  assert.match(
    indexHtml,
    /<option value="compact" selected>Compact<\/option>/,
    "Notation should default to compact"
  );
  assert.match(
    indexHtml,
    /<option value="currency" selected>Currency<\/option>/,
    "Style should default to currency"
  );
});

test("index shell keeps expected default checked controls", () => {
  assert.match(
    indexHtml,
    /<input type="checkbox" id="toggleLabels" checked \/>/,
    "Show base labels should be checked"
  );
  assert.match(
    indexHtml,
    /<input type="checkbox" id="showDataTableCheckbox" checked \/>/,
    "Show input table should be checked"
  );
  assert.match(
    indexHtml,
    /<input type="checkbox" id="toggleMean" checked \/>/,
    "Plot mean marker should be checked"
  );
  assert.match(
    indexHtml,
    /<input type="checkbox" id="autoScaleCheckbox" checked \/>/,
    "Auto-scale Axis should be checked"
  );
  assert.match(
    indexHtml,
    /<input type="checkbox" id="xAxisGroupingCheckbox" checked \/>/,
    "Use Grouping should be checked"
  );
  assert.match(
    indexHtml,
    /<input type="checkbox" id="expandUnassignedCheckbox" \/>/,
    "Expand Unassigned should be unchecked"
  );
});

test("index shell includes analysis filter controls", () => {
  assert.match(indexHtml, /id="tab-analysis"/);
  assert.match(indexHtml, /aria-controls="panel-analysis"/);
  assert.match(indexHtml, /data-tab-target="analysis"/);
  assert.match(indexHtml, /id="panel-analysis"/);
  assert.match(indexHtml, /data-tab-panel="analysis"/);
  assert.match(indexHtml, /<section\s+class="filter-builder"/);
  assert.match(indexHtml, /class="filter-builder-heading"/);
  assert.match(indexHtml, />\s*Filters\s*<\/h2>/);
  assert.match(indexHtml, />\s*Add\s*<\/span>/);
  assert.match(indexHtml, />\s*Filter 1\s*<\/h2>/);
  assert.match(indexHtml, />\s*Filter 2\s*<\/h2>/);
  assert.match(indexHtml, /data-filter-card/);
  assert.match(indexHtml, /data-filter-add/);
  assert.match(indexHtml, /data-filter-remove/);
  assert.doesNotMatch(indexHtml, />\s*Advanced Filter\s*<\/button>/);
  assert.doesNotMatch(indexHtml, />\s*Categorical\s*<\/span>/);
  assert.doesNotMatch(indexHtml, />\s*Numerical\s*<\/span>/);
  assert.doesNotMatch(indexHtml, /type="radio"/);
  assert.doesNotMatch(indexHtml, />\s*All\s*<\/button>/);
  assert.doesNotMatch(indexHtml, />\s*Invert\s*<\/button>/);
  assert.match(indexHtml, /class="analysis-action-row"/);
  assert.match(indexHtml, />\s*Apply\s*<\/button>/);
  assert.match(indexHtml, /id="resetAnalysisButton"/);
  assert.match(indexHtml, />\s*Reset\s*<\/button>/);
  assert.match(indexHtml, /for="groupBySelector"/);
  assert.match(indexHtml, /id="groupBySelector"/);
  assert.match(indexHtml, /for="expandUnassignedCheckbox"/);
  assert.match(indexHtml, /id="expandUnassignedCheckbox"/);
  assert.match(indexHtml, /for="colorBySelector"/);
  assert.match(indexHtml, /id="colorBySelector"/);
  assert.match(indexHtml, /<option value="low">Low<\/option>/);
  assert.match(indexHtml, /<option value="base">Base<\/option>/);
  assert.match(indexHtml, /<option value="high">High<\/option>/);
  assert.match(indexHtml, /<option value="mean">Mean<\/option>/);
  assert.match(indexHtml, /<option value="spread">Spread<\/option>/);
});

test("index shell includes uncertainty input table", () => {
  assert.doesNotMatch(indexHtml, /<h2>Inputs<\/h2>/);
  assert.match(indexHtml, /<th scope="col">Portfolio Elements<\/th>/);
  assert.match(indexHtml, />\s*Low\s*<\/button>/);
  assert.match(indexHtml, />\s*Base\s*<\/button>/);
  assert.match(indexHtml, />\s*High\s*<\/button>/);
  assert.match(indexHtml, />\s*Mean\s*<\/button>/);
  assert.match(indexHtml, />\s*Spread\s*<\/button>/);
  assert.match(indexHtml, /data-table-sort="low"/);
  assert.match(indexHtml, /data-table-sort="base"/);
  assert.match(indexHtml, /data-table-sort="high"/);
  assert.match(indexHtml, /data-table-sort="mean"/);
  assert.match(indexHtml, /data-table-sort="spread"/);
  assert.doesNotMatch(indexHtml, /id="addRowButton"/);
  assert.doesNotMatch(indexHtml, /id="normalizeRowsButton"/);
  assert.doesNotMatch(indexHtml, /<span class="sr-only">Actions<\/span>/);
});

test("index shell includes formatted axis bound readouts", () => {
  assert.match(indexHtml, /id="yMinFormattedValue"/);
  assert.match(indexHtml, /for="yMinInput"/);
  assert.match(indexHtml, /id="yMaxFormattedValue"/);
  assert.match(indexHtml, /for="yMaxInput"/);
});

test("index shell includes collapsible controls sidebar affordance", () => {
  assert.match(indexHtml, /<div class="workspace" id="workspace">/);
  assert.match(indexHtml, /class="controls-sidebar"/);
  assert.match(indexHtml, /id="controlsSidebar"/);
  assert.match(indexHtml, /class="sidebar-header"/);
  assert.match(indexHtml, /id="sidebarDragHandle"/);
  assert.match(indexHtml, /aria-label="Drag controls panel"/);
  assert.match(indexHtml, /class="sidebar-control-icon"/);
  assert.match(indexHtml, /aria-label="Drag controls"/);
  assert.match(indexHtml, /title="Drag controls"/);
  assert.doesNotMatch(indexHtml, /class="sidebar-grip"/);
  assert.doesNotMatch(indexHtml, /class="sidebar-title">Controls<\/span>/);
  assert.match(indexHtml, /id="sidebarToggle"/);
  assert.match(indexHtml, /aria-label="Collapse controls"/);
  assert.match(indexHtml, /aria-controls="controlsContent"/);
  assert.match(indexHtml, /class="sidebar-toggle-icon"/);
  assert.match(indexHtml, /<path d="m15 6-6 6 6 6" \/>/);
  assert.doesNotMatch(indexHtml, /id="sidebarToggleIcon" aria-hidden="true">&gt;<\/span>/);
  assert.match(indexHtml, /id="controlsContent"/);
});

test("index shell tucks layout tuning controls into advanced display controls", () => {
  assert.match(indexHtml, /<details class="advanced-controls" id="advancedDisplayControls">/);
  assert.match(indexHtml, /<summary>Advanced<\/summary>/);
  assert.match(indexHtml, /id="orientationSelector"/);
  assert.match(indexHtml, /id="leftMarginSlider"/);
  assert.match(indexHtml, /id="barHeightSlider"/);
  assert.match(indexHtml, /id="chartHeightSlider"/);
});

test("index shell includes chart resize handle", () => {
  assert.match(indexHtml, /class="chart-resize-handle"/);
  assert.match(indexHtml, /id="chartResizeHandle"/);
  assert.match(indexHtml, /role="separator"/);
  assert.match(indexHtml, /aria-label="Resize chart"/);
  assert.match(indexHtml, /aria-controls="container"/);
  assert.match(indexHtml, /aria-valuemin="300"/);
  assert.match(indexHtml, /aria-valuemax="720"/);
});

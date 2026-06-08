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
    /<option value="valueDesc" selected>Value ↓<\/option>/,
    "Sort should default to value descending"
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
    "Show values in bars should be checked"
  );
  assert.match(
    indexHtml,
    /<input type="checkbox" id="showDataTableCheckbox" checked \/>/,
    "Show data table should be checked"
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
    /<input type="checkbox" id="expandUnassignedCheckbox" checked \/>/,
    "Expand Unassigned should be checked"
  );
});

test("index shell includes analysis filter controls", () => {
  assert.match(indexHtml, /id="tab-analysis"/);
  assert.match(indexHtml, /aria-controls="panel-analysis"/);
  assert.match(indexHtml, /data-tab-target="analysis"/);
  assert.match(indexHtml, /id="panel-analysis"/);
  assert.match(indexHtml, /data-tab-panel="analysis"/);
  assert.match(indexHtml, /<section class="filter-builder"/);
  assert.match(indexHtml, /class="filter-builder-heading"/);
  assert.match(indexHtml, />\s*Filters\s*<\/h2>/);
  assert.match(indexHtml, />\s*Add\s*<\/span>/);
  assert.match(indexHtml, />\s*Filter 1\s*<\/h2>/);
  assert.match(indexHtml, />\s*Filter 2\s*<\/h2>/);
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
  assert.match(indexHtml, /<option value="value">Value<\/option>/);
});

test("index shell includes currency validation status element", () => {
  assert.match(
    indexHtml,
    /<span\s+id="xAxisCurrencyStatus"\s+class="field-status"\s+aria-live="polite"\s*><\/span>/,
    "Currency status element should exist for inline validation"
  );
});

test("index shell includes formatted axis bound readouts", () => {
  assert.match(indexHtml, /id="yMinFormattedValue"/);
  assert.match(indexHtml, /for="yMinInput"/);
  assert.match(indexHtml, /id="yMaxFormattedValue"/);
  assert.match(indexHtml, /for="yMaxInput"/);
});

test("index shell includes draggable collapsible controls overlay", () => {
  assert.match(indexHtml, /<div class="workspace" id="workspace">/);
  assert.match(indexHtml, /class="controls-sidebar"/);
  assert.match(indexHtml, /id="controlsSidebar"/);
  assert.match(indexHtml, /class="sidebar-header"/);
  assert.match(indexHtml, /id="sidebarDragHandle"/);
  assert.match(indexHtml, /aria-label="Drag controls panel"/);
  assert.match(indexHtml, /id="sidebarToggle"/);
  assert.match(indexHtml, /aria-label="Collapse controls"/);
  assert.match(indexHtml, /id="controlsContent"/);
});

test("index shell tucks layout tuning controls into advanced display controls", () => {
  assert.match(indexHtml, /<details class="advanced-controls" id="advancedDisplayControls">/);
  assert.match(indexHtml, /<summary>Advanced<\/summary>/);
  assert.match(indexHtml, /id="leftMarginSlider"/);
  assert.match(indexHtml, /id="barHeightSlider"/);
  assert.match(indexHtml, /id="chartHeightSlider"/);
});

test("index shell includes sortable data table headers", () => {
  assert.match(indexHtml, /data-table-sort="name"/);
  assert.match(indexHtml, /data-table-sort="value"/);
  assert.match(indexHtml, />\s*Category\s*<\/button>/);
  assert.match(indexHtml, />\s*Value\s*<\/button>/);
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

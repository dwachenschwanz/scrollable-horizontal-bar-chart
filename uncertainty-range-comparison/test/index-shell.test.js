import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("index shell keeps expected default selected options", () => {
  assert.match(
    indexHtml,
    /<option value="capitalPlan" selected>Capital Plan<\/option>/,
    "Dataset should default to Capital Plan"
  );
  assert.match(
    indexHtml,
    /<option value="5" selected>5<\/option>/,
    "Bars per page should default to 5"
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
});

test("index shell includes uncertainty input table", () => {
  assert.match(indexHtml, /<th scope="col">Low<\/th>/);
  assert.match(indexHtml, /<th scope="col">Base<\/th>/);
  assert.match(indexHtml, /<th scope="col">High<\/th>/);
  assert.match(indexHtml, /<th scope="col">Mean<\/th>/);
  assert.doesNotMatch(indexHtml, /id="addRowButton"/);
  assert.doesNotMatch(indexHtml, /id="normalizeRowsButton"/);
  assert.doesNotMatch(indexHtml, /<span class="sr-only">Actions<\/span>/);
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

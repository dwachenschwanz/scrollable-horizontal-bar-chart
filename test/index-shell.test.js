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
});

test("index shell includes currency validation status element", () => {
  assert.match(
    indexHtml,
    /<span\s+id="xAxisCurrencyStatus"\s+class="field-status"\s+aria-live="polite"\s*><\/span>/,
    "Currency status element should exist for inline validation"
  );
});

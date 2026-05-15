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
  assert.match(indexHtml, /id="normalizeRowsButton"/);
});

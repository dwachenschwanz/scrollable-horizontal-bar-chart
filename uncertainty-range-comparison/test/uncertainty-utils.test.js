import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { extractCompareUncertaintyDatasets } from "../src/uncertainty-datasets.js";
import {
  buildSlice,
  calculateUncertaintyMean,
  getAutoScaleBounds,
  getHorizontalCategoryLabelWidth,
  getPointPadding,
  isValidCurrencyCode,
  normalizeUncertaintyValues,
  sanitizeAxisBounds,
  sanitizeCurrencyCode,
  sortRows,
  toAxisRange,
  toAxisValue,
} from "../src/uncertainty-utils.js";

const compareUncertaintySource = JSON.parse(
  readFileSync(
    new URL("../src/actionMenu/compareUncertainty.json", import.meta.url),
    "utf8"
  )
);

test("extractCompareUncertaintyDatasets loads built-in JSON datasets", () => {
  const sourceDatasets = compareUncertaintySource.data.data.data;
  const datasets = extractCompareUncertaintyDatasets(compareUncertaintySource);

  assert.equal(datasets.length, sourceDatasets.length);
  assert.deepEqual(
    datasets.map((dataset) => dataset.name),
    sourceDatasets.map((dataset) => dataset.name)
  );
  assert.match(datasets[0].key, /^[a-z0-9-]+$/);
  assert.equal(datasets[0].rows.length, sourceDatasets[0].mainRows.length);
  assert.deepEqual(Object.keys(datasets[0].rows[0]).sort(), [
    "base",
    "high",
    "low",
    "name",
  ]);
});

test("normalizeUncertaintyValues orders low and high and clamps base", () => {
  assert.deepEqual(normalizeUncertaintyValues("30", "40", "10"), {
    base: 30,
    baseRaw: 40,
    baseWasClamped: true,
    high: 30,
    highRaw: 10,
    low: 10,
    lowRaw: 30,
    lowHighWereSwapped: true,
    mean: 25,
    spread: 20,
  });
});

test("calculateUncertaintyMean applies the low/base/high weighting", () => {
  assert.equal(calculateUncertaintyMean(10, 25, 40), 25);
  assert.equal(calculateUncertaintyMean(-10, 10, 30), 10);
});

test("sortRows sorts by base descending with natural name tiebreaker", () => {
  const rows = [
    { sourceIndex: 0, name: "Case 10", low: 0, base: 5, high: 8 },
    { sourceIndex: 1, name: "Case 2", low: 0, base: 5, high: 9 },
    { sourceIndex: 2, name: "Case 1", low: 0, base: 10, high: 12 },
  ];

  const sorted = sortRows(rows, "baseDesc");

  assert.deepEqual(
    sorted.map((item) => item.name),
    ["Case 1", "Case 2", "Case 10"]
  );
});

test("sortRows sorts by uncertainty spread", () => {
  const rows = [
    { sourceIndex: 0, name: "A", low: 0, base: 5, high: 30 },
    { sourceIndex: 1, name: "B", low: 0, base: 5, high: 10 },
    { sourceIndex: 2, name: "C", low: -10, base: 0, high: 10 },
  ];

  const sorted = sortRows(rows, "spreadAsc");

  assert.deepEqual(
    sorted.map((item) => item.name),
    ["B", "C", "A"]
  );
});

test("sortRows sorts by low, high, and mean values", () => {
  const rows = [
    { sourceIndex: 0, name: "A", low: 10, base: 20, high: 30 },
    { sourceIndex: 1, name: "B", low: 0, base: 10, high: 50 },
    { sourceIndex: 2, name: "C", low: 5, base: 5, high: 20 },
  ];

  assert.deepEqual(
    sortRows(rows, "lowAsc").map((item) => item.name),
    ["B", "C", "A"]
  );
  assert.deepEqual(
    sortRows(rows, "highDesc").map((item) => item.name),
    ["B", "A", "C"]
  );
  assert.deepEqual(
    sortRows(rows, "meanAsc").map((item) => item.name),
    ["C", "B", "A"]
  );
});

test("buildSlice pads missing rows with empty placeholders", () => {
  const slice = buildSlice(
    [
      { sourceIndex: 0, name: "A", low: 0, base: 10, high: 20 },
      { sourceIndex: 1, name: "B", low: 0, base: 20, high: 30 },
    ],
    1,
    3
  );

  assert.deepEqual(slice.categories, ["B", "\u00A0", "\u00A0"]);
  assert.equal(slice.rows[1].base, 0);
  assert.equal(slice.rows[1].mean, 0);
  assert.equal(slice.rows[2].color, "rgba(0, 0, 0, 0.05)");
});

test("getAutoScaleBounds includes low, base, mean, and high values", () => {
  assert.deepEqual(
    getAutoScaleBounds([
      { low: -4, base: 5, high: 18 },
      { low: 6, base: 12, high: 44 },
    ]),
    { min: -10, max: 50 }
  );
});

test("sanitizeAxisBounds swaps reversed min and max with fallback", () => {
  assert.deepEqual(sanitizeAxisBounds("50", "10", { min: 0, max: 100 }), {
    min: 10,
    max: 50,
  });
  assert.deepEqual(sanitizeAxisBounds("", "", { min: -5, max: 5 }), {
    min: -5,
    max: 5,
  });
});

test("axis value helpers clip values into the visible axis", () => {
  assert.equal(toAxisValue(40, 10, 30), 20);
  assert.equal(toAxisRange(-10, 50, 0, 30), 30);
});

test("sanitizeCurrencyCode uppercases valid currencies and falls back invalid ones", () => {
  assert.equal(sanitizeCurrencyCode("usd", "EUR"), "USD");
  assert.equal(sanitizeCurrencyCode("zzz", "EUR"), "EUR");
});

test("isValidCurrencyCode rejects malformed codes", () => {
  assert.equal(isValidCurrencyCode("US"), false);
  assert.equal(isValidCurrencyCode("12$"), false);
});

test("getHorizontalCategoryLabelWidth enforces a minimum width", () => {
  assert.equal(getHorizontalCategoryLabelWidth("120"), 104);
  assert.equal(getHorizontalCategoryLabelWidth("40"), 48);
});

test("getPointPadding derives the expected series padding", () => {
  assert.equal(getPointPadding("0.75"), 0.125);
  assert.equal(getPointPadding("1.0"), 0);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSlice,
  getAutoScaleBounds,
  getHorizontalCategoryLabelWidth,
  getPointPadding,
  isValidCurrencyCode,
  sanitizeAxisBounds,
  sanitizeCurrencyCode,
  sortPairs,
} from "../src/chart-utils.js";

test("sortPairs sorts value ascending with name tiebreaker", () => {
  const pairs = [
    { index: 0, name: "Category 10", y: 5 },
    { index: 1, name: "Category 2", y: 5 },
    { index: 2, name: "Category 1", y: 1 },
  ];

  const sorted = sortPairs(pairs, "valueAsc");

  assert.deepEqual(
    sorted.map((item) => item.name),
    ["Category 1", "Category 2", "Category 10"]
  );
});

test("sortPairs uses natural ordering for name ascending", () => {
  const pairs = [
    { index: 0, name: "Category 10", y: 5 },
    { index: 1, name: "Category 2", y: 4 },
    { index: 2, name: "Category 1", y: 3 },
  ];

  const sorted = sortPairs(pairs, "nameAsc");

  assert.deepEqual(
    sorted.map((item) => item.name),
    ["Category 1", "Category 2", "Category 10"]
  );
});

test("buildSlice pads missing rows with empty placeholders", () => {
  const slice = buildSlice(
    [
      { index: 0, name: "A", y: 10 },
      { index: 1, name: "B", y: 20 },
    ],
    1,
    3
  );

  assert.deepEqual(slice.categories, ["B", "\u00A0", "\u00A0"]);
  assert.equal(slice.data[1].y, 0);
  assert.equal(slice.data[2].color, "rgba(0, 0, 0, 0.05)");
});

test("sanitizeAxisBounds swaps reversed min and max", () => {
  assert.deepEqual(sanitizeAxisBounds("50", "10"), { min: 10, max: 50 });
});

test("getAutoScaleBounds rounds outward to tens", () => {
  assert.deepEqual(getAutoScaleBounds([3, 18, 44]), { min: 0, max: 50 });
  assert.deepEqual(getAutoScaleBounds([-3, 18, 44]), { min: -10, max: 50 });
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
  assert.equal(getHorizontalCategoryLabelWidth("100"), 84);
  assert.equal(getHorizontalCategoryLabelWidth("40"), 48);
});

test("getPointPadding derives the expected series padding", () => {
  assert.equal(getPointPadding("0.75"), 0.125);
  assert.equal(getPointPadding("1.0"), 0);
});

import {
  EMPTY_BAR_COLOR,
  buildWindowSlice,
  clampValue,
  compareNamesNatural,
  getHorizontalCategoryLabelWidth,
  getNiceMagnitude,
  getPointPadding,
  isValidCurrencyCode,
  parseNumericInput,
  sanitizeCurrencyCode,
} from "../../src/shared/chart-core.js";

export {
  clampValue,
  compareNamesNatural,
  getHorizontalCategoryLabelWidth,
  getPointPadding,
  isValidCurrencyCode,
  parseNumericInput,
  sanitizeCurrencyCode,
};

export function calculateUncertaintyMean(low, base, high) {
  return 0.25 * low + 0.5 * base + 0.25 * high;
}

export function normalizeUncertaintyValues(lowValue, baseValue, highValue) {
  const lowRaw = parseNumericInput(lowValue);
  const baseRaw = parseNumericInput(baseValue);
  const highRaw = parseNumericInput(highValue);
  const low = Math.min(lowRaw, highRaw);
  const high = Math.max(lowRaw, highRaw);
  const base = clampValue(baseRaw, low, high);
  const mean = calculateUncertaintyMean(low, base, high);

  return {
    base,
    baseRaw,
    baseWasClamped: base !== baseRaw,
    high,
    highRaw,
    low,
    lowRaw,
    lowHighWereSwapped: lowRaw > highRaw,
    mean,
    spread: high - low,
  };
}

export function getUncertaintySpread(row) {
  return row.high - row.low;
}

export function sortRows(rows, sortMode) {
  const nextRows = rows.slice();
  const byNameAsc = (a, b) =>
    compareNamesNatural(a.name, b.name) || a.sourceIndex - b.sourceIndex;
  const byNameDesc = (a, b) =>
    compareNamesNatural(b.name, a.name) || a.sourceIndex - b.sourceIndex;
  const getNumericSortValue = (row, field) => {
    if (field === "mean") {
      return row.mean ?? calculateUncertaintyMean(row.low, row.base, row.high);
    }

    if (field === "spread") {
      return row.spread ?? getUncertaintySpread(row);
    }

    return row[field];
  };
  const byNumericAsc = (field) => (a, b) =>
    getNumericSortValue(a, field) - getNumericSortValue(b, field) ||
    byNameAsc(a, b);
  const byNumericDesc = (field) => (a, b) =>
    getNumericSortValue(b, field) - getNumericSortValue(a, field) ||
    byNameAsc(a, b);

  switch (sortMode) {
    case "lowAsc":
      nextRows.sort(byNumericAsc("low"));
      break;
    case "lowDesc":
      nextRows.sort(byNumericDesc("low"));
      break;
    case "baseAsc":
      nextRows.sort(byNumericAsc("base"));
      break;
    case "baseDesc":
      nextRows.sort(byNumericDesc("base"));
      break;
    case "highAsc":
      nextRows.sort(byNumericAsc("high"));
      break;
    case "highDesc":
      nextRows.sort(byNumericDesc("high"));
      break;
    case "meanAsc":
      nextRows.sort(byNumericAsc("mean"));
      break;
    case "meanDesc":
      nextRows.sort(byNumericDesc("mean"));
      break;
    case "spreadAsc":
      nextRows.sort(byNumericAsc("spread"));
      break;
    case "spreadDesc":
      nextRows.sort(byNumericDesc("spread"));
      break;
    case "nameAsc":
      nextRows.sort(byNameAsc);
      break;
    case "nameDesc":
      nextRows.sort(byNameDesc);
      break;
    default:
      break;
  }

  return nextRows;
}

export function buildSlice(sortedRows, currentStart, windowSize) {
  const slice = buildWindowSlice(sortedRows, currentStart, windowSize, {
    base: 0,
    color: EMPTY_BAR_COLOR,
    empty: true,
    high: 0,
    low: 0,
    mean: 0,
    name: "",
    spread: 0,
  });

  return {
    categories: slice.map((item) => item.name || "\u00A0"),
    rows: slice,
  };
}

export function getAutoScaleBounds(rows) {
  const values = rows.flatMap((row) => [
    row.low,
    row.base,
    row.mean ?? calculateUncertaintyMean(row.low, row.base, row.high),
    row.high,
  ]);

  if (values.length === 0) {
    return { min: 0, max: 100 };
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (minValue === maxValue) {
    const padding = Math.max(Math.abs(minValue) * 0.1, 1);
    return {
      min: minValue - padding,
      max: maxValue + padding,
    };
  }

  const padding = Math.max((maxValue - minValue) * 0.08, 1);
  const step = getNiceMagnitude(maxValue - minValue + padding * 2);
  const min = Math.floor((minValue - padding) / step) * step;
  const max = Math.ceil((maxValue + padding) / step) * step;

  return { min, max };
}

export function sanitizeAxisBounds(rawMin, rawMax, fallbackBounds) {
  let min = Number.parseFloat(rawMin);
  let max = Number.parseFloat(rawMax);

  min = Number.isFinite(min) ? min : fallbackBounds.min;
  max = Number.isFinite(max) ? max : fallbackBounds.max;

  if (min === max) {
    max = min + 1;
  }

  if (min > max) {
    return { min: max, max: min };
  }

  return { min, max };
}

export function toAxisValue(value, axisMin, axisMax) {
  return clampValue(value, axisMin, axisMax) - axisMin;
}

export function toAxisRange(low, high, axisMin, axisMax) {
  const clippedLow = clampValue(low, axisMin, axisMax);
  const clippedHigh = clampValue(high, axisMin, axisMax);
  return Math.max(0, clippedHigh - clippedLow);
}

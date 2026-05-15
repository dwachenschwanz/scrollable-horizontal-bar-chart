const EMPTY_BAR_COLOR = "rgba(0, 0, 0, 0.05)";

export function compareNamesNatural(a, b) {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function parseNumericInput(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

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
  const byBaseAsc = (a, b) => a.base - b.base || byNameAsc(a, b);
  const byBaseDesc = (a, b) => b.base - a.base || byNameAsc(a, b);
  const bySpreadAsc = (a, b) =>
    getUncertaintySpread(a) - getUncertaintySpread(b) || byNameAsc(a, b);
  const bySpreadDesc = (a, b) =>
    getUncertaintySpread(b) - getUncertaintySpread(a) || byNameAsc(a, b);

  switch (sortMode) {
    case "baseAsc":
      nextRows.sort(byBaseAsc);
      break;
    case "baseDesc":
      nextRows.sort(byBaseDesc);
      break;
    case "spreadAsc":
      nextRows.sort(bySpreadAsc);
      break;
    case "spreadDesc":
      nextRows.sort(bySpreadDesc);
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
  const slice = [];

  for (let index = 0; index < windowSize; index += 1) {
    slice.push(
      sortedRows[currentStart + index] ?? {
        base: 0,
        color: EMPTY_BAR_COLOR,
        empty: true,
        high: 0,
        low: 0,
        mean: 0,
        name: "",
        spread: 0,
      }
    );
  }

  return {
    categories: slice.map((item) => item.name || "\u00A0"),
    rows: slice,
  };
}

function getNiceMagnitude(range) {
  if (!(range > 0)) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(range));
  const magnitude = 10 ** exponent;
  const normalized = range / magnitude;

  if (normalized <= 2) {
    return magnitude / 5;
  }

  if (normalized <= 5) {
    return magnitude / 2;
  }

  return magnitude;
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

export function isValidCurrencyCode(code) {
  const normalized = code.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    return false;
  }

  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("currency").includes(normalized);
  }

  try {
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalized,
    });
    return true;
  } catch {
    return false;
  }
}

export function sanitizeCurrencyCode(code, fallbackCurrency) {
  const normalized = code.trim().toUpperCase();
  return isValidCurrencyCode(normalized) ? normalized : fallbackCurrency;
}

export function getHorizontalCategoryLabelWidth(leftMargin) {
  return Math.max(48, Number.parseInt(leftMargin, 10) - 16);
}

export function getPointPadding(barHeight) {
  return 1 - Number.parseFloat(barHeight) / 2 - 0.5;
}

export function toAxisValue(value, axisMin, axisMax) {
  return clampValue(value, axisMin, axisMax) - axisMin;
}

export function toAxisRange(low, high, axisMin, axisMax) {
  const clippedLow = clampValue(low, axisMin, axisMax);
  const clippedHigh = clampValue(high, axisMin, axisMax);
  return Math.max(0, clippedHigh - clippedLow);
}

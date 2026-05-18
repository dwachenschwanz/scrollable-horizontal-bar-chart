import { createUncertaintyChartOptions } from "./uncertainty-chart-controller.js";
import {
  EMPTY_BAR_COLOR,
  buildWindowSlice,
  clampValue,
  compareNamesNatural,
  getNiceMagnitude,
  parseNumericInput,
} from "../shared/chart-core.js";

const DEFAULT_UNCERTAINTY_COLOR = "#2caffe";

/**
 * @typedef {Object} NumberFormatter
 * @property {(value: number) => string} format
 */

/**
 * @typedef {"horizontal" | "vertical"} ChartOrientation
 */

/**
 * @typedef {"lowAsc" | "lowDesc" | "baseAsc" | "baseDesc" | "highAsc" | "highDesc" | "meanAsc" | "meanDesc" | "spreadAsc" | "spreadDesc" | "nameAsc" | "nameDesc" | string} UncertaintySortMode
 */

/**
 * @typedef {Object} AxisBounds
 * @property {number} min
 * @property {number} max
 */

/**
 * @typedef {Object} RawUncertaintyRow
 * @property {string=} id
 * @property {string} name
 * @property {string|number} low
 * @property {string|number} base
 * @property {string|number} high
 */

/**
 * @typedef {RawUncertaintyRow & Object} NormalizedUncertaintyRow
 * @property {number} sourceIndex
 * @property {number} low
 * @property {number} base
 * @property {number} high
 * @property {number} mean
 * @property {number} spread
 * @property {number} lowRaw
 * @property {number} baseRaw
 * @property {number} highRaw
 * @property {boolean} lowHighWereSwapped
 * @property {boolean} baseWasClamped
 */

/**
 * @typedef {Object} UncertaintySlice
 * @property {string[]} categories
 * @property {NormalizedUncertaintyRow[]} rows
 */

/**
 * @typedef {Object} VisibleUncertaintyRow
 * @property {number} index
 * @property {NormalizedUncertaintyRow} row
 * @property {boolean=} empty
 * @property {string=} color
 * @property {string=} formattedLow
 * @property {string=} formattedBase
 * @property {string=} formattedHigh
 * @property {string=} formattedMean
 * @property {string=} formattedSpread
 */

/**
 * @typedef {Object} UncertaintyChartSettings
 * @property {boolean} autoScale
 * @property {string|number} barHeight
 * @property {string|number} chartHeight
 * @property {string=} color
 * @property {number} currentStart
 * @property {string|number} leftMargin
 * @property {ChartOrientation} orientation
 * @property {boolean} showLabels
 * @property {boolean} showMean
 * @property {UncertaintySortMode} sort
 * @property {number} windowSize
 * @property {string|number} yMax
 * @property {string|number} yMin
 */

/**
 * @typedef {Object} UncertaintyChartFormatters
 * @property {NumberFormatter} markerFormatter
 * @property {NumberFormatter} rangeFormatter
 * @property {NumberFormatter} valueAxisFormatter
 */

/**
 * @typedef {Object} UncertaintyChartViewModelInput
 * @property {UncertaintyChartFormatters} formatters
 * @property {RawUncertaintyRow[]} rows
 * @property {UncertaintyChartSettings} settings
 */

/**
 * @typedef {Object} UncertaintyChartViewModel
 * @property {AxisBounds} autoBounds
 * @property {AxisBounds} axisBounds
 * @property {Object} chartOptions
 * @property {NormalizedUncertaintyRow[]} normalizedRows
 * @property {UncertaintySlice} slice
 * @property {NormalizedUncertaintyRow[]} sortedRows
 * @property {VisibleUncertaintyRow[]} visibleRows
 */

/**
 * @param {number} low
 * @param {number} base
 * @param {number} high
 * @returns {number}
 */
export function calculateUncertaintyMean(low, base, high) {
  return 0.25 * low + 0.5 * base + 0.25 * high;
}

/**
 * @param {string|number} lowValue
 * @param {string|number} baseValue
 * @param {string|number} highValue
 * @returns {Omit<NormalizedUncertaintyRow, "id"|"name"|"sourceIndex">}
 */
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

/**
 * @param {RawUncertaintyRow[]} rows
 * @returns {NormalizedUncertaintyRow[]}
 */
export function normalizeUncertaintyRows(rows) {
  return rows.map((row, sourceIndex) => {
    const normalized = normalizeUncertaintyValues(row.low, row.base, row.high);
    return {
      ...row,
      ...normalized,
      name: row.name.trim() || `Bar ${sourceIndex + 1}`,
      sourceIndex,
    };
  });
}

/**
 * @param {{low: number, high: number}} row
 * @returns {number}
 */
export function getUncertaintySpread(row) {
  return row.high - row.low;
}

/**
 * @param {NormalizedUncertaintyRow[]} rows
 * @param {UncertaintySortMode} sortMode
 * @returns {NormalizedUncertaintyRow[]}
 */
export function sortUncertaintyRows(rows, sortMode) {
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

/**
 * @param {NormalizedUncertaintyRow[]} sortedRows
 * @param {number} currentStart
 * @param {number} windowSize
 * @returns {UncertaintySlice}
 */
export function buildUncertaintySlice(sortedRows, currentStart, windowSize) {
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

/**
 * @param {NormalizedUncertaintyRow[]} rows
 * @returns {AxisBounds}
 */
export function getUncertaintyAutoScaleBounds(rows) {
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

/**
 * @param {string|number} rawMin
 * @param {string|number} rawMax
 * @param {AxisBounds} fallbackBounds
 * @returns {AxisBounds}
 */
export function sanitizeUncertaintyAxisBounds(rawMin, rawMax, fallbackBounds) {
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

/**
 * @param {Object} input
 * @param {string=} input.color
 * @param {NumberFormatter} input.markerFormatter
 * @param {NumberFormatter} input.rangeFormatter
 * @param {UncertaintySlice} input.slice
 * @returns {VisibleUncertaintyRow[]}
 */
export function createVisibleUncertaintyRows({
  color = DEFAULT_UNCERTAINTY_COLOR,
  markerFormatter,
  rangeFormatter,
  slice,
}) {
  return slice.rows.map((row, index) => {
    if (row.empty) {
      return {
        empty: true,
        index,
        row,
      };
    }

    return {
      color,
      formattedBase: markerFormatter.format(row.base),
      formattedHigh: markerFormatter.format(row.high),
      formattedLow: markerFormatter.format(row.low),
      formattedMean: markerFormatter.format(row.mean),
      formattedSpread: rangeFormatter.format(row.spread),
      index,
      row,
    };
  });
}

/**
 * Builds all framework-neutral data needed to render or update an uncertainty
 * range chart.
 *
 * Angular can call this from an input setter or signal/computed value, then pass
 * `chartOptions` to `mountUncertaintyChart().update(...)`.
 *
 * @param {UncertaintyChartViewModelInput} input
 * @returns {UncertaintyChartViewModel}
 */
export function createUncertaintyChartViewModel({
  formatters,
  rows,
  settings,
}) {
  const normalizedRows = normalizeUncertaintyRows(rows);
  const sortedRows = sortUncertaintyRows(normalizedRows, settings.sort);
  const slice = buildUncertaintySlice(
    sortedRows,
    settings.currentStart,
    settings.windowSize
  );
  const autoBounds = getUncertaintyAutoScaleBounds(normalizedRows);
  const axisBounds = settings.autoScale
    ? autoBounds
    : sanitizeUncertaintyAxisBounds(settings.yMin, settings.yMax, autoBounds);
  const visibleRows = createVisibleUncertaintyRows({
    color: settings.color ?? DEFAULT_UNCERTAINTY_COLOR,
    markerFormatter: formatters.markerFormatter,
    rangeFormatter: formatters.rangeFormatter,
    slice,
  });
  const chartOptions = createUncertaintyChartOptions({
    axisBounds,
    barHeight: settings.barHeight,
    chartHeight: settings.chartHeight,
    leftMargin: settings.leftMargin,
    orientation: settings.orientation,
    rows: visibleRows,
    showLabels: settings.showLabels,
    showMean: settings.showMean,
    slice,
    valueAxisFormatter: formatters.valueAxisFormatter,
  });

  return {
    autoBounds,
    axisBounds,
    chartOptions,
    normalizedRows,
    slice,
    sortedRows,
    visibleRows,
  };
}

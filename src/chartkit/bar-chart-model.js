import { createBarCategoryAxisOptions, createBarChartOptions } from "./bar-chart-controller.js";
import {
  EMPTY_BAR_COLOR,
  buildWindowSlice,
  compareNamesNatural,
} from "../shared/chart-core.js";

/**
 * @typedef {Object} NumberFormatter
 * @property {(value: number) => string} format
 */

/**
 * @typedef {"horizontal" | "vertical"} ChartOrientation
 */

/**
 * @typedef {"valueAsc" | "valueDesc" | "nameAsc" | "nameDesc" | string} BarSortMode
 */

/**
 * @typedef {Object} AxisBounds
 * @property {number|null} min
 * @property {number|null} max
 */

/**
 * @typedef {Object} BarPair
 * @property {number} index
 * @property {string} name
 * @property {number} y
 * @property {string=} color
 */

/**
 * @typedef {Object} BarSlice
 * @property {string[]} categories
 * @property {BarPair[]} data
 */

/**
 * @typedef {Object} BarChartSettings
 * @property {boolean} autoScale
 * @property {string|number} barHeight
 * @property {string|number} chartHeight
 * @property {number} currentStart
 * @property {string|number} leftMargin
 * @property {ChartOrientation} orientation
 * @property {boolean} showLabels
 * @property {BarSortMode} sort
 * @property {number} windowSize
 * @property {string|number} yMax
 * @property {string|number} yMin
 */

/**
 * @typedef {Object} BarChartFormatters
 * @property {NumberFormatter|null} barValueFormatter
 * @property {NumberFormatter} valueAxisFormatter
 */

/**
 * @typedef {Object} BarChartViewModelInput
 * @property {string[]} categories
 * @property {number[]} data
 * @property {BarChartFormatters} formatters
 * @property {BarChartSettings} settings
 */

/**
 * @typedef {Object} BarChartViewModel
 * @property {AxisBounds} axisBounds
 * @property {Object} categoryAxisOptions
 * @property {Object} chartOptions
 * @property {BarPair[]} pairs
 * @property {BarSlice} slice
 * @property {BarPair[]} sortedPairs
 */

/**
 * @param {BarPair[]} pairs
 * @param {BarSortMode} sortMode
 * @returns {BarPair[]}
 */
export function sortBarPairs(pairs, sortMode) {
  const nextPairs = pairs.slice();
  const byNameAsc = (a, b) =>
    compareNamesNatural(a.name, b.name) || a.index - b.index;
  const byNameDesc = (a, b) =>
    compareNamesNatural(b.name, a.name) || a.index - b.index;

  switch (sortMode) {
    case "valueAsc":
      nextPairs.sort((a, b) => a.y - b.y || byNameAsc(a, b));
      break;
    case "valueDesc":
      nextPairs.sort((a, b) => b.y - a.y || byNameAsc(a, b));
      break;
    case "nameAsc":
      nextPairs.sort((a, b) => byNameAsc(a, b) || a.y - b.y);
      break;
    case "nameDesc":
      nextPairs.sort((a, b) => byNameDesc(a, b) || a.y - b.y);
      break;
    default:
      break;
  }

  return nextPairs;
}

/**
 * @param {BarPair[]} sortedPairs
 * @param {number} currentStart
 * @param {number} windowSize
 * @returns {BarSlice}
 */
export function buildBarSlice(sortedPairs, currentStart, windowSize) {
  const slice = buildWindowSlice(sortedPairs, currentStart, windowSize, {
    name: "",
    y: 0,
    color: EMPTY_BAR_COLOR,
  });

  return {
    categories: slice.map((item) => item.name || "\u00A0"),
    data: slice,
  };
}

/**
 * @param {string|number} rawMin
 * @param {string|number} rawMax
 * @returns {AxisBounds}
 */
export function sanitizeBarAxisBounds(rawMin, rawMax) {
  let min = Number.parseFloat(rawMin);
  let max = Number.parseFloat(rawMax);

  min = Number.isNaN(min) ? null : min;
  max = Number.isNaN(max) ? null : max;

  if (min !== null && max !== null && min > max) {
    return { min: max, max: min };
  }

  return { min, max };
}

/**
 * @param {number[]} dataset
 * @returns {{min: number, max: number}}
 */
export function getBarAutoScaleBounds(dataset) {
  const maxValue = Math.max(...dataset);
  const minValue = Math.min(...dataset);
  const roundedMin = Math.floor(minValue / 10) * 10;
  const maxMagnitude =
    maxValue > 0 ? 10 ** Math.floor(Math.log10(maxValue)) : 10;

  return {
    min: Math.min(0, roundedMin),
    max: Math.ceil(maxValue / maxMagnitude) * maxMagnitude,
  };
}

/**
 * Builds all framework-neutral data needed to render or update a bar chart.
 *
 * Angular can call this from an input setter or signal/computed value, then pass
 * `chartOptions` to `mountBarChart().update(...)`.
 *
 * @param {BarChartViewModelInput} input
 * @returns {BarChartViewModel}
 */
export function createBarChartViewModel({
  categories,
  data,
  formatters,
  settings,
}) {
  const pairs = categories.map((name, index) => ({
    index,
    name,
    y: data[index],
  }));
  const sortedPairs = sortBarPairs(pairs, settings.sort);
  const slice = buildBarSlice(
    sortedPairs,
    settings.currentStart,
    settings.windowSize
  );
  const axisBounds = settings.autoScale
    ? getBarAutoScaleBounds(data)
    : sanitizeBarAxisBounds(settings.yMin, settings.yMax);
  const categoryAxisOptions = createBarCategoryAxisOptions({
    categories: slice.categories,
    leftMargin: settings.leftMargin,
    orientation: settings.orientation,
  });
  const chartOptions = createBarChartOptions({
    axisBounds,
    barHeight: settings.barHeight,
    barValueFormatter: formatters.barValueFormatter,
    chartHeight: settings.chartHeight,
    leftMargin: settings.leftMargin,
    orientation: settings.orientation,
    showLabels: settings.showLabels,
    slice,
    valueAxisFormatter: formatters.valueAxisFormatter,
  });

  return {
    axisBounds,
    categoryAxisOptions,
    chartOptions,
    pairs,
    slice,
    sortedPairs,
  };
}

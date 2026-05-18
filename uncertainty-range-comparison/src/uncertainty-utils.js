import { clampValue } from "../../src/chartkit/demo-controls.js";

export {
  clampValue,
  compareNamesNatural,
  getHorizontalCategoryLabelWidth,
  getPointPadding,
  isValidCurrencyCode,
  parseNumericInput,
  sanitizeCurrencyCode,
} from "../../src/chartkit/demo-controls.js";
export {
  calculateUncertaintyMean,
  normalizeUncertaintyValues,
} from "../../src/chartkit/index.js";
export {
  buildUncertaintySlice as buildSlice,
  getUncertaintyAutoScaleBounds as getAutoScaleBounds,
  sanitizeUncertaintyAxisBounds as sanitizeAxisBounds,
  sortUncertaintyRows as sortRows,
} from "../../src/chartkit/index.js";

export function toAxisValue(value, axisMin, axisMax) {
  return clampValue(value, axisMin, axisMax) - axisMin;
}

export function toAxisRange(low, high, axisMin, axisMax) {
  const clippedLow = clampValue(low, axisMin, axisMax);
  const clippedHigh = clampValue(high, axisMin, axisMax);
  return Math.max(0, clippedHigh - clippedLow);
}

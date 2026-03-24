const EMPTY_BAR_COLOR = "rgba(0, 0, 0, 0.05)";

export function compareNamesNatural(a, b) {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortPairs(pairs, sortMode) {
  const nextPairs = pairs.slice();
  const byNameAsc = (a, b) => compareNamesNatural(a.name, b.name) || a.index - b.index;
  const byNameDesc = (a, b) => compareNamesNatural(b.name, a.name) || a.index - b.index;

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

export function buildSlice(sortedPairs, currentStart, windowSize) {
  const slice = [];

  for (let index = 0; index < windowSize; index += 1) {
    slice.push(
      sortedPairs[currentStart + index] ?? {
        name: "",
        y: 0,
        color: EMPTY_BAR_COLOR,
      }
    );
  }

  return {
    categories: slice.map((item) => item.name || "\u00A0"),
    data: slice,
  };
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

export function sanitizeAxisBounds(rawMin, rawMax) {
  let min = Number.parseFloat(rawMin);
  let max = Number.parseFloat(rawMax);

  min = Number.isNaN(min) ? null : min;
  max = Number.isNaN(max) ? null : max;

  if (min !== null && max !== null && min > max) {
    return { min: max, max: min };
  }

  return { min, max };
}

export function getAutoScaleBounds(dataset) {
  const maxValue = Math.max(...dataset);
  const minValue = Math.min(...dataset);

  return {
    min: Math.floor(minValue / 10) * 10,
    max: Math.ceil(maxValue / 10) * 10,
  };
}

export function getHorizontalCategoryLabelWidth(leftMargin) {
  return Math.max(48, Number.parseInt(leftMargin, 10) - 16);
}

export function getPointPadding(barHeight) {
  return 1 - Number.parseFloat(barHeight) / 2 - 0.5;
}

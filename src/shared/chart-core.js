export const EMPTY_BAR_COLOR = "rgba(0, 0, 0, 0.05)";

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

export function buildWindowSlice(items, currentStart, windowSize, emptyItem) {
  const slice = [];

  for (let index = 0; index < windowSize; index += 1) {
    slice.push(items[currentStart + index] ?? { ...emptyItem });
  }

  return slice;
}

export function getNiceMagnitude(range) {
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

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getAbridgedAxisLabelMarkup(label, width) {
  const escapedLabel = escapeHtml(label);

  return `<span class="chart-axis-label" title="${escapedLabel}" aria-label="${escapedLabel}" style="width:${width}px">${escapedLabel}</span>`;
}

export function createScrollableCategoryAxisOptions({
  categories,
  extraOptions = {},
  leftMargin,
  orientation,
}) {
  const isVertical = orientation === "vertical";
  const categoryLabelWidth = getHorizontalCategoryLabelWidth(leftMargin);

  return {
    categories,
    labels: isVertical
      ? {}
      : {
          reserveSpace: false,
          useHTML: true,
          x: -8,
          formatter() {
            const label = typeof this.value === "string" ? this.value : "";
            return getAbridgedAxisLabelMarkup(label, categoryLabelWidth);
          },
        },
    reversed: !isVertical,
    scrollbar: {
      enabled: true,
    },
    ...extraOptions,
  };
}

export function createSafeNumberFormatter(
  formatterCache,
  locale,
  options,
  fallbackOptions = {}
) {
  const cacheKey = JSON.stringify({
    fallbackOptions,
    locale: locale ?? "",
    options,
  });
  if (formatterCache.has(cacheKey)) {
    return formatterCache.get(cacheKey);
  }

  let formatter;
  try {
    formatter = new Intl.NumberFormat(locale, options);
  } catch (error) {
    console.warn(
      "Invalid Intl.NumberFormat options, using safe defaults instead.",
      error
    );
    formatter = new Intl.NumberFormat(undefined, fallbackOptions);
  }

  formatterCache.set(cacheKey, formatter);
  return formatter;
}

export function debounce(callback, delay) {
  let timeoutId = null;

  return (...args) => {
    globalThis.clearTimeout(timeoutId);
    timeoutId = globalThis.setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

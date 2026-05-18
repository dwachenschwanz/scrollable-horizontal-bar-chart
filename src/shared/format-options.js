import {
  createSafeNumberFormatter,
  sanitizeCurrencyCode,
} from "./chart-core.js";

export function getSanitizedFormatCurrency(settings, fallbackCurrency) {
  return sanitizeCurrencyCode(settings.currency, fallbackCurrency);
}

export function createValueAxisFormatter({
  fallbackCurrency,
  formatterCache,
  settings,
}) {
  const locale = settings.locale.trim() || undefined;
  const maximumFractionDigits = Number.parseInt(
    settings.fractionDigits,
    10
  );
  const options = {
    notation: settings.notation,
    style: settings.style,
    useGrouping: settings.useGrouping,
  };

  if (!Number.isNaN(maximumFractionDigits)) {
    options.maximumFractionDigits = Math.min(
      6,
      Math.max(0, maximumFractionDigits)
    );
  }

  if (settings.style === "currency") {
    options.currency = getSanitizedFormatCurrency(settings, fallbackCurrency);
    options.currencyDisplay = "symbol";
  }

  return createSafeNumberFormatter(
    formatterCache,
    locale,
    options,
    {
      notation: "standard",
      style: settings.style === "currency" ? "currency" : "decimal",
      ...(settings.style === "currency"
        ? {
            currency: fallbackCurrency,
            currencyDisplay: "symbol",
          }
        : {}),
    }
  );
}

export function createStandardCurrencyFormatter({
  fallbackCurrency,
  formatterCache,
  settings,
}) {
  if (settings.style !== "currency") {
    return null;
  }

  const locale = settings.locale.trim() || undefined;
  const maximumFractionDigits = Number.parseInt(
    settings.fractionDigits,
    10
  );
  const options = {
    currency: getSanitizedFormatCurrency(settings, fallbackCurrency),
    currencyDisplay: "symbol",
    notation: "standard",
    style: "currency",
    useGrouping: settings.useGrouping,
  };

  if (!Number.isNaN(maximumFractionDigits)) {
    options.maximumFractionDigits = Math.min(
      6,
      Math.max(0, maximumFractionDigits)
    );
  }

  return createSafeNumberFormatter(
    formatterCache,
    locale,
    options,
    {
      currency: fallbackCurrency,
      currencyDisplay: "symbol",
      notation: "standard",
      style: "currency",
      useGrouping: settings.useGrouping,
    }
  );
}

import { isValidCurrencyCode } from "./chart-core.js";
import {
  createStandardCurrencyFormatter,
  createValueAxisFormatter,
  getSanitizedFormatCurrency,
} from "./format-options.js";

export function createAxisFormatControls({
  elements,
  fallbackCurrency,
  formatterCache,
}) {
  function getFormatSettings() {
    return {
      currency: elements.xAxisCurrencyInput.value,
      fractionDigits: elements.xAxisFractionDigitsInput.value,
      locale: elements.xAxisLocaleInput.value,
      notation: elements.xAxisNotationSelect.value,
      style: elements.xAxisStyleSelect.value,
      useGrouping: elements.xAxisGroupingCheckbox.checked,
    };
  }

  function getSanitizedCurrencyCode() {
    return getSanitizedFormatCurrency(getFormatSettings(), fallbackCurrency);
  }

  function getValueAxisFormatter() {
    return createValueAxisFormatter({
      fallbackCurrency,
      formatterCache,
      settings: getFormatSettings(),
    });
  }

  function getStandardCurrencyFormatter() {
    return createStandardCurrencyFormatter({
      fallbackCurrency,
      formatterCache,
      settings: getFormatSettings(),
    });
  }

  function getFormatRenderKeyParts() {
    return [
      elements.xAxisLocaleInput.value.trim(),
      elements.xAxisNotationSelect.value,
      elements.xAxisStyleSelect.value,
      getSanitizedCurrencyCode(),
      elements.xAxisFractionDigitsInput.value,
      elements.xAxisGroupingCheckbox.checked,
    ];
  }

  function updateYAxisInputState() {
    const disabled = elements.autoScaleCheckbox.checked;
    const opacity = disabled ? "0.3" : "1";

    elements.yMinInput.disabled = disabled;
    elements.yMaxInput.disabled = disabled;
    elements.yMinInput.style.opacity = opacity;
    elements.yMaxInput.style.opacity = opacity;
    elements.yMinInput.parentElement.style.opacity = opacity;
    elements.yMaxInput.parentElement.style.opacity = opacity;
  }

  function updateAxisBoundDisplays({ min, max }) {
    const formatter = getValueAxisFormatter();
    const formatBound = (value) =>
      typeof value === "number" ? formatter.format(value) : "";

    elements.yMinFormattedValue.textContent = formatBound(min);
    elements.yMaxFormattedValue.textContent = formatBound(max);
  }

  function updateCurrencyValidationState() {
    if (elements.xAxisStyleSelect.value !== "currency") {
      return;
    }

    const rawCurrency = elements.xAxisCurrencyInput.value.trim();
    const isValid = isValidCurrencyCode(rawCurrency);

    elements.xAxisCurrencyInput.classList.toggle("is-invalid", !isValid);
    elements.xAxisCurrencyStatus.textContent = isValid
      ? ""
      : `Invalid currency code. Using ${fallbackCurrency}.`;
  }

  function updateCurrencyInputState() {
    const disabled = elements.xAxisStyleSelect.value !== "currency";
    const opacity = disabled ? "0.5" : "1";

    elements.xAxisCurrencyInput.disabled = disabled;
    elements.xAxisCurrencyInput.style.opacity = opacity;
    elements.xAxisCurrencyInput.parentElement.style.opacity = opacity;
    elements.xAxisCurrencyStatus.style.opacity = opacity;

    if (disabled) {
      elements.xAxisCurrencyInput.classList.remove("is-invalid");
      elements.xAxisCurrencyStatus.textContent = "";
    } else {
      updateCurrencyValidationState();
    }
  }

  function normalizeCurrencyInput() {
    elements.xAxisCurrencyInput.value =
      elements.xAxisCurrencyInput.value.toUpperCase();
  }

  function bindFormatEvents({ onFormatInput, onFormatRender }) {
    elements.xAxisLocaleInput.addEventListener("input", onFormatInput);
    elements.xAxisNotationSelect.addEventListener("change", onFormatRender);
    elements.xAxisStyleSelect.addEventListener("change", () => {
      updateCurrencyInputState();
      onFormatRender();
    });
    elements.xAxisCurrencyInput.addEventListener("input", () => {
      normalizeCurrencyInput();
      updateCurrencyValidationState();
      onFormatInput();
    });
    elements.xAxisFractionDigitsInput.addEventListener("input", onFormatInput);
    elements.xAxisGroupingCheckbox.addEventListener("change", onFormatRender);
  }

  return {
    bindFormatEvents,
    getFormatRenderKeyParts,
    getFormatSettings,
    getSanitizedCurrencyCode,
    getStandardCurrencyFormatter,
    getValueAxisFormatter,
    normalizeCurrencyInput,
    updateAxisBoundDisplays,
    updateCurrencyInputState,
    updateCurrencyValidationState,
    updateYAxisInputState,
  };
}

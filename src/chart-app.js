import Highcharts from "highcharts";

const CATEGORY_COUNT = 40;
const TRACK_HEIGHT = 300;
const EMPTY_BAR_COLOR = "rgba(0, 0, 0, 0.05)";

const defaultSettings = {
  activeTab: "display",
  autoScale: true,
  barHeight: "0.75",
  datasetKey: "dataset1",
  leftMargin: "100",
  orientation: "horizontal",
  showDataTable: true,
  showLabels: true,
  sort: "valueDesc",
  windowSize: "5",
  xAxisCurrency: "USD",
  xAxisFractionDigits: "0",
  xAxisGrouping: true,
  xAxisLocale: "en-US",
  xAxisNotation: "compact",
  xAxisStyle: "currency",
  yMax: "100",
  yMin: "0",
};

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createDataset(seed, maxValue) {
  const random = createSeededRandom(seed);
  return Array.from(
    { length: CATEGORY_COUNT },
    () => Math.floor(random() * maxValue)
  );
}

const fullCategories = Array.from(
  { length: CATEGORY_COUNT },
  (_, index) => `Category ${index + 1}`
);
fullCategories[4] = "This is a long Category 5";

const datasets = {
  dataset1: createDataset(17, 50000),
  dataset2: createDataset(29, 100),
  dataset3: createDataset(43, 100),
};

const state = {
  chart: null,
  currentDatasetKey: defaultSettings.datasetKey,
  currentStart: 0,
  formatterCache: new Map(),
  pendingScrollStart: 0,
  previousStart: 0,
  scrollAnimationFrame: null,
  sliceCache: null,
  sliceCacheKey: "",
  sortedPairsCache: null,
  sortedPairsCacheKey: "",
  tableRenderKey: "",
  windowSize: Number.parseInt(defaultSettings.windowSize, 10),
};

const elements = {
  autoScaleCheckbox: document.getElementById("autoScaleCheckbox"),
  barHeightSlider: document.getElementById("barHeightSlider"),
  barHeightValue: document.getElementById("barHeightValue"),
  controlsPanels: Array.from(document.querySelectorAll("[data-tab-panel]")),
  controlsTabs: Array.from(document.querySelectorAll("[data-tab-target]")),
  dataTableBody: document.getElementById("dataTableBody"),
  dataTablePanel: document.getElementById("dataTablePanel"),
  datasetSelector: document.getElementById("datasetSelector"),
  dynamicSliderStyle: document.getElementById("dynamic-slider-style"),
  leftMarginSlider: document.getElementById("leftMarginSlider"),
  leftMarginValue: document.getElementById("leftMarginValue"),
  orientationSelector: document.getElementById("orientationSelector"),
  resetDefaultsButton: document.getElementById("resetDefaultsButton"),
  showDataTableCheckbox: document.getElementById("showDataTableCheckbox"),
  scrollbar: document.getElementById("scrollbar"),
  sliderStatus: document.getElementById("sliderStatus"),
  sortSelector: document.getElementById("sortSelector"),
  toggleLabels: document.getElementById("toggleLabels"),
  windowSizeSelector: document.getElementById("windowSizeSelector"),
  xAxisCurrencyInput: document.getElementById("xAxisCurrencyInput"),
  xAxisCurrencyStatus: document.getElementById("xAxisCurrencyStatus"),
  xAxisFractionDigitsInput: document.getElementById("xAxisFractionDigitsInput"),
  xAxisGroupingCheckbox: document.getElementById("xAxisGroupingCheckbox"),
  xAxisLocaleInput: document.getElementById("xAxisLocaleInput"),
  xAxisNotationSelect: document.getElementById("xAxisNotationSelect"),
  xAxisStyleSelect: document.getElementById("xAxisStyleSelect"),
  yMaxInput: document.getElementById("yMaxInput"),
  yMinInput: document.getElementById("yMinInput"),
};

function setActiveControlsTab(targetTabName) {
  elements.controlsTabs.forEach((tab) => {
    const isActive = tab.dataset.tabTarget === targetTabName;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });

  elements.controlsPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === targetTabName;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function applyDefaultSettings({ preserveDataset = false } = {}) {
  if (!preserveDataset) {
    state.currentDatasetKey = defaultSettings.datasetKey;
    elements.datasetSelector.value = defaultSettings.datasetKey;
  }

  state.currentStart = 0;
  state.pendingScrollStart = 0;
  state.previousStart = 0;
  state.windowSize = Number.parseInt(defaultSettings.windowSize, 10);

  elements.windowSizeSelector.value = defaultSettings.windowSize;
  elements.toggleLabels.checked = defaultSettings.showLabels;
  elements.showDataTableCheckbox.checked = defaultSettings.showDataTable;
  elements.orientationSelector.value = defaultSettings.orientation;
  elements.leftMarginSlider.value = defaultSettings.leftMargin;
  elements.barHeightSlider.value = defaultSettings.barHeight;
  elements.sortSelector.value = defaultSettings.sort;
  elements.autoScaleCheckbox.checked = defaultSettings.autoScale;
  elements.yMinInput.value = defaultSettings.yMin;
  elements.yMaxInput.value = defaultSettings.yMax;
  elements.xAxisLocaleInput.value = defaultSettings.xAxisLocale;
  elements.xAxisNotationSelect.value = defaultSettings.xAxisNotation;
  elements.xAxisStyleSelect.value = defaultSettings.xAxisStyle;
  elements.xAxisCurrencyInput.value = defaultSettings.xAxisCurrency;
  elements.xAxisFractionDigitsInput.value = defaultSettings.xAxisFractionDigits;
  elements.xAxisGroupingCheckbox.checked = defaultSettings.xAxisGrouping;

  setActiveControlsTab(defaultSettings.activeTab);
}

function resetToDefaults() {
  applyDefaultSettings({ preserveDataset: true });
  invalidateSortedPairsCache();
  updateLeftMarginDisplay();
  updateBarHeightDisplay();
  updateCurrencyInputState();
  updateDataTableVisibility();
  updateYAxisInputState();
  renderChart({ resetScroll: true, forceTableRender: true });
}

function getCurrentDataset() {
  return datasets[state.currentDatasetKey];
}

function invalidateSortedPairsCache() {
  state.sortedPairsCache = null;
  state.sortedPairsCacheKey = "";
  state.sliceCache = null;
  state.sliceCacheKey = "";
}

function getSortedPairsCacheKey() {
  return `${state.currentDatasetKey}|${elements.sortSelector.value}`;
}

function getSortedPairs() {
  const cacheKey = getSortedPairsCacheKey();
  if (state.sortedPairsCache && state.sortedPairsCacheKey === cacheKey) {
    return state.sortedPairsCache;
  }

  const pairs = fullCategories.map((name, index) => ({
    index,
    name,
    y: getCurrentDataset()[index],
  }));

  const compareNames = (a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  const byNameAsc = (a, b) => compareNames(a, b) || a.index - b.index;
  const byNameDesc = (a, b) => compareNames(b, a) || a.index - b.index;

  switch (elements.sortSelector.value) {
    case "valueAsc":
      pairs.sort((a, b) => a.y - b.y || byNameAsc(a, b));
      break;
    case "valueDesc":
      pairs.sort((a, b) => b.y - a.y || byNameAsc(a, b));
      break;
    case "nameAsc":
      pairs.sort((a, b) => byNameAsc(a, b) || a.y - b.y);
      break;
    case "nameDesc":
      pairs.sort((a, b) => byNameDesc(a, b) || a.y - b.y);
      break;
    default:
      break;
  }

  state.sortedPairsCache = pairs;
  state.sortedPairsCacheKey = cacheKey;
  return pairs;
}

function getSliceCacheKey() {
  return `${getSortedPairsCacheKey()}|${state.currentStart}|${state.windowSize}`;
}

function getSlice() {
  const cacheKey = getSliceCacheKey();
  if (state.sliceCache && state.sliceCacheKey === cacheKey) {
    return state.sliceCache;
  }

  const sortedPairs = getSortedPairs();
  const slice = [];

  for (let index = 0; index < state.windowSize; index += 1) {
    slice.push(
      sortedPairs[state.currentStart + index] ?? {
        name: "",
        y: 0,
        color: EMPTY_BAR_COLOR,
      }
    );
  }

  const result = {
    categories: slice.map((item) => item.name || "\u00A0"),
    data: slice,
  };

  state.sliceCache = result;
  state.sliceCacheKey = cacheKey;
  return result;
}

function updateDataTableVisibility() {
  elements.dataTablePanel.hidden = !elements.showDataTableCheckbox.checked;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getMaxStart() {
  return Math.max(0, fullCategories.length - state.windowSize);
}

function clampCurrentStart() {
  state.currentStart = Math.min(Math.max(state.currentStart, 0), getMaxStart());
  state.sliceCache = null;
  state.sliceCacheKey = "";
}

function setSliderThumbHeight() {
  const thumbHeight = (state.windowSize / fullCategories.length) * TRACK_HEIGHT;
  elements.dynamicSliderStyle.textContent = `
    #scrollbar::-webkit-slider-thumb { height: ${thumbHeight}px; }
    #scrollbar::-moz-range-thumb { height: ${thumbHeight}px; }
  `;
}

function updateSliderStatus() {
  const total = fullCategories.length;
  const start = state.currentStart + 1;
  const end = Math.min(state.currentStart + state.windowSize, total);
  elements.sliderStatus.textContent = `Showing ${start}-${end} of ${total}`;
}

function updateScrollbar() {
  elements.scrollbar.max = String(getMaxStart());
  elements.scrollbar.value = String(state.currentStart);
  setSliderThumbHeight();
  updateSliderStatus();
}

function updateLeftMarginDisplay() {
  elements.leftMarginValue.textContent = elements.leftMarginSlider.value;
}

function updateBarHeightDisplay() {
  elements.barHeightValue.textContent = elements.barHeightSlider.value;
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

function isValidCurrencyCode(code) {
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

function updateCurrencyValidationState() {
  if (elements.xAxisStyleSelect.value !== "currency") {
    return;
  }

  const rawCurrency = elements.xAxisCurrencyInput.value.trim();
  const isValid = isValidCurrencyCode(rawCurrency);

  elements.xAxisCurrencyInput.classList.toggle("is-invalid", !isValid);
  elements.xAxisCurrencyStatus.textContent = isValid
    ? ""
    : `Invalid currency code. Using ${defaultSettings.xAxisCurrency}.`;
}

function getAxisBounds() {
  const dataset = getCurrentDataset();

  if (elements.autoScaleCheckbox.checked) {
    const maxValue = Math.max(...dataset);
    const minValue = Math.min(...dataset);
    const min = Math.floor(minValue / 10) * 10;
    const max = Math.ceil(maxValue / 10) * 10;

    elements.yMinInput.value = String(min);
    elements.yMaxInput.value = String(max);
    return { min, max };
  }

  let min = Number.parseFloat(elements.yMinInput.value);
  let max = Number.parseFloat(elements.yMaxInput.value);

  min = Number.isNaN(min) ? null : min;
  max = Number.isNaN(max) ? null : max;

  if (min !== null && max !== null && min > max) {
    [min, max] = [max, min];
    elements.yMinInput.value = String(min);
    elements.yMaxInput.value = String(max);
  }

  return { min, max };
}

function getSanitizedCurrencyCode() {
  const rawCurrency = elements.xAxisCurrencyInput.value.trim().toUpperCase();
  return isValidCurrencyCode(rawCurrency)
    ? rawCurrency
    : defaultSettings.xAxisCurrency;
}

function createSafeNumberFormatter(locale, options, fallbackOptions = {}) {
  const cacheKey = JSON.stringify({
    fallbackOptions,
    locale: locale ?? "",
    options,
  });
  if (state.formatterCache.has(cacheKey)) {
    return state.formatterCache.get(cacheKey);
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

  state.formatterCache.set(cacheKey, formatter);
  return formatter;
}

function getValueAxisFormatter() {
  const locale = elements.xAxisLocaleInput.value.trim() || undefined;
  const maximumFractionDigits = Number.parseInt(
    elements.xAxisFractionDigitsInput.value,
    10
  );
  const style = elements.xAxisStyleSelect.value;

  const options = {
    notation: elements.xAxisNotationSelect.value,
    style,
    useGrouping: elements.xAxisGroupingCheckbox.checked,
  };

  if (!Number.isNaN(maximumFractionDigits)) {
    options.maximumFractionDigits = Math.min(
      6,
      Math.max(0, maximumFractionDigits)
    );
  }

  if (style === "currency") {
    options.currency = getSanitizedCurrencyCode();
    options.currencyDisplay = "symbol";
  }

  return createSafeNumberFormatter(locale, options, {
    notation: "standard",
    style: style === "currency" ? "currency" : "decimal",
    ...(style === "currency"
      ? {
          currency: defaultSettings.xAxisCurrency,
          currencyDisplay: "symbol",
        }
      : {}),
  });
}

function getBarValueFormatter() {
  if (elements.xAxisStyleSelect.value !== "currency") {
    return null;
  }

  const locale = elements.xAxisLocaleInput.value.trim() || undefined;
  const maximumFractionDigits = Number.parseInt(
    elements.xAxisFractionDigitsInput.value,
    10
  );

  const options = {
    currency: getSanitizedCurrencyCode(),
    currencyDisplay: "symbol",
    notation: "standard",
    style: "currency",
    useGrouping: elements.xAxisGroupingCheckbox.checked,
  };

  if (!Number.isNaN(maximumFractionDigits)) {
    options.maximumFractionDigits = Math.min(
      6,
      Math.max(0, maximumFractionDigits)
    );
  }

  return createSafeNumberFormatter(locale, options, {
    currency: defaultSettings.xAxisCurrency,
    currencyDisplay: "symbol",
    notation: "standard",
    style: "currency",
    useGrouping: elements.xAxisGroupingCheckbox.checked,
  });
}

function getChartOrientation() {
  return elements.orientationSelector.value;
}

function getHorizontalCategoryLabelWidth() {
  const leftMargin = Number.parseInt(elements.leftMarginSlider.value, 10);
  return Math.max(48, leftMargin - 16);
}

function getCategoryAxisOptions(categories) {
  const isVertical = getChartOrientation() === "vertical";
  const categoryLabelWidth = getHorizontalCategoryLabelWidth();

  return {
    categories,
    reversed: !isVertical,
    labels: isVertical
      ? {}
      : {
          reserveSpace: false,
          useHTML: true,
          x: -8,
          formatter() {
            const label = typeof this.value === "string" ? this.value : "";
            return `<span class="chart-axis-label" title="${escapeHtml(label)}" style="width:${categoryLabelWidth}px">${escapeHtml(label)}</span>`;
          },
        },
    scrollbar: {
      enabled: true,
    },
  };
}

function getChartOptions() {
  const axisBounds = getAxisBounds();
  const isVertical = getChartOrientation() === "vertical";
  const slice = getSlice();
  const barValueFormatter = getBarValueFormatter();
  const valueAxisFormatter = getValueAxisFormatter();

  return {
    chart: {
      type: isVertical ? "column" : "bar",
      height: 400,
      animation: false,
      marginLeft: Number.parseInt(elements.leftMarginSlider.value, 10),
      marginRight: 60,
      spacingLeft: 0,
      spacingRight: 0,
    },
    xAxis: getCategoryAxisOptions(slice.categories),
    yAxis: {
      title: {
        text: null,
        align: "middle",
        rotation: 0,
        offset: 0,
        y: -20,
        x: 0,
        style: { fontWeight: "bold", fontSize: 15 },
      },
      labels: {
        align: "center",
        x: 0,
        y: 10,
        formatter() {
          return valueAxisFormatter.format(this.value);
        },
      },
      opposite: !isVertical,
      min: axisBounds.min,
      max: axisBounds.max,
    },
    plotOptions: {
      series: {
        pointPadding:
          1 - Number.parseFloat(elements.barHeightSlider.value) / 2 - 0.5,
        groupPadding: 0,
        animation: false,
        dataLabels: {
          enabled: elements.toggleLabels.checked,
          inside: true,
          style: {
            fontWeight: "bold",
            color: "white",
            textOutline: "0px",
          },
          formatter() {
            if (!(this.y > 0)) {
              return "";
            }

            return barValueFormatter
              ? barValueFormatter.format(this.y)
              : this.y;
          },
        },
      },
    },
    series: [
      {
        name: "Values",
        data: slice.data,
        showInLegend: false,
      },
    ],
  };
}

function getChartConfig(options) {
  return {
    chart: options.chart,
    title: { text: "" },
    xAxis: options.xAxis,
    yAxis: options.yAxis,
    credits: { enabled: false },
    plotOptions: options.plotOptions,
    series: options.series,
  };
}

function getTableRenderKey() {
  return [
    state.currentDatasetKey,
    elements.sortSelector.value,
    elements.xAxisLocaleInput.value.trim(),
    elements.xAxisNotationSelect.value,
    elements.xAxisStyleSelect.value,
    getSanitizedCurrencyCode(),
    elements.xAxisFractionDigitsInput.value,
    elements.xAxisGroupingCheckbox.checked,
  ].join("|");
}

function updateTableHighlights() {
  if (elements.dataTablePanel.hidden) {
    return;
  }

  const visibleIndexes = new Set(
    Array.from(
      { length: Math.max(0, Math.min(state.windowSize, getSortedPairs().length - state.currentStart)) },
      (_, offset) => state.currentStart + offset
    )
  );

  Array.from(elements.dataTableBody.querySelectorAll("tr[data-sorted-index]")).forEach(
    (row) => {
      const sortedIndex = Number.parseInt(row.dataset.sortedIndex, 10);
      row.classList.toggle("data-table-row-visible", visibleIndexes.has(sortedIndex));
    }
  );
}

function renderDataTable({ force = false } = {}) {
  updateDataTableVisibility();
  if (!elements.showDataTableCheckbox.checked) {
    state.tableRenderKey = "";
    return;
  }

  const renderKey = getTableRenderKey();
  if (!force && state.tableRenderKey === renderKey) {
    updateTableHighlights();
    return;
  }

  const tableFormatter = getBarValueFormatter() ?? getValueAxisFormatter();
  const allRows = getSortedPairs();

  elements.dataTableBody.innerHTML = allRows
    .map(
      (item, sortedIndex) => `
        <tr data-sorted-index="${sortedIndex}">
          <td>${escapeHtml(item.name)}</td>
          <td>${tableFormatter.format(item.y)}</td>
        </tr>
      `
    )
    .join("");

  state.tableRenderKey = renderKey;
  updateTableHighlights();
}

function createChart(options) {
  state.chart = Highcharts.chart("container", getChartConfig(options));
}

function updateExistingChart(options) {
  const currentType = state.chart.options.chart?.type;
  const nextType = options.chart.type;

  if (currentType !== nextType) {
    state.chart.destroy();
    state.chart = null;
    createChart(options);
    return;
  }

  state.chart.update(
    {
      chart: {
        marginLeft: options.chart.marginLeft,
        marginRight: options.chart.marginRight,
        spacingLeft: options.chart.spacingLeft,
        spacingRight: options.chart.spacingRight,
      },
    },
    false,
    false,
    false
  );
  state.chart.xAxis[0].update(
    {
      reversed: options.xAxis.reversed,
      labels: options.xAxis.labels,
    },
    false
  );
  state.chart.yAxis[0].update(options.yAxis, false);
  state.chart.series[0].update(
    {
      dataLabels: options.plotOptions.series.dataLabels,
      pointPadding: options.plotOptions.series.pointPadding,
      groupPadding: options.plotOptions.series.groupPadding,
    },
    false
  );
  state.chart.xAxis[0].setCategories(options.xAxis.categories, false);
  state.chart.series[0].setData(options.series[0].data, false, false, false);
  state.chart.redraw();
}

function renderChart({ forceTableRender = false, resetScroll = false } = {}) {
  if (resetScroll) {
    state.currentStart = 0;
    state.pendingScrollStart = 0;
    state.previousStart = 0;
  }

  clampCurrentStart();
  updateLeftMarginDisplay();
  updateScrollbar();

  const options = getChartOptions();

  if (!state.chart) {
    createChart(options);
  } else {
    updateExistingChart(options);
  }

  renderDataTable({ force: forceTableRender });
}

function applyScrollPosition(nextStart) {
  if (!state.chart) {
    return;
  }

  state.previousStart = state.currentStart;
  state.currentStart = nextStart;
  clampCurrentStart();
  updateScrollbar();

  const slice = getSlice();
  const axisOptions = getCategoryAxisOptions(slice.categories);

  state.chart.xAxis[0].update(
    {
      reversed: axisOptions.reversed,
      labels: axisOptions.labels,
    },
    false
  );
  state.chart.xAxis[0].setCategories(slice.categories, false);
  state.chart.series[0].setData(slice.data, true, false, false);
  updateTableHighlights();
}

function flushScrollUpdate() {
  state.scrollAnimationFrame = null;
  applyScrollPosition(state.pendingScrollStart);
}

function onScrollChange(value) {
  state.pendingScrollStart = Number.parseFloat(value);

  if (state.scrollAnimationFrame !== null) {
    return;
  }

  state.scrollAnimationFrame = window.requestAnimationFrame(flushScrollUpdate);
}

function bindEvents() {
  const debouncedFormatRender = debounce(
    () => renderChart({ forceTableRender: true }),
    180
  );
  const debouncedManualAxisRender = debounce(() => {
    if (!elements.autoScaleCheckbox.checked) {
      renderChart();
    }
  }, 120);

  elements.controlsTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      setActiveControlsTab(tab.dataset.tabTarget);
    });

    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return;
      }

      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex =
        (index + direction + elements.controlsTabs.length) %
        elements.controlsTabs.length;
      const nextTab = elements.controlsTabs[nextIndex];
      setActiveControlsTab(nextTab.dataset.tabTarget);
      nextTab.focus();
    });
  });

  elements.windowSizeSelector.addEventListener("change", (event) => {
    state.windowSize =
      event.target.value === "max"
        ? fullCategories.length
        : Number.parseInt(event.target.value, 10);
    renderChart({ resetScroll: true });
  });

  elements.toggleLabels.addEventListener("change", () => renderChart());
  elements.orientationSelector.addEventListener("change", () => renderChart());
  elements.resetDefaultsButton.addEventListener("click", resetToDefaults);
  elements.showDataTableCheckbox.addEventListener("change", () =>
    renderDataTable({ force: true })
  );
  elements.leftMarginSlider.addEventListener("input", () => renderChart());
  elements.sortSelector.addEventListener("change", () => {
    invalidateSortedPairsCache();
    renderChart({ forceTableRender: true, resetScroll: true });
  });
  elements.barHeightSlider.addEventListener("input", () => {
    updateBarHeightDisplay();
    renderChart();
  });
  elements.autoScaleCheckbox.addEventListener("change", () => {
    updateYAxisInputState();
    renderChart();
  });
  elements.yMinInput.addEventListener("input", debouncedManualAxisRender);
  elements.yMaxInput.addEventListener("input", debouncedManualAxisRender);
  elements.datasetSelector.addEventListener("change", (event) => {
    state.currentDatasetKey = event.target.value;
    invalidateSortedPairsCache();
    renderChart({ forceTableRender: true, resetScroll: true });
  });
  elements.xAxisLocaleInput.addEventListener("input", debouncedFormatRender);
  elements.xAxisNotationSelect.addEventListener("change", () =>
    renderChart({ forceTableRender: true })
  );
  elements.xAxisStyleSelect.addEventListener("change", () => {
    updateCurrencyInputState();
    renderChart({ forceTableRender: true });
  });
  elements.xAxisCurrencyInput.addEventListener("input", () => {
    normalizeCurrencyInput();
    updateCurrencyValidationState();
    debouncedFormatRender();
  });
  elements.xAxisFractionDigitsInput.addEventListener(
    "input",
    debouncedFormatRender
  );
  elements.xAxisGroupingCheckbox.addEventListener("change", () =>
    renderChart({ forceTableRender: true })
  );
  elements.scrollbar.addEventListener("input", (event) => {
    onScrollChange(event.target.value);
  });
}

function debounce(callback, delay) {
  let timeoutId = null;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

export function initializeChartApp() {
  applyDefaultSettings();
  updateLeftMarginDisplay();
  updateBarHeightDisplay();
  updateCurrencyInputState();
  normalizeCurrencyInput();
  updateCurrencyValidationState();
  updateDataTableVisibility();
  updateYAxisInputState();
  bindEvents();
  renderChart({ forceTableRender: true, resetScroll: true });
}

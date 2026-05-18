import Highcharts from "highcharts";
import {
  buildSlice,
  getAutoScaleBounds,
  getHorizontalCategoryLabelWidth,
  getPointPadding,
  isValidCurrencyCode,
  sanitizeAxisBounds,
  sanitizeCurrencyCode,
  sortPairs,
} from "./chart-utils.js";

const CATEGORY_COUNT = 40;
const TRACK_HEIGHT = 300;
const SIDEBAR_COLLAPSED_STORAGE_KEY = "chartSidebarCollapsed";
const SIDEBAR_POSITION_STORAGE_KEY = "chartSidebarPosition";
const SIDEBAR_TOGGLE_ICONS = {
  collapse: `
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="m15 6-6 6 6 6" />
    </svg>
  `,
  expand: `
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M3 5h18v14H3z" />
      <path d="M8 5v14" />
      <path d="M12 8h3" />
      <path d="M18 8h1" />
      <path d="M12 16h1" />
      <path d="M16 16h3" />
      <path d="M12 12h2" />
      <path d="M17 12h2" />
      <circle cx="16.5" cy="8" r="1.2" />
      <circle cx="14.5" cy="16" r="1.2" />
      <circle cx="15.5" cy="12" r="1.2" />
      <path d="M5 12h3" />
      <path d="m6 10-2 2 2 2" />
    </svg>
  `,
};
const TABLE_SORT_FIELDS = ["name", "value"];

const defaultSettings = {
  activeTab: "display",
  advancedDisplayOpen: false,
  autoScale: true,
  barHeight: "0.75",
  chartHeight: "400",
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
  autoScaleBoundsCache: null,
  autoScaleBoundsCacheKey: "",
  chart: null,
  currentDatasetKey: defaultSettings.datasetKey,
  currentStart: 0,
  formatterCache: new Map(),
  pendingScrollStart: 0,
  previousStart: 0,
  scrollAnimationFrame: null,
  sidebarDrag: null,
  sliceCache: null,
  sliceCacheKey: "",
  sortedPairsCache: null,
  sortedPairsCacheKey: "",
  suppressSidebarToggleClick: false,
  tableRows: [],
  tableRenderKey: "",
  windowSize: Number.parseInt(defaultSettings.windowSize, 10),
};

const elements = {
  advancedDisplayControls: document.getElementById("advancedDisplayControls"),
  autoScaleCheckbox: document.getElementById("autoScaleCheckbox"),
  barHeightSlider: document.getElementById("barHeightSlider"),
  barHeightValue: document.getElementById("barHeightValue"),
  chartContainer: document.getElementById("chart-container"),
  chartHeightSlider: document.getElementById("chartHeightSlider"),
  chartHeightValue: document.getElementById("chartHeightValue"),
  controlsPanels: Array.from(document.querySelectorAll("[data-tab-panel]")),
  controlsTabs: Array.from(document.querySelectorAll("[data-tab-target]")),
  controlsContent: document.getElementById("controlsContent"),
  controlsSidebar: document.getElementById("controlsSidebar"),
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
  sidebarDragHandle: document.getElementById("sidebarDragHandle"),
  sidebarToggle: document.getElementById("sidebarToggle"),
  sidebarToggleIcon: document.getElementById("sidebarToggleIcon"),
  sidebarToggleText: document.getElementById("sidebarToggleText"),
  sliderStatus: document.getElementById("sliderStatus"),
  sortSelector: document.getElementById("sortSelector"),
  tableSortButtons: Array.from(document.querySelectorAll("[data-table-sort]")),
  toggleLabels: document.getElementById("toggleLabels"),
  workspace: document.getElementById("workspace"),
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

function getTableSortDescriptor(sortMode = elements.sortSelector.value) {
  const match = new RegExp(`^(${TABLE_SORT_FIELDS.join("|")})(Asc|Desc)$`).exec(
    sortMode
  );

  if (!match) {
    return { direction: null, field: null };
  }

  return {
    direction: match[2] === "Asc" ? "ascending" : "descending",
    field: match[1],
  };
}

function updateTableSortHeaders() {
  const activeSort = getTableSortDescriptor();

  elements.tableSortButtons.forEach((button) => {
    const field = button.dataset.tableSort;
    const isActive = activeSort.field === field;
    const header = button.closest("th");
    const nextDirection =
      isActive && activeSort.direction === "ascending"
        ? "descending"
        : "ascending";

    button.classList.toggle("is-active", isActive);
    button.setAttribute(
      "aria-label",
      `Sort by ${button.textContent.trim()} ${nextDirection}`
    );

    if (isActive) {
      button.dataset.sortDirection =
        activeSort.direction === "ascending" ? "asc" : "desc";
      header?.setAttribute("aria-sort", activeSort.direction);
    } else {
      delete button.dataset.sortDirection;
      header?.setAttribute("aria-sort", "none");
    }
  });
}

function getStoredSidebarCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function persistSidebarCollapsed(isCollapsed) {
  try {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(isCollapsed)
    );
  } catch {
    // Local storage can be unavailable in private browsing or embedded previews.
  }
}

function getStoredSidebarPosition() {
  try {
    const rawPosition = window.localStorage.getItem(SIDEBAR_POSITION_STORAGE_KEY);
    if (!rawPosition) {
      return null;
    }

    const position = JSON.parse(rawPosition);
    if (Number.isFinite(position?.left) && Number.isFinite(position?.top)) {
      return position;
    }
  } catch {
    // Local storage can be unavailable or contain stale values.
  }

  return null;
}

function persistSidebarPosition(position) {
  try {
    window.localStorage.setItem(
      SIDEBAR_POSITION_STORAGE_KEY,
      JSON.stringify(position)
    );
  } catch {
    // Local storage can be unavailable in private browsing or embedded previews.
  }
}

function getSidebarBounds() {
  const workspaceRect = elements.workspace.getBoundingClientRect();
  const sidebarWidth = elements.controlsSidebar.offsetWidth;
  const sidebarHeight = elements.controlsSidebar.offsetHeight;

  return {
    maxLeft: window.innerWidth - workspaceRect.left - sidebarWidth,
    maxTop: window.innerHeight - workspaceRect.top - sidebarHeight,
    minLeft: -workspaceRect.left,
    minTop: -workspaceRect.top,
  };
}

function getCurrentSidebarPosition() {
  const workspaceRect = elements.workspace.getBoundingClientRect();
  const sidebarRect = elements.controlsSidebar.getBoundingClientRect();

  return {
    left: sidebarRect.left - workspaceRect.left,
    top: sidebarRect.top - workspaceRect.top,
  };
}

function setSidebarPosition(left, top, { persist = false } = {}) {
  const bounds = getSidebarBounds();
  const nextPosition = {
    left: Math.min(Math.max(left, bounds.minLeft), bounds.maxLeft),
    top: Math.min(Math.max(top, bounds.minTop), bounds.maxTop),
  };

  elements.controlsSidebar.style.left = `${nextPosition.left}px`;
  elements.controlsSidebar.style.right = "auto";
  elements.controlsSidebar.style.top = `${nextPosition.top}px`;

  if (persist) {
    persistSidebarPosition(nextPosition);
  }

  return nextPosition;
}

function clampSidebarPosition({ persist = false } = {}) {
  if (!elements.controlsSidebar.style.left) {
    return;
  }

  const currentPosition = getCurrentSidebarPosition();
  setSidebarPosition(currentPosition.left, currentPosition.top, { persist });
}

function updateChartAfterSidebarChange() {
  window.requestAnimationFrame(() => {
    state.chart?.reflow();
  });
}

function setSidebarCollapsed(isCollapsed, { persist = false } = {}) {
  elements.workspace.classList.toggle("sidebar-collapsed", isCollapsed);
  elements.controlsContent.hidden = isCollapsed;
  elements.sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
  elements.sidebarToggle.title = isCollapsed
    ? "Expand controls"
    : "Collapse controls";
  elements.sidebarToggle.setAttribute(
    "aria-label",
    isCollapsed ? "Expand controls" : "Collapse controls"
  );
  elements.sidebarToggleIcon.innerHTML = isCollapsed
    ? SIDEBAR_TOGGLE_ICONS.expand
    : SIDEBAR_TOGGLE_ICONS.collapse;
  elements.sidebarToggleText.textContent = isCollapsed
    ? "Expand controls"
    : "Collapse controls";

  if (persist) {
    persistSidebarCollapsed(isCollapsed);
  }

  window.requestAnimationFrame(() => {
    clampSidebarPosition({ persist });
  });
  updateChartAfterSidebarChange();
}

function applyStoredSidebarState() {
  setSidebarCollapsed(getStoredSidebarCollapsed());
}

function applyStoredSidebarPosition() {
  const storedPosition = getStoredSidebarPosition();
  if (!storedPosition) {
    return;
  }

  window.requestAnimationFrame(() => {
    setSidebarPosition(storedPosition.left, storedPosition.top);
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
  elements.advancedDisplayControls.open = defaultSettings.advancedDisplayOpen;
  elements.toggleLabels.checked = defaultSettings.showLabels;
  elements.showDataTableCheckbox.checked = defaultSettings.showDataTable;
  elements.orientationSelector.value = defaultSettings.orientation;
  elements.leftMarginSlider.value = defaultSettings.leftMargin;
  elements.barHeightSlider.value = defaultSettings.barHeight;
  elements.chartHeightSlider.value = defaultSettings.chartHeight;
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
  updateChartHeightDisplay();
  updateCurrencyInputState();
  updateDataTableVisibility();
  updateYAxisInputState();
  renderChart({ resetScroll: true, forceTableRender: true });
}

function getCurrentDataset() {
  return datasets[state.currentDatasetKey];
}

function getAutoScaleBoundsCacheKey() {
  return state.currentDatasetKey;
}

function invalidateSortedPairsCache() {
  state.autoScaleBoundsCache = null;
  state.autoScaleBoundsCacheKey = "";
  state.sortedPairsCache = null;
  state.sortedPairsCacheKey = "";
  state.sliceCache = null;
  state.sliceCacheKey = "";
}

function setSortMode(sortMode, { resetScroll = true } = {}) {
  elements.sortSelector.value = sortMode;
  invalidateSortedPairsCache();
  renderChart({ forceTableRender: true, resetScroll });
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

  state.sortedPairsCache = sortPairs(pairs, elements.sortSelector.value);
  state.sortedPairsCacheKey = cacheKey;
  return state.sortedPairsCache;
}

function getSliceCacheKey() {
  return `${getSortedPairsCacheKey()}|${state.currentStart}|${state.windowSize}`;
}

function getSlice() {
  const cacheKey = getSliceCacheKey();
  if (state.sliceCache && state.sliceCacheKey === cacheKey) {
    return state.sliceCache;
  }

  const result = buildSlice(getSortedPairs(), state.currentStart, state.windowSize);

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

function updateChartHeightDisplay() {
  elements.chartHeightValue.textContent = elements.chartHeightSlider.value;
  elements.chartContainer.style.setProperty(
    "--chart-height",
    `${elements.chartHeightSlider.value}px`
  );
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
    const cacheKey = getAutoScaleBoundsCacheKey();
    if (
      !state.autoScaleBoundsCache ||
      state.autoScaleBoundsCacheKey !== cacheKey
    ) {
      state.autoScaleBoundsCache = getAutoScaleBounds(dataset);
      state.autoScaleBoundsCacheKey = cacheKey;
    }

    const { min, max } = state.autoScaleBoundsCache;

    elements.yMinInput.value = String(min);
    elements.yMaxInput.value = String(max);
    return { min, max };
  }

  const { min, max } = sanitizeAxisBounds(
    elements.yMinInput.value,
    elements.yMaxInput.value
  );

  if (min !== null) {
    elements.yMinInput.value = String(min);
  }

  if (max !== null) {
    elements.yMaxInput.value = String(max);
  }

  return { min, max };
}

function getSanitizedCurrencyCode() {
  return sanitizeCurrencyCode(
    elements.xAxisCurrencyInput.value,
    defaultSettings.xAxisCurrency
  );
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

function getBarTooltipMarkup(point, valueFormatter) {
  const name = point.name || "";
  const value =
    typeof point.y === "number" ? valueFormatter.format(point.y) : "";

  if (!name || !value) {
    return false;
  }

  return `
    <div class="bar-tooltip">
      <div class="bar-tooltip-title">${escapeHtml(name)}</div>
      <div class="bar-tooltip-grid">
        <span>Value</span><strong>${escapeHtml(value)}</strong>
      </div>
    </div>
  `;
}

function getChartOrientation() {
  return elements.orientationSelector.value;
}

function getCategoryAxisOptions(categories) {
  const isVertical = getChartOrientation() === "vertical";
  const categoryLabelWidth = getHorizontalCategoryLabelWidth(
    elements.leftMarginSlider.value
  );

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
      height: Number.parseInt(elements.chartHeightSlider.value, 10),
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
        pointPadding: getPointPadding(elements.barHeightSlider.value),
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
    tooltip: {
      animation: false,
      backgroundColor: "transparent",
      borderWidth: 0,
      padding: 0,
      shadow: false,
      useHTML: true,
      formatter() {
        const point = this.point ?? this;
        return getBarTooltipMarkup(
          point,
          barValueFormatter ?? valueAxisFormatter
        );
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
    tooltip: options.tooltip,
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

  state.tableRows.forEach((row) => {
    const sortedIndex = Number.parseInt(row.dataset.sortedIndex, 10);
    row.classList.toggle("data-table-row-visible", visibleIndexes.has(sortedIndex));
  });
}

function renderDataTable({ force = false } = {}) {
  updateDataTableVisibility();
  updateTableSortHeaders();

  if (!elements.showDataTableCheckbox.checked) {
    state.tableRows = [];
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

  state.tableRows = Array.from(
    elements.dataTableBody.querySelectorAll("tr[data-sorted-index]")
  );
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
        height: options.chart.height,
        marginLeft: options.chart.marginLeft,
        marginRight: options.chart.marginRight,
        spacingLeft: options.chart.spacingLeft,
        spacingRight: options.chart.spacingRight,
      },
      tooltip: options.tooltip,
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

function startSidebarDrag(event) {
  const isCollapsed = elements.workspace.classList.contains("sidebar-collapsed");
  const startedOnToggle = Boolean(event.target.closest?.(".sidebar-toggle"));

  if (event.button !== 0 || (startedOnToggle && !isCollapsed)) {
    return;
  }

  if (!startedOnToggle || isCollapsed) {
    event.preventDefault();
  }

  const currentPosition = getCurrentSidebarPosition();

  state.sidebarDrag = {
    didMove: false,
    originLeft: currentPosition.left,
    originTop: currentPosition.top,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startedOnToggle,
  };
  elements.sidebarDragHandle.classList.add("is-dragging");
  elements.sidebarDragHandle.setPointerCapture?.(event.pointerId);
}

function moveSidebarDrag(event) {
  if (!state.sidebarDrag || state.sidebarDrag.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  const deltaX = event.clientX - state.sidebarDrag.startX;
  const deltaY = event.clientY - state.sidebarDrag.startY;

  if (Math.hypot(deltaX, deltaY) > 4) {
    state.sidebarDrag.didMove = true;
  }

  setSidebarPosition(
    state.sidebarDrag.originLeft + deltaX,
    state.sidebarDrag.originTop + deltaY
  );
}

function endSidebarDrag(event) {
  if (!state.sidebarDrag || state.sidebarDrag.pointerId !== event.pointerId) {
    return;
  }

  const isCollapsed = elements.workspace.classList.contains("sidebar-collapsed");
  const shouldExpandFromCollapsedIcon =
    event.type === "pointerup" &&
    isCollapsed &&
    state.sidebarDrag.startedOnToggle &&
    !state.sidebarDrag.didMove;
  const shouldSuppressToggleClick =
    event.type === "pointerup" &&
    isCollapsed &&
    state.sidebarDrag.startedOnToggle;
  const currentPosition = getCurrentSidebarPosition();

  setSidebarPosition(currentPosition.left, currentPosition.top, {
    persist: true,
  });
  elements.sidebarDragHandle.classList.remove("is-dragging");
  if (elements.sidebarDragHandle.hasPointerCapture?.(event.pointerId)) {
    elements.sidebarDragHandle.releasePointerCapture(event.pointerId);
  }
  state.sidebarDrag = null;
  state.suppressSidebarToggleClick = shouldSuppressToggleClick;

  if (shouldExpandFromCollapsedIcon) {
    setSidebarCollapsed(false, { persist: true });
  }

  if (shouldSuppressToggleClick) {
    window.setTimeout(() => {
      state.suppressSidebarToggleClick = false;
    }, 250);
  }
}

function nudgeSidebarPosition(event) {
  const offsets = {
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
  };
  const offset = offsets[event.key];

  if (!offset) {
    return;
  }

  event.preventDefault();
  const step = event.shiftKey ? 40 : 10;
  const currentPosition = getCurrentSidebarPosition();
  setSidebarPosition(
    currentPosition.left + offset[0] * step,
    currentPosition.top + offset[1] * step,
    { persist: true }
  );
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
  const debouncedSidebarClamp = debounce(() => {
    clampSidebarPosition({ persist: true });
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

  elements.sidebarToggle.addEventListener("click", (event) => {
    if (state.suppressSidebarToggleClick) {
      event.preventDefault();
      state.suppressSidebarToggleClick = false;
      return;
    }

    setSidebarCollapsed(
      !elements.workspace.classList.contains("sidebar-collapsed"),
      { persist: true }
    );
  });
  elements.sidebarDragHandle.addEventListener("pointerdown", startSidebarDrag);
  elements.sidebarDragHandle.addEventListener("pointermove", moveSidebarDrag);
  elements.sidebarDragHandle.addEventListener("pointerup", endSidebarDrag);
  elements.sidebarDragHandle.addEventListener("pointercancel", endSidebarDrag);
  elements.sidebarDragHandle.addEventListener("keydown", nudgeSidebarPosition);
  window.addEventListener("resize", debouncedSidebarClamp);

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
  elements.sortSelector.addEventListener("change", (event) => {
    setSortMode(event.target.value);
  });
  elements.tableSortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.dataset.tableSort;
      const activeSort = getTableSortDescriptor();
      const direction =
        activeSort.field === field && activeSort.direction === "ascending"
          ? "Desc"
          : "Asc";

      setSortMode(`${field}${direction}`);
    });
  });
  elements.barHeightSlider.addEventListener("input", () => {
    updateBarHeightDisplay();
    renderChart();
  });
  elements.chartHeightSlider.addEventListener("input", () => {
    updateChartHeightDisplay();
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
  applyStoredSidebarState();
  applyStoredSidebarPosition();
  updateLeftMarginDisplay();
  updateBarHeightDisplay();
  updateChartHeightDisplay();
  updateCurrencyInputState();
  normalizeCurrencyInput();
  updateCurrencyValidationState();
  updateDataTableVisibility();
  updateYAxisInputState();
  bindEvents();
  renderChart({ forceTableRender: true, resetScroll: true });
}

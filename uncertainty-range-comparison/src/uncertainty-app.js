import Highcharts from "highcharts";
import {
  debounce,
  escapeHtml,
} from "../../src/shared/chart-core.js";
import {
  createStandardCurrencyFormatter,
  createValueAxisFormatter,
  getSanitizedFormatCurrency,
} from "../../src/shared/format-options.js";
import {
  readBooleanPreference,
  readJsonPreference,
  writeBooleanPreference,
  writeJsonPreference,
} from "../../src/shared/preferences.js";
import {
  buildSlice,
  getAutoScaleBounds,
  getHorizontalCategoryLabelWidth,
  isValidCurrencyCode,
  normalizeUncertaintyValues,
  sanitizeAxisBounds,
  sortRows,
} from "./uncertainty-utils.js";

const TRACK_HEIGHT = 300;
const UNCERTAINTY_BAR_COLOR = "#2caffe";
const UNCERTAINTY_BAR_BORDER_COLOR = "#258ec9";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "uncertaintySidebarCollapsed";
const SIDEBAR_POSITION_STORAGE_KEY = "uncertaintySidebarPosition";
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
const TABLE_SORT_FIELDS = ["low", "base", "high", "mean", "spread"];

const defaultSettings = {
  activeTab: "display",
  advancedDisplayOpen: false,
  autoScale: true,
  barHeight: "0.72",
  chartHeight: "400",
  datasetKey: "capitalPlan",
  leftMargin: "120",
  orientation: "horizontal",
  showDataTable: true,
  showLabels: true,
  showMean: true,
  sort: "baseDesc",
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

const sampleDatasets = {
  capitalPlan: [
    { name: "Plant Expansion", low: 34, base: 48, high: 68 },
    { name: "Distribution Hub", low: 18, base: 34, high: 58 },
    { name: "Automation Upgrade", low: 22, base: 39, high: 51 },
    { name: "Fleet Renewal", low: 8, base: 24, high: 44 },
    { name: "Analytics Platform", low: 12, base: 21, high: 33 },
    { name: "Customer Portal", low: 5, base: 16, high: 29 },
    { name: "Supplier Program", low: -4, base: 11, high: 23 },
    { name: "Energy Storage", low: 15, base: 28, high: 62 },
    { name: "Safety Systems", low: 3, base: 14, high: 24 },
    { name: "Regional Office", low: 6, base: 18, high: 35 },
    { name: "Packaging Line", low: 11, base: 26, high: 41 },
    { name: "Training Rollout", low: 2, base: 9, high: 17 },
  ],
  productCases: [
    { name: "Core Refresh", low: 52, base: 71, high: 96 },
    { name: "AI Assistant", low: 24, base: 58, high: 103 },
    { name: "Mobile Redesign", low: 33, base: 47, high: 64 },
    { name: "Partner API", low: 14, base: 32, high: 49 },
    { name: "New Market", low: -12, base: 19, high: 74 },
    { name: "Self Serve", low: 26, base: 44, high: 69 },
    { name: "Billing Tools", low: 8, base: 25, high: 37 },
    { name: "Enterprise SSO", low: 19, base: 35, high: 46 },
    { name: "Retention Offers", low: 4, base: 18, high: 34 },
    { name: "Telemetry", low: 6, base: 17, high: 27 },
  ],
  operations: [
    { name: "Freight Savings", low: 11, base: 27, high: 43 },
    { name: "Labor Planning", low: 6, base: 18, high: 36 },
    { name: "Warehouse Lease", low: -21, base: -8, high: 12 },
    { name: "Vendor Rebate", low: 9, base: 22, high: 31 },
    { name: "Scrap Reduction", low: 4, base: 13, high: 24 },
    { name: "Demand Shift", low: -16, base: 7, high: 39 },
    { name: "Service Desk", low: 2, base: 8, high: 19 },
    { name: "Quality Audit", low: 3, base: 10, high: 18 },
    { name: "Energy Contract", low: 12, base: 21, high: 45 },
    { name: "Inventory Buffer", low: -9, base: 3, high: 20 },
  ],
};

const state = {
  autoScaleBoundsCache: null,
  autoScaleBoundsCacheKey: "",
  chart: null,
  currentDatasetKey: defaultSettings.datasetKey,
  currentStart: 0,
  formatterCache: new Map(),
  nextRowId: 1,
  pendingScrollStart: 0,
  previousStart: 0,
  rows: [],
  scrollAnimationFrame: null,
  sidebarDrag: null,
  suppressSidebarToggleClick: false,
  sliceCache: null,
  sliceCacheKey: "",
  sortedRowsCache: null,
  sortedRowsCacheKey: "",
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
  dataStatus: document.getElementById("dataStatus"),
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
  toggleMean: document.getElementById("toggleMean"),
  windowSizeSelector: document.getElementById("windowSizeSelector"),
  xAxisCurrencyInput: document.getElementById("xAxisCurrencyInput"),
  xAxisCurrencyStatus: document.getElementById("xAxisCurrencyStatus"),
  xAxisFractionDigitsInput: document.getElementById("xAxisFractionDigitsInput"),
  xAxisGroupingCheckbox: document.getElementById("xAxisGroupingCheckbox"),
  xAxisLocaleInput: document.getElementById("xAxisLocaleInput"),
  xAxisNotationSelect: document.getElementById("xAxisNotationSelect"),
  xAxisStyleSelect: document.getElementById("xAxisStyleSelect"),
  workspace: document.getElementById("workspace"),
  yMaxInput: document.getElementById("yMaxInput"),
  yMinInput: document.getElementById("yMinInput"),
};

function createRow(row) {
  const id = `row-${state.nextRowId}`;
  state.nextRowId += 1;

  return {
    base: String(row.base),
    high: String(row.high),
    id,
    low: String(row.low),
    name: row.name,
  };
}

function cloneDatasetRows(datasetKey) {
  return sampleDatasets[datasetKey].map((row) => createRow(row));
}

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
  return readBooleanPreference(SIDEBAR_COLLAPSED_STORAGE_KEY);
}

function persistSidebarCollapsed(isCollapsed) {
  writeBooleanPreference(SIDEBAR_COLLAPSED_STORAGE_KEY, isCollapsed);
}

function getStoredSidebarPosition() {
  return readJsonPreference(
    SIDEBAR_POSITION_STORAGE_KEY,
    (position) =>
      Number.isFinite(position?.left) && Number.isFinite(position?.top)
  );
}

function persistSidebarPosition(position) {
  writeJsonPreference(SIDEBAR_POSITION_STORAGE_KEY, position);
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

function applyDefaultSettings({ preserveRows = true } = {}) {
  if (!preserveRows) {
    state.currentDatasetKey = defaultSettings.datasetKey;
    elements.datasetSelector.value = defaultSettings.datasetKey;
    state.rows = cloneDatasetRows(defaultSettings.datasetKey);
  }

  state.currentStart = 0;
  state.pendingScrollStart = 0;
  state.previousStart = 0;
  state.windowSize = Number.parseInt(defaultSettings.windowSize, 10);

  elements.windowSizeSelector.value = defaultSettings.windowSize;
  elements.advancedDisplayControls.open = defaultSettings.advancedDisplayOpen;
  elements.toggleLabels.checked = defaultSettings.showLabels;
  elements.toggleMean.checked = defaultSettings.showMean;
  elements.showDataTableCheckbox.checked = defaultSettings.showDataTable;
  elements.leftMarginSlider.value = defaultSettings.leftMargin;
  elements.barHeightSlider.value = defaultSettings.barHeight;
  elements.chartHeightSlider.value = defaultSettings.chartHeight;
  elements.orientationSelector.value = defaultSettings.orientation;
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
  applyDefaultSettings({ preserveRows: true });
  invalidateRowsCache();
  updateLeftMarginDisplay();
  updateBarHeightDisplay();
  updateChartHeightDisplay();
  updateCurrencyInputState();
  updateDataTableVisibility();
  updateYAxisInputState();
  renderChart({ forceTableRender: true, resetScroll: true });
}

function invalidateRowsCache() {
  state.autoScaleBoundsCache = null;
  state.autoScaleBoundsCacheKey = "";
  state.sortedRowsCache = null;
  state.sortedRowsCacheKey = "";
  state.sliceCache = null;
  state.sliceCacheKey = "";
}

function setSortMode(sortMode, { resetScroll = true } = {}) {
  elements.sortSelector.value = sortMode;
  invalidateRowsCache();
  renderChart({ forceTableRender: true, resetScroll });
}

function getNormalizedRows() {
  return state.rows.map((row, sourceIndex) => {
    const normalized = normalizeUncertaintyValues(row.low, row.base, row.high);
    return {
      ...row,
      ...normalized,
      name: row.name.trim() || `Bar ${sourceIndex + 1}`,
      sourceIndex,
    };
  });
}

function getRowsCacheKey() {
  return state.rows
    .map((row) => [row.id, row.name, row.low, row.base, row.high].join(":"))
    .join("|");
}

function getAutoScaleBoundsCacheKey() {
  return getRowsCacheKey();
}

function getSortedRowsCacheKey() {
  return `${getRowsCacheKey()}|${elements.sortSelector.value}`;
}

function getSortedRows() {
  const cacheKey = getSortedRowsCacheKey();
  if (state.sortedRowsCache && state.sortedRowsCacheKey === cacheKey) {
    return state.sortedRowsCache;
  }

  state.sortedRowsCache = sortRows(getNormalizedRows(), elements.sortSelector.value);
  state.sortedRowsCacheKey = cacheKey;
  return state.sortedRowsCache;
}

function getSliceCacheKey() {
  return `${getSortedRowsCacheKey()}|${state.currentStart}|${state.windowSize}`;
}

function getSlice() {
  const cacheKey = getSliceCacheKey();
  if (state.sliceCache && state.sliceCacheKey === cacheKey) {
    return state.sliceCache;
  }

  const result = buildSlice(getSortedRows(), state.currentStart, state.windowSize);

  state.sliceCache = result;
  state.sliceCacheKey = cacheKey;
  return result;
}

function updateDataTableVisibility() {
  elements.dataTablePanel.hidden = !elements.showDataTableCheckbox.checked;
}

function getMaxStart() {
  return Math.max(0, state.rows.length - state.windowSize);
}

function clampCurrentStart() {
  state.currentStart = Math.min(Math.max(state.currentStart, 0), getMaxStart());
  state.sliceCache = null;
  state.sliceCacheKey = "";
}

function setSliderThumbHeight() {
  const total = Math.max(state.rows.length, 1);
  const thumbHeight = Math.max(32, (state.windowSize / total) * TRACK_HEIGHT);
  elements.dynamicSliderStyle.textContent = `
    #scrollbar::-webkit-slider-thumb { height: ${thumbHeight}px; }
    #scrollbar::-moz-range-thumb { height: ${thumbHeight}px; }
  `;
}

function updateSliderStatus() {
  const total = state.rows.length;
  const start = total === 0 ? 0 : state.currentStart + 1;
  const end = Math.min(state.currentStart + state.windowSize, total);
  elements.sliderStatus.textContent = `Showing ${start}-${end} of ${total}`;
}

function updateScrollbar() {
  elements.scrollbar.max = String(getMaxStart());
  elements.scrollbar.value = String(state.currentStart);
  elements.scrollbar.disabled = getMaxStart() === 0;
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

function getAutoBounds() {
  const cacheKey = getAutoScaleBoundsCacheKey();
  if (!state.autoScaleBoundsCache || state.autoScaleBoundsCacheKey !== cacheKey) {
    state.autoScaleBoundsCache = getAutoScaleBounds(getNormalizedRows());
    state.autoScaleBoundsCacheKey = cacheKey;
  }

  return state.autoScaleBoundsCache;
}

function getAxisBounds() {
  const autoBounds = getAutoBounds();

  if (elements.autoScaleCheckbox.checked) {
    elements.yMinInput.value = String(autoBounds.min);
    elements.yMaxInput.value = String(autoBounds.max);
    return autoBounds;
  }

  const bounds = sanitizeAxisBounds(
    elements.yMinInput.value,
    elements.yMaxInput.value,
    autoBounds
  );

  elements.yMinInput.value = String(bounds.min);
  elements.yMaxInput.value = String(bounds.max);
  return bounds;
}

function getSanitizedCurrencyCode() {
  return getSanitizedFormatCurrency(
    getFormatSettings(),
    defaultSettings.xAxisCurrency
  );
}

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

function getValueAxisFormatter() {
  return createValueAxisFormatter({
    fallbackCurrency: defaultSettings.xAxisCurrency,
    formatterCache: state.formatterCache,
    settings: getFormatSettings(),
  });
}

function getMarkerValueFormatter() {
  return createStandardCurrencyFormatter({
    fallbackCurrency: defaultSettings.xAxisCurrency,
    formatterCache: state.formatterCache,
    settings: getFormatSettings(),
  });
}

function getChartOrientation() {
  return elements.orientationSelector.value;
}

function getCategoryAxisOptions(categories, isVertical) {
  const categoryLabelWidth = getHorizontalCategoryLabelWidth(
    elements.leftMarginSlider.value
  );

  return {
    categories,
    max: categories.length - 0.5,
    min: -0.5,
    reversed: !isVertical,
    tickLength: 0,
    tickPositions: categories.map((_, index) => index),
    title: {
      text: null,
    },
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

function getValueAxisOptions(axisBounds, valueAxisFormatter, isVertical) {
  return {
    gridLineWidth: 1,
    labels: isVertical
      ? {
          formatter() {
            return valueAxisFormatter.format(this.value);
          },
        }
      : {
          align: "center",
          formatter() {
            return valueAxisFormatter.format(this.value);
          },
          x: 0,
          y: 10,
        },
    max: axisBounds.max,
    min: axisBounds.min,
    opposite: !isVertical,
    tickLength: 0,
    title: {
      align: "middle",
      offset: 0,
      rotation: 0,
      style: { fontWeight: "bold", fontSize: 15 },
      text: null,
      x: 0,
      y: isVertical ? 0 : -20,
    },
  };
}

function clampToAxis(value, axisMin, axisMax) {
  return Math.min(Math.max(value, axisMin), axisMax);
}

function destroyUncertaintyLayer(chart) {
  if (!chart.uncertaintyLayer) {
    return;
  }

  chart.uncertaintyLayer.layer.destroy();
  chart.uncertaintyLayer.clipRect.destroy();
  chart.uncertaintyLayer.tooltipElement?.remove();
  chart.uncertaintyLayer = null;
}

function createUncertaintyTooltip(chart) {
  const tooltipElement = document.createElement("div");
  tooltipElement.className = "uncertainty-tooltip";
  tooltipElement.hidden = true;
  chart.renderTo.appendChild(tooltipElement);
  return tooltipElement;
}

function getTooltipMarkup(item) {
  return `
    <div class="uncertainty-tooltip-title">${escapeHtml(item.row.name)}</div>
    <div class="uncertainty-tooltip-grid">
      <span>Low</span><strong>${escapeHtml(item.formattedLow)}</strong>
      <span>Base</span><strong>${escapeHtml(item.formattedBase)}</strong>
      <span>High</span><strong>${escapeHtml(item.formattedHigh)}</strong>
      <span>Mean</span><strong>${escapeHtml(item.formattedMean)}</strong>
      <span>Spread</span><strong>${escapeHtml(item.formattedSpread)}</strong>
    </div>
  `;
}

function positionUncertaintyTooltip(chart, tooltipElement, event) {
  const chartBounds = chart.renderTo.getBoundingClientRect();
  const tooltipBounds = tooltipElement.getBoundingClientRect();
  const offset = 12;
  const maxLeft = chart.renderTo.clientWidth - tooltipBounds.width - offset;
  const maxTop = chart.renderTo.clientHeight - tooltipBounds.height - offset;
  const pointerLeft = event.clientX - chartBounds.left;
  const pointerTop = event.clientY - chartBounds.top;
  const nextLeft =
    pointerLeft + tooltipBounds.width + offset > chart.renderTo.clientWidth
      ? pointerLeft - tooltipBounds.width - offset
      : pointerLeft + offset;
  const nextTop =
    pointerTop + tooltipBounds.height + offset > chart.renderTo.clientHeight
      ? pointerTop - tooltipBounds.height - offset
      : pointerTop + offset;

  tooltipElement.style.left = `${Math.max(offset, Math.min(nextLeft, maxLeft))}px`;
  tooltipElement.style.top = `${Math.max(offset, Math.min(nextTop, maxTop))}px`;
}

function showUncertaintyTooltip(chart, tooltipElement, item, event) {
  tooltipElement.innerHTML = getTooltipMarkup(item);
  tooltipElement.hidden = false;
  positionUncertaintyTooltip(chart, tooltipElement, event);
}

function hideUncertaintyTooltip(tooltipElement) {
  tooltipElement.hidden = true;
}

function drawMeanMarker(renderer, layer, x, yCenter, barThickness) {
  const markerSize = Math.min(13, Math.max(8, barThickness * 0.36));
  const halfSize = markerSize / 2;
  const top = yCenter - halfSize;
  const bottom = yCenter + halfSize;

  [
    [
      ["M", x - halfSize, top],
      ["L", x + halfSize, bottom],
    ],
    [
      ["M", x + halfSize, top],
      ["L", x - halfSize, bottom],
    ],
  ].forEach((path) => {
    renderer
      .path(path)
      .attr({
        stroke: "#0f172a",
        "stroke-linecap": "round",
        "stroke-width": 2,
      })
      .css({
        pointerEvents: "none",
      })
      .add(layer);
  });
}

function rangesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

function getRangeOverlapWidth(firstStart, firstEnd, secondStart, secondEnd) {
  return Math.max(
    0,
    Math.min(firstEnd, secondEnd) - Math.max(firstStart, secondStart)
  );
}

function clampPixelPosition(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function positionBaseLabel(label, chart, baseX, yCenter, meanX = null) {
  const labelOffset = 8;
  const markerClearance = 14;
  const plotLeft = chart.plotLeft;
  const plotRight = chart.plotLeft + chart.plotWidth;
  const labelBox = label.getBBox();
  const labelWidth = labelBox.width;
  const labelY = yCenter + labelBox.height / 3;
  const minX = plotLeft + labelOffset;
  const maxX = plotRight - labelWidth - labelOffset;
  const rightX = clampPixelPosition(
    baseX + labelOffset,
    minX,
    maxX
  );
  const leftX = clampPixelPosition(
    baseX - labelWidth - labelOffset,
    minX,
    maxX
  );

  if (meanX === null) {
    label.attr({ x: rightX, y: labelY });
    return;
  }

  const meanStart = meanX - markerClearance;
  const meanEnd = meanX + markerClearance;
  const rightOverlapsMean = rangesOverlap(
    rightX,
    rightX + labelWidth,
    meanStart,
    meanEnd
  );
  const leftOverlapsMean = rangesOverlap(
    leftX,
    leftX + labelWidth,
    meanStart,
    meanEnd
  );

  if (!rightOverlapsMean) {
    label.attr({ x: rightX, y: labelY });
    return;
  }

  if (!leftOverlapsMean) {
    label.attr({ x: leftX, y: labelY });
    return;
  }

  const candidates = [
    rightX,
    leftX,
    clampPixelPosition(meanEnd + labelOffset, minX, maxX),
    clampPixelPosition(meanStart - labelWidth - labelOffset, minX, maxX),
  ];
  const bestCandidate = candidates.reduce((bestX, candidateX) => {
    const candidateOverlap = getRangeOverlapWidth(
      candidateX,
      candidateX + labelWidth,
      meanStart,
      meanEnd
    );
    const bestOverlap = getRangeOverlapWidth(
      bestX,
      bestX + labelWidth,
      meanStart,
      meanEnd
    );

    if (candidateOverlap !== bestOverlap) {
      return candidateOverlap < bestOverlap ? candidateX : bestX;
    }

    return Math.abs(candidateX - baseX) < Math.abs(bestX - baseX)
      ? candidateX
      : bestX;
  }, rightX);

  label.attr({
    x: bestCandidate,
    y: labelY,
  });
}

function getBestVerticalLabelBaseline({
  baseY,
  labelHeight,
  maxY,
  meanY = null,
  minY,
}) {
  const labelOffset = 8;
  const markerClearance = 14;
  const candidates = [
    baseY - labelOffset,
    baseY + labelHeight + labelOffset,
  ];

  if (meanY !== null) {
    candidates.push(
      meanY - markerClearance - labelOffset,
      meanY + markerClearance + labelHeight + labelOffset
    );
  }

  const validCandidates = candidates.filter(
    (candidateY) => candidateY >= minY && candidateY <= maxY
  );

  if (validCandidates.length === 0) {
    return null;
  }

  return validCandidates.reduce((bestY, candidateY) => {
    const candidateOverlap =
      meanY === null
        ? 0
        : getRangeOverlapWidth(
            candidateY - labelHeight,
            candidateY,
            meanY - markerClearance,
            meanY + markerClearance
          );
    const bestOverlap =
      meanY === null
        ? 0
        : getRangeOverlapWidth(
            bestY - labelHeight,
            bestY,
            meanY - markerClearance,
            meanY + markerClearance
          );

    if (candidateOverlap !== bestOverlap) {
      return candidateOverlap < bestOverlap ? candidateY : bestY;
    }

    return Math.abs(candidateY - baseY) < Math.abs(bestY - baseY)
      ? candidateY
      : bestY;
  }, validCandidates[0]);
}

function getClampedCenter(value, min, max) {
  return min <= max ? clampPixelPosition(value, min, max) : value;
}

function drawVerticalBaseLabel({
  barThickness,
  baseY,
  categoryCenter,
  chart,
  layer,
  meanY,
  rangeBottom,
  rangeTop,
  renderer,
  text,
}) {
  const fontStyles = {
    fontSize: "12px",
    fontWeight: "700",
    pointerEvents: "none",
  };
  const insidePadding = 4;
  const measure = renderer
    .text(text, 0, 0)
    .attr({
      align: "center",
    })
    .css(fontStyles)
    .add(layer);
  const textBox = measure.getBBox();
  measure.destroy();
  const fitsInsideBarWidth = textBox.width <= barThickness - insidePadding * 2;
  const insideBaseline = fitsInsideBarWidth
    ? getBestVerticalLabelBaseline({
        baseY,
        labelHeight: textBox.height,
        maxY: rangeBottom - insidePadding,
        meanY,
        minY: rangeTop + insidePadding + textBox.height,
      })
    : null;

  if (insideBaseline !== null) {
    renderer
      .text(text, categoryCenter, insideBaseline)
      .attr({
        align: "center",
      })
      .css({
        ...fontStyles,
        color: "#ffffff",
      })
      .add(layer);
    return;
  }

  const pillPaddingX = 6;
  const pillPaddingY = 4;
  const pillWidth = textBox.width + pillPaddingX * 2;
  const pillHeight = textBox.height + pillPaddingY * 2;
  const plotPadding = 2;
  const minCenterX = chart.plotLeft + pillWidth / 2 + plotPadding;
  const maxCenterX =
    chart.plotLeft + chart.plotWidth - pillWidth / 2 - plotPadding;
  const pillCenterX = getClampedCenter(categoryCenter, minCenterX, maxCenterX);
  const minBaseline = chart.plotTop + pillHeight + plotPadding;
  const maxBaseline = chart.plotTop + chart.plotHeight - plotPadding;
  const pillBaseline =
    getBestVerticalLabelBaseline({
      baseY,
      labelHeight: pillHeight,
      maxY: maxBaseline,
      meanY,
      minY: minBaseline,
    }) ??
    (minBaseline <= maxBaseline
      ? clampPixelPosition(baseY - 8, minBaseline, maxBaseline)
      : chart.plotTop + pillHeight);
  const pillLeft = pillCenterX - pillWidth / 2;
  const pillTop = pillBaseline - pillHeight;
  const pillBottom = pillTop + pillHeight;
  const connectorEndY =
    baseY < pillTop ? pillTop : baseY > pillBottom ? pillBottom : null;

  if (connectorEndY !== null) {
    renderer
      .path([
        ["M", categoryCenter, baseY],
        ["L", pillCenterX, connectorEndY],
      ])
      .attr({
        stroke: "#334155",
        "stroke-linecap": "round",
        "stroke-width": 1.5,
      })
      .css({
        pointerEvents: "none",
      })
      .add(layer);
  }

  renderer
    .rect(pillLeft, pillTop, pillWidth, pillHeight, 4)
    .attr({
      fill: "#ffffff",
      opacity: 0.96,
      stroke: "#cbd5e1",
      "stroke-width": 1,
    })
    .css({
      pointerEvents: "none",
    })
    .add(layer);

  renderer
    .text(text, pillCenterX, pillTop + pillPaddingY - textBox.y)
    .attr({
      align: "center",
    })
    .css({
      ...fontStyles,
      color: "#0f172a",
    })
    .add(layer);
}

function attachRangeTooltip(range, chart, tooltipElement, item) {
  range.element.addEventListener("mouseenter", (event) => {
    showUncertaintyTooltip(chart, tooltipElement, item, event);
  });
  range.element.addEventListener("mousemove", (event) => {
    positionUncertaintyTooltip(chart, tooltipElement, event);
  });
  range.element.addEventListener("mouseleave", () => {
    hideUncertaintyTooltip(tooltipElement);
  });
}

function drawUncertaintyRanges(chart) {
  const config = chart.options.custom?.uncertainty;
  if (!config) {
    destroyUncertaintyLayer(chart);
    return;
  }

  destroyUncertaintyLayer(chart);

  const isVertical = config.orientation === "vertical";
  const valueAxis = isVertical ? chart.yAxis[0] : chart.xAxis[0];
  const categoryAxis = isVertical ? chart.xAxis[0] : chart.yAxis[0];
  const axisMin = valueAxis.min ?? config.axisBounds.min;
  const axisMax = valueAxis.max ?? config.axisBounds.max;
  const renderer = chart.renderer;
  const clipRect = renderer.clipRect(
    chart.plotLeft,
    chart.plotTop,
    chart.plotWidth,
    chart.plotHeight
  );
  const layer = renderer
    .g("uncertainty-ranges")
    .attr({ zIndex: 3 })
    .clip(clipRect)
    .add();
  const tooltipElement = createUncertaintyTooltip(chart);
  const categorySpan = isVertical ? chart.plotWidth : chart.plotHeight;
  const categoryStep =
    config.rows.length > 1
      ? Math.abs(categoryAxis.toPixels(1) - categoryAxis.toPixels(0))
      : categorySpan / Math.max(config.rows.length, 1);
  const maxBarThickness = Math.max(8, categoryStep - 6);
  const barThickness = Math.max(
    6,
    Math.min(maxBarThickness, categoryStep * config.barHeight)
  );

  config.rows.forEach((item) => {
    if (item.empty) {
      return;
    }

    const { row } = item;
    const visibleLow = clampToAxis(row.low, axisMin, axisMax);
    const visibleHigh = clampToAxis(row.high, axisMin, axisMax);

    if (visibleLow === visibleHigh) {
      return;
    }

    const categoryCenter = categoryAxis.toPixels(item.index);
    const baseIsVisible = row.base >= visibleLow && row.base <= visibleHigh;
    const meanIsVisible = row.mean >= visibleLow && row.mean <= visibleHigh;
    const meanPosition =
      config.showMean && meanIsVisible ? valueAxis.toPixels(row.mean) : null;
    const titleText = `${row.name}: Low ${item.formattedLow}, Base ${item.formattedBase}, High ${item.formattedHigh}, Mean ${item.formattedMean}, Spread ${item.formattedSpread}`;

    if (isVertical) {
      const yLow = valueAxis.toPixels(visibleLow);
      const yHigh = valueAxis.toPixels(visibleHigh);
      const x = categoryCenter - barThickness / 2;
      const y = Math.min(yLow, yHigh);
      const height = Math.max(1, Math.abs(yHigh - yLow));
      const range = renderer
        .rect(x, y, barThickness, height, 0)
        .attr({
          "aria-label": titleText,
          fill: item.color,
          role: "img",
          stroke: UNCERTAINTY_BAR_BORDER_COLOR,
          "stroke-width": 1,
        })
        .add(layer);
      attachRangeTooltip(range, chart, tooltipElement, item);

      if (!baseIsVisible) {
        if (meanPosition !== null) {
          drawMeanMarker(renderer, layer, categoryCenter, meanPosition, barThickness);
        }
        return;
      }

      const baseY = valueAxis.toPixels(row.base);
      const lineLeft = x + 2;
      const lineRight = x + barThickness - 2;

      renderer
        .path([
          ["M", lineLeft, baseY],
          ["L", lineRight, baseY],
        ])
        .attr({
          stroke: "#ffffff",
          "stroke-linecap": "round",
          "stroke-width": 2,
        })
        .css({
          pointerEvents: "none",
        })
        .add(layer);

      if (config.showLabels) {
        drawVerticalBaseLabel({
          barThickness,
          baseY,
          categoryCenter,
          chart,
          layer,
          meanY: meanPosition,
          rangeBottom: y + height,
          rangeTop: y,
          renderer,
          text: item.formattedBase,
        });
      }

      if (meanPosition !== null) {
        drawMeanMarker(renderer, layer, categoryCenter, meanPosition, barThickness);
      }

      return;
    }

    const xLow = valueAxis.toPixels(visibleLow);
    const xHigh = valueAxis.toPixels(visibleHigh);
    const x = Math.min(xLow, xHigh);
    const width = Math.max(1, Math.abs(xHigh - xLow));
    const yCenter = categoryCenter;
    const y = yCenter - barThickness / 2;
    const range = renderer
      .rect(x, y, width, barThickness, 0)
      .attr({
        "aria-label": titleText,
        fill: item.color,
        role: "img",
        stroke: UNCERTAINTY_BAR_BORDER_COLOR,
        "stroke-width": 1,
      })
      .add(layer);
    attachRangeTooltip(range, chart, tooltipElement, item);

    if (!baseIsVisible) {
      if (meanPosition !== null) {
        drawMeanMarker(renderer, layer, meanPosition, yCenter, barThickness);
      }
      return;
    }

    const baseX = valueAxis.toPixels(row.base);
    const lineTop = y + 2;
    const lineBottom = y + barThickness - 2;

    renderer
      .path([
        ["M", baseX, lineTop],
        ["L", baseX, lineBottom],
      ])
      .attr({
        stroke: "#ffffff",
        "stroke-linecap": "round",
        "stroke-width": 2,
      })
      .css({
        pointerEvents: "none",
      })
      .add(layer);

    if (config.showLabels) {
      const label = renderer
        .text(item.formattedBase, baseX + 8, yCenter + 5)
        .css({
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: "700",
          pointerEvents: "none",
        })
        .add(layer);
      positionBaseLabel(label, chart, baseX, yCenter, meanPosition);
    }

    if (meanPosition !== null) {
      drawMeanMarker(renderer, layer, meanPosition, yCenter, barThickness);
    }
  });

  chart.uncertaintyLayer = { clipRect, layer, tooltipElement };
}

function getVisibleRangeData(slice) {
  const rangeFormatter = getValueAxisFormatter();
  const markerFormatter = getMarkerValueFormatter() ?? rangeFormatter;

  return slice.rows.map((row, index) => {
    if (row.empty) {
      return {
        empty: true,
        index,
        row,
      };
    }

    return {
      color: UNCERTAINTY_BAR_COLOR,
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

function getChartOptions() {
  const axisBounds = getAxisBounds();
  const isVertical = getChartOrientation() === "vertical";
  const slice = getSlice();
  const valueAxisFormatter = getValueAxisFormatter();
  const visibleRangeData = getVisibleRangeData(slice);
  const categoryAxisOptions = getCategoryAxisOptions(slice.categories, isVertical);
  const valueAxisOptions = getValueAxisOptions(
    axisBounds,
    valueAxisFormatter,
    isVertical
  );

  return {
    chart: {
      animation: false,
      events: {
        render() {
          drawUncertaintyRanges(this);
        },
      },
      height: Number.parseInt(elements.chartHeightSlider.value, 10),
      marginLeft: Number.parseInt(elements.leftMarginSlider.value, 10),
      marginRight: 72,
      spacingLeft: 0,
      spacingRight: 0,
    },
    custom: {
      uncertainty: {
        axisBounds,
        barHeight: Number.parseFloat(elements.barHeightSlider.value),
        orientation: getChartOrientation(),
        rows: visibleRangeData,
        showLabels: elements.toggleLabels.checked,
        showMean: elements.toggleMean.checked,
      },
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      scatter: {
        marker: {
          enabled: false,
        },
      },
      series: {
        animation: false,
        enableMouseTracking: false,
        states: {
          inactive: {
            opacity: 1,
          },
        },
      },
    },
    series: [
      {
        data: [],
        showInLegend: false,
        type: "scatter",
      },
    ],
    tooltip: {
      enabled: false,
    },
    xAxis: isVertical ? categoryAxisOptions : valueAxisOptions,
    yAxis: isVertical ? valueAxisOptions : categoryAxisOptions,
  };
}

function getChartConfig(options) {
  return {
    chart: options.chart,
    credits: { enabled: false },
    custom: options.custom,
    legend: options.legend,
    plotOptions: options.plotOptions,
    series: options.series,
    title: { text: "" },
    tooltip: options.tooltip,
    xAxis: options.xAxis,
    yAxis: options.yAxis,
  };
}

function getTableRenderKey() {
  return [
    getRowsCacheKey(),
    elements.sortSelector.value,
    elements.xAxisLocaleInput.value.trim(),
    elements.xAxisNotationSelect.value,
    elements.xAxisStyleSelect.value,
    getSanitizedCurrencyCode(),
    elements.xAxisFractionDigitsInput.value,
    elements.xAxisGroupingCheckbox.checked,
    elements.showDataTableCheckbox.checked,
  ].join("|");
}

function updateTableHighlights() {
  if (elements.dataTablePanel.hidden) {
    return;
  }

  const visibleIndexes = new Set(
    Array.from(
      {
        length: Math.max(
          0,
          Math.min(state.windowSize, getSortedRows().length - state.currentStart)
        ),
      },
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

  const tableFormatter = getMarkerValueFormatter() ?? getValueAxisFormatter();
  const allRows = getSortedRows();

  elements.dataTableBody.innerHTML = allRows
    .map((row, sortedIndex) => {
      const adjustments = [
        row.lowHighWereSwapped ? "low/high swapped for charting" : "",
        row.baseWasClamped ? "base clamped inside range" : "",
      ]
        .filter(Boolean)
        .join(", ");

      return `
        <tr data-row-id="${row.id}" data-sorted-index="${sortedIndex}">
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(tableFormatter.format(row.low))}</td>
          <td>${escapeHtml(tableFormatter.format(row.base))}</td>
          <td>${escapeHtml(tableFormatter.format(row.high))}</td>
          <td>${escapeHtml(tableFormatter.format(row.mean))}</td>
          <td class="${adjustments ? "table-warning" : ""}" title="${escapeHtml(adjustments)}">
            ${escapeHtml(tableFormatter.format(row.spread))}
          </td>
        </tr>
      `;
    })
    .join("");

  state.tableRows = Array.from(
    elements.dataTableBody.querySelectorAll("tr[data-sorted-index]")
  );
  state.tableRenderKey = renderKey;
  updateTableHighlights();
  updateDataStatus();
}

function updateDataStatus(message = "") {
  const adjustedCount = getNormalizedRows().filter(
    (row) => row.baseWasClamped || row.lowHighWereSwapped
  ).length;

  if (message) {
    elements.dataStatus.textContent = message;
    return;
  }

  elements.dataStatus.textContent =
    adjustedCount > 0
      ? `${state.rows.length} bars. ${adjustedCount} range inputs are adjusted in the chart.`
      : `${state.rows.length} bars.`;
}

function createChart(options) {
  state.chart = Highcharts.chart("container", getChartConfig(options));
}

function updateExistingChart(options) {
  const currentOrientation = state.chart.options.custom?.uncertainty?.orientation;
  const nextOrientation = options.custom?.uncertainty?.orientation;

  if (currentOrientation !== nextOrientation) {
    destroyUncertaintyLayer(state.chart);
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
      custom: options.custom,
      legend: options.legend,
      plotOptions: options.plotOptions,
      series: options.series,
      tooltip: options.tooltip,
      xAxis: options.xAxis,
      yAxis: options.yAxis,
    },
    true,
    true,
    false
  );
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

  const options = getChartOptions();
  updateExistingChart(options);
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

function changeDataset(datasetKey) {
  state.currentDatasetKey = datasetKey;
  state.rows = cloneDatasetRows(datasetKey);
  invalidateRowsCache();
  renderChart({ forceTableRender: true, resetScroll: true });
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
        ? state.rows.length
        : Number.parseInt(event.target.value, 10);
    renderChart({ resetScroll: true });
  });

  elements.toggleLabels.addEventListener("change", () => renderChart());
  elements.toggleMean.addEventListener("change", () => renderChart());
  elements.resetDefaultsButton.addEventListener("click", resetToDefaults);
  elements.showDataTableCheckbox.addEventListener("change", () =>
    renderDataTable({ force: true })
  );
  elements.orientationSelector.addEventListener("change", () => renderChart());
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
    changeDataset(event.target.value);
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

export function initializeUncertaintyApp() {
  state.rows = cloneDatasetRows(defaultSettings.datasetKey);
  applyDefaultSettings({ preserveRows: true });
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

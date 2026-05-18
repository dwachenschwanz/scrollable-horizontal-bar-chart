import {
  createUncertaintyChartViewModel,
  mountUncertaintyChart,
} from "../../src/chartkit/index.js";
import {
  createAxisFormatControls,
  createChartWindowControls,
  createControlTabs,
  createDataTableControls,
  createFloatingSidebarController,
  debounce,
  escapeHtml,
} from "../../src/chartkit/demo-controls.js";

const TRACK_HEIGHT = 300;
const UNCERTAINTY_BAR_COLOR = "#2caffe";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "uncertaintySidebarCollapsed";
const SIDEBAR_POSITION_STORAGE_KEY = "uncertaintySidebarPosition";
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
  chart: null,
  chartMount: null,
  currentDatasetKey: defaultSettings.datasetKey,
  formatterCache: new Map(),
  nextRowId: 1,
  rows: [],
  viewModelCache: null,
  viewModelCacheKey: "",
};

const elements = {
  advancedDisplayControls: document.getElementById("advancedDisplayControls"),
  autoScaleCheckbox: document.getElementById("autoScaleCheckbox"),
  barHeightSlider: document.getElementById("barHeightSlider"),
  barHeightValue: document.getElementById("barHeightValue"),
  chartContainer: document.getElementById("chart-container"),
  chartHeightSlider: document.getElementById("chartHeightSlider"),
  chartHeightValue: document.getElementById("chartHeightValue"),
  chartSurface: document.getElementById("container"),
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
  yMaxFormattedValue: document.getElementById("yMaxFormattedValue"),
  yMaxInput: document.getElementById("yMaxInput"),
  yMinFormattedValue: document.getElementById("yMinFormattedValue"),
  yMinInput: document.getElementById("yMinInput"),
};

const controlTabs = createControlTabs({
  panels: elements.controlsPanels,
  tabs: elements.controlsTabs,
});
const sidebarController = createFloatingSidebarController({
  elements: {
    controlsContent: elements.controlsContent,
    controlsSidebar: elements.controlsSidebar,
    sidebarDragHandle: elements.sidebarDragHandle,
    sidebarToggle: elements.sidebarToggle,
    sidebarToggleIcon: elements.sidebarToggleIcon,
    sidebarToggleText: elements.sidebarToggleText,
    workspace: elements.workspace,
  },
  onLayoutChange: () => state.chart?.reflow(),
  storageKeys: {
    collapsed: SIDEBAR_COLLAPSED_STORAGE_KEY,
    position: SIDEBAR_POSITION_STORAGE_KEY,
  },
});
const axisControls = createAxisFormatControls({
  elements: {
    autoScaleCheckbox: elements.autoScaleCheckbox,
    xAxisCurrencyInput: elements.xAxisCurrencyInput,
    xAxisCurrencyStatus: elements.xAxisCurrencyStatus,
    xAxisFractionDigitsInput: elements.xAxisFractionDigitsInput,
    xAxisGroupingCheckbox: elements.xAxisGroupingCheckbox,
    xAxisLocaleInput: elements.xAxisLocaleInput,
    xAxisNotationSelect: elements.xAxisNotationSelect,
    xAxisStyleSelect: elements.xAxisStyleSelect,
    yMaxFormattedValue: elements.yMaxFormattedValue,
    yMaxInput: elements.yMaxInput,
    yMinFormattedValue: elements.yMinFormattedValue,
    yMinInput: elements.yMinInput,
  },
  fallbackCurrency: defaultSettings.xAxisCurrency,
  formatterCache: state.formatterCache,
});
const windowControls = createChartWindowControls({
  elements: {
    dynamicSliderStyle: elements.dynamicSliderStyle,
    scrollbar: elements.scrollbar,
    sliderStatus: elements.sliderStatus,
  },
  getTotal: () => state.rows.length,
  initialWindowSize: Number.parseInt(defaultSettings.windowSize, 10),
  minThumbHeight: 32,
  onScrollPosition: () => updateChartWindow(),
  onWindowChange: () => invalidateViewModelCache(),
  trackHeight: TRACK_HEIGHT,
});
const dataTableControls = createDataTableControls({
  elements: {
    dataTableBody: elements.dataTableBody,
    dataTablePanel: elements.dataTablePanel,
    showDataTableCheckbox: elements.showDataTableCheckbox,
    tableSortButtons: elements.tableSortButtons,
  },
  getRenderKey: () => getTableRenderKey(),
  getSortMode: () => elements.sortSelector.value,
  getVisibleIndexes: () =>
    windowControls.getVisibleIndexes(getViewModel().sortedRows.length),
  onAfterRender: () => updateDataStatus(),
  renderRows: () => getDataTableRowsMarkup(),
  sortFields: ["low", "base", "high", "mean", "spread"],
});

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

function applyDefaultSettings({ preserveRows = true } = {}) {
  if (!preserveRows) {
    state.currentDatasetKey = defaultSettings.datasetKey;
    elements.datasetSelector.value = defaultSettings.datasetKey;
    state.rows = cloneDatasetRows(defaultSettings.datasetKey);
  }

  windowControls.reset({
    windowSize: Number.parseInt(defaultSettings.windowSize, 10),
  });

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

  controlTabs.setActive(defaultSettings.activeTab);
}

function resetToDefaults() {
  applyDefaultSettings({ preserveRows: true });
  invalidateViewModelCache();
  updateLeftMarginDisplay();
  updateBarHeightDisplay();
  updateChartHeightDisplay();
  axisControls.updateCurrencyInputState();
  dataTableControls.updateVisibility();
  axisControls.updateYAxisInputState();
  renderChart({ forceTableRender: true, resetScroll: true });
}

function invalidateViewModelCache() {
  state.viewModelCache = null;
  state.viewModelCacheKey = "";
}

function setSortMode(sortMode, { resetScroll = true } = {}) {
  elements.sortSelector.value = sortMode;
  invalidateViewModelCache();
  renderChart({ forceTableRender: true, resetScroll });
}

function getRowsCacheKey() {
  return state.rows
    .map((row) => [row.id, row.name, row.low, row.base, row.high].join(":"))
    .join("|");
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

function getViewModelSettings() {
  return {
    autoScale: elements.autoScaleCheckbox.checked,
    barHeight: elements.barHeightSlider.value,
    chartHeight: elements.chartHeightSlider.value,
    color: UNCERTAINTY_BAR_COLOR,
    currentStart: windowControls.currentStart,
    leftMargin: elements.leftMarginSlider.value,
    orientation: elements.orientationSelector.value,
    showLabels: elements.toggleLabels.checked,
    showMean: elements.toggleMean.checked,
    sort: elements.sortSelector.value,
    windowSize: windowControls.windowSize,
    yMax: elements.yMaxInput.value,
    yMin: elements.yMinInput.value,
  };
}

function getViewModelCacheKey() {
  const settings = getViewModelSettings();

  return [
    getRowsCacheKey(),
    settings.autoScale,
    settings.barHeight,
    settings.chartHeight,
    settings.color,
    settings.currentStart,
    settings.leftMargin,
    settings.orientation,
    settings.showLabels,
    settings.showMean,
    settings.sort,
    settings.windowSize,
    settings.autoScale ? "" : settings.yMax,
    settings.autoScale ? "" : settings.yMin,
    ...axisControls.getFormatRenderKeyParts(),
  ].join("|");
}

function getViewModel() {
  const cacheKey = getViewModelCacheKey();

  if (state.viewModelCache && state.viewModelCacheKey === cacheKey) {
    return state.viewModelCache;
  }

  const rangeFormatter = axisControls.getValueAxisFormatter();

  state.viewModelCache = createUncertaintyChartViewModel({
    formatters: {
      markerFormatter: axisControls.getStandardCurrencyFormatter() ?? rangeFormatter,
      rangeFormatter,
      valueAxisFormatter: rangeFormatter,
    },
    rows: state.rows,
    settings: getViewModelSettings(),
  });
  state.viewModelCacheKey = cacheKey;
  return state.viewModelCache;
}

function syncAxisBoundsControls(axisBounds) {
  elements.yMinInput.value = String(axisBounds.min);
  elements.yMaxInput.value = String(axisBounds.max);
  axisControls.updateAxisBoundDisplays(axisBounds);
}

function getTableRenderKey() {
  return [
    getRowsCacheKey(),
    elements.sortSelector.value,
    ...axisControls.getFormatRenderKeyParts(),
    elements.showDataTableCheckbox.checked,
  ].join("|");
}

function getDataTableRowsMarkup() {
  const tableFormatter =
    axisControls.getStandardCurrencyFormatter() ??
    axisControls.getValueAxisFormatter();
  const allRows = getViewModel().sortedRows;

  return allRows
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
}

function updateDataStatus(message = "") {
  const adjustedCount = getViewModel().normalizedRows.filter(
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

function getChartMount() {
  if (!state.chartMount) {
    state.chartMount = mountUncertaintyChart(elements.chartSurface);
  }

  return state.chartMount;
}

function renderChart({ forceTableRender = false, resetScroll = false } = {}) {
  if (resetScroll) {
    windowControls.reset();
  }

  windowControls.clampCurrentStart();
  updateLeftMarginDisplay();
  windowControls.updateScrollbar();

  const viewModel = getViewModel();

  syncAxisBoundsControls(viewModel.axisBounds);
  state.chart = getChartMount().update(viewModel.chartOptions);

  dataTableControls.render({ force: forceTableRender });
}

function updateChartWindow() {
  if (!state.chart) {
    return;
  }

  const viewModel = getViewModel();
  syncAxisBoundsControls(viewModel.axisBounds);
  state.chart = getChartMount().update(viewModel.chartOptions);
  dataTableControls.updateHighlights();
}

function changeDataset(datasetKey) {
  state.currentDatasetKey = datasetKey;
  state.rows = cloneDatasetRows(datasetKey);
  invalidateViewModelCache();
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
  controlTabs.bindEvents();
  sidebarController.bindEvents();

  elements.windowSizeSelector.addEventListener("change", (event) => {
    windowControls.setWindowSize(
      event.target.value === "max"
        ? state.rows.length
        : Number.parseInt(event.target.value, 10)
    );
    renderChart();
  });

  elements.toggleLabels.addEventListener("change", () => renderChart());
  elements.toggleMean.addEventListener("change", () => renderChart());
  elements.resetDefaultsButton.addEventListener("click", resetToDefaults);
  elements.showDataTableCheckbox.addEventListener("change", () =>
    dataTableControls.render({ force: true })
  );
  elements.orientationSelector.addEventListener("change", () => renderChart());
  elements.leftMarginSlider.addEventListener("input", () => renderChart());
  elements.sortSelector.addEventListener("change", (event) => {
    setSortMode(event.target.value);
  });
  dataTableControls.bindSortButtons({ onSortMode: setSortMode });
  elements.barHeightSlider.addEventListener("input", () => {
    updateBarHeightDisplay();
    renderChart();
  });
  elements.chartHeightSlider.addEventListener("input", () => {
    updateChartHeightDisplay();
    renderChart();
  });
  elements.autoScaleCheckbox.addEventListener("change", () => {
    axisControls.updateYAxisInputState();
    renderChart();
  });
  elements.yMinInput.addEventListener("input", debouncedManualAxisRender);
  elements.yMaxInput.addEventListener("input", debouncedManualAxisRender);
  elements.datasetSelector.addEventListener("change", (event) => {
    changeDataset(event.target.value);
  });
  axisControls.bindFormatEvents({
    onFormatInput: debouncedFormatRender,
    onFormatRender: () => renderChart({ forceTableRender: true }),
  });
  windowControls.bindScrollbar();
}

export function initializeUncertaintyApp() {
  state.rows = cloneDatasetRows(defaultSettings.datasetKey);
  applyDefaultSettings({ preserveRows: true });
  sidebarController.applyStoredState();
  sidebarController.applyStoredPosition();
  updateLeftMarginDisplay();
  updateBarHeightDisplay();
  updateChartHeightDisplay();
  axisControls.updateCurrencyInputState();
  axisControls.normalizeCurrencyInput();
  axisControls.updateCurrencyValidationState();
  dataTableControls.updateVisibility();
  axisControls.updateYAxisInputState();
  bindEvents();
  renderChart({ forceTableRender: true, resetScroll: true });
}

import {
  createBarChartViewModel,
  createChartHeightResizeControls,
  mountBarChart,
} from "./chartkit/index.js";
import {
  createAxisFormatControls,
  createChartWindowControls,
  createControlTabs,
  createDataTableControls,
  createFloatingSidebarController,
  debounce,
  escapeHtml,
} from "./chartkit/demo-controls.js";
import compareValueSource from "./actionMenu/compareValue.json";
import { extractCompareValueDatasets } from "./value-datasets.js";

const TRACK_HEIGHT = 300;
const SIDEBAR_COLLAPSED_STORAGE_KEY = "chartSidebarCollapsed";
const SIDEBAR_POSITION_STORAGE_KEY = "chartSidebarPosition";
const demoDatasets = extractCompareValueDatasets(compareValueSource);
const defaultDatasetKey = demoDatasets[0]?.key ?? "";
const defaultSettings = {
  activeTab: "display",
  advancedDisplayOpen: false,
  autoScale: true,
  barHeight: "0.75",
  chartHeight: "400",
  datasetKey: defaultDatasetKey,
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

const state = {
  chart: null,
  chartMount: null,
  currentDatasetKey: defaultSettings.datasetKey,
  formatterCache: new Map(),
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
  chartResizeHandle: document.getElementById("chartResizeHandle"),
  chartSurface: document.getElementById("container"),
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
  getTotal: () => getCurrentDataset().data.length,
  initialWindowSize: Number.parseInt(defaultSettings.windowSize, 10),
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
    windowControls.getVisibleIndexes(getViewModel().sortedPairs.length),
  renderRows: () => getDataTableRowsMarkup(),
  sortFields: ["name", "value"],
});
const chartHeightControls = createChartHeightResizeControls({
  debounce,
  defaultHeight: defaultSettings.chartHeight,
  elements: {
    chartContainer: elements.chartContainer,
    chartHeightSlider: elements.chartHeightSlider,
    chartHeightValue: elements.chartHeightValue,
    chartResizeHandle: elements.chartResizeHandle,
    chartSurface: elements.chartSurface,
  },
  onChange: () => renderChart(),
});

function applyDefaultSettings({ preserveDataset = false } = {}) {
  if (!preserveDataset) {
    state.currentDatasetKey = defaultSettings.datasetKey;
    elements.datasetSelector.value = defaultSettings.datasetKey;
  }

  windowControls.reset({
    windowSize: Number.parseInt(defaultSettings.windowSize, 10),
  });

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

  controlTabs.setActive(defaultSettings.activeTab);
}

function resetToDefaults() {
  applyDefaultSettings({ preserveDataset: true });
  invalidateViewModelCache();
  updateLeftMarginDisplay();
  updateBarHeightDisplay();
  chartHeightControls.setHeight(elements.chartHeightSlider.value);
  axisControls.updateCurrencyInputState();
  dataTableControls.updateVisibility();
  axisControls.updateYAxisInputState();
  renderChart({ resetScroll: true, forceTableRender: true });
}

function getCurrentDataset() {
  return getCurrentDatasetByKey(state.currentDatasetKey);
}

function getCurrentDatasetByKey(datasetKey) {
  return (
    demoDatasets.find((dataset) => dataset.key === datasetKey) ??
    demoDatasets[0] ?? { categories: [], data: [], key: "", name: "" }
  );
}

function populateDatasetSelector() {
  elements.datasetSelector.innerHTML = demoDatasets
    .map(
      (dataset) =>
        `<option value="${escapeHtml(dataset.key)}">${escapeHtml(dataset.name)}</option>`
    )
    .join("");
  elements.datasetSelector.disabled = demoDatasets.length === 0;
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

function updateLeftMarginDisplay() {
  elements.leftMarginValue.textContent = elements.leftMarginSlider.value;
}

function updateBarHeightDisplay() {
  elements.barHeightValue.textContent = elements.barHeightSlider.value;
}

function getViewModelSettings() {
  return {
    autoScale: elements.autoScaleCheckbox.checked,
    barHeight: elements.barHeightSlider.value,
    chartHeight: elements.chartHeightSlider.value,
    currentStart: windowControls.currentStart,
    leftMargin: elements.leftMarginSlider.value,
    orientation: elements.orientationSelector.value,
    showLabels: elements.toggleLabels.checked,
    sort: elements.sortSelector.value,
    windowSize: windowControls.windowSize,
    yMax: elements.yMaxInput.value,
    yMin: elements.yMinInput.value,
  };
}

function getViewModelCacheKey() {
  const settings = getViewModelSettings();

  return [
    state.currentDatasetKey,
    settings.autoScale,
    settings.barHeight,
    settings.chartHeight,
    settings.currentStart,
    settings.leftMargin,
    settings.orientation,
    settings.showLabels,
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

  state.viewModelCache = createBarChartViewModel({
    categories: getCurrentDataset().categories,
    data: getCurrentDataset().data,
    formatters: {
      barValueFormatter: axisControls.getStandardCurrencyFormatter(),
      valueAxisFormatter: axisControls.getValueAxisFormatter(),
    },
    settings: getViewModelSettings(),
  });
  state.viewModelCacheKey = cacheKey;
  return state.viewModelCache;
}

function syncAxisBoundsControls(axisBounds) {
  const { min, max } = axisBounds;

  if (min !== null) {
    elements.yMinInput.value = String(min);
  }

  if (max !== null) {
    elements.yMaxInput.value = String(max);
  }

  axisControls.updateAxisBoundDisplays(axisBounds);
}

function getTableRenderKey() {
  return [
    state.currentDatasetKey,
    elements.sortSelector.value,
    ...axisControls.getFormatRenderKeyParts(),
  ].join("|");
}

function getDataTableRowsMarkup() {
  const tableFormatter =
    axisControls.getStandardCurrencyFormatter() ??
    axisControls.getValueAxisFormatter();
  const allRows = getViewModel().sortedPairs;

  return allRows
    .map(
      (item, sortedIndex) => `
        <tr data-sorted-index="${sortedIndex}">
          <td>${escapeHtml(item.name)}</td>
          <td>${tableFormatter.format(item.y)}</td>
        </tr>
      `
    )
    .join("");
}

function getChartMount() {
  if (!state.chartMount) {
    state.chartMount = mountBarChart(elements.chartSurface);
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

  state.chart = state.chartMount.updateWindow({
    categoryAxisOptions: viewModel.categoryAxisOptions,
    data: viewModel.slice.data,
  });
  dataTableControls.updateHighlights();
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
        ? getCurrentDataset().data.length
        : Number.parseInt(event.target.value, 10)
    );
    renderChart();
  });

  elements.toggleLabels.addEventListener("change", () => renderChart());
  elements.orientationSelector.addEventListener("change", () => renderChart());
  elements.resetDefaultsButton.addEventListener("click", resetToDefaults);
  elements.showDataTableCheckbox.addEventListener("change", () =>
    dataTableControls.render({ force: true })
  );
  elements.leftMarginSlider.addEventListener("input", () => renderChart());
  elements.sortSelector.addEventListener("change", (event) => {
    setSortMode(event.target.value);
  });
  dataTableControls.bindSortButtons({ onSortMode: setSortMode });
  elements.barHeightSlider.addEventListener("input", () => {
    updateBarHeightDisplay();
    renderChart();
  });
  elements.autoScaleCheckbox.addEventListener("change", () => {
    axisControls.updateYAxisInputState();
    renderChart();
  });
  elements.yMinInput.addEventListener("input", debouncedManualAxisRender);
  elements.yMaxInput.addEventListener("input", debouncedManualAxisRender);
  elements.datasetSelector.addEventListener("change", (event) => {
    state.currentDatasetKey = getCurrentDatasetByKey(event.target.value).key;
    invalidateViewModelCache();
    renderChart({ forceTableRender: true, resetScroll: true });
  });
  axisControls.bindFormatEvents({
    onFormatInput: debouncedFormatRender,
    onFormatRender: () => renderChart({ forceTableRender: true }),
  });
  windowControls.bindScrollbar();
  chartHeightControls.bindEvents();
}

export function initializeChartApp() {
  populateDatasetSelector();
  elements.datasetSelector.value = defaultSettings.datasetKey;
  applyDefaultSettings();
  sidebarController.applyStoredState();
  sidebarController.applyStoredPosition();
  updateLeftMarginDisplay();
  updateBarHeightDisplay();
  chartHeightControls.setHeight(elements.chartHeightSlider.value);
  axisControls.updateCurrencyInputState();
  axisControls.normalizeCurrencyInput();
  axisControls.updateCurrencyValidationState();
  dataTableControls.updateVisibility();
  axisControls.updateYAxisInputState();
  bindEvents();
  renderChart({ forceTableRender: true, resetScroll: true });
}

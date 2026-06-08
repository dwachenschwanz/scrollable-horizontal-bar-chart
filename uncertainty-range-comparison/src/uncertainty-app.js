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
import compareUncertaintySource from "./actionMenu/compareUncertainty.json";
import { extractCompareUncertaintyDatasets } from "./uncertainty-datasets.js";

const TRACK_HEIGHT = 300;
const CHART_HEIGHT_VIEWPORT_PADDING = 24;
const UNCERTAINTY_BAR_COLOR = "#2caffe";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "uncertaintySidebarCollapsed";
const SIDEBAR_POSITION_STORAGE_KEY = "uncertaintySidebarPosition";
const demoDatasets = extractCompareUncertaintyDatasets(compareUncertaintySource);
const defaultDatasetKey = demoDatasets[0]?.key ?? "";
const defaultSettings = {
  activeTab: "display",
  advancedDisplayOpen: false,
  autoScale: true,
  barHeight: "0.72",
  chartHeight: "400",
  datasetKey: defaultDatasetKey,
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
  chartResizeHandle: document.getElementById("chartResizeHandle"),
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
    base: String(row.base ?? 0),
    high: String(row.high ?? 0),
    id,
    low: String(row.low ?? 0),
    name: String(row.name ?? ""),
  };
}

function getDataset(datasetKey) {
  return (
    demoDatasets.find((dataset) => dataset.key === datasetKey) ??
    demoDatasets[0] ?? { key: "", name: "", rows: [] }
  );
}

function cloneDatasetRows(datasetKey) {
  return getDataset(datasetKey).rows.map((row) => createRow(row));
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
  setChartHeight(Number.parseInt(elements.chartHeightSlider.value, 10));
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
  getChartHeightBounds();
  elements.chartHeightValue.textContent = elements.chartHeightSlider.value;
  elements.chartContainer.style.setProperty(
    "--chart-height",
    `${elements.chartHeightSlider.value}px`
  );
  elements.chartResizeHandle?.setAttribute(
    "aria-valuenow",
    elements.chartHeightSlider.value
  );
}

function getChartHeightBounds() {
  const min = Number.parseInt(elements.chartHeightSlider.min, 10);
  const step = Number.parseInt(elements.chartHeightSlider.step, 10);
  const chartSurfaceTop = elements.chartSurface.getBoundingClientRect().top;
  const availableHeight =
    window.innerHeight - chartSurfaceTop - CHART_HEIGHT_VIEWPORT_PADDING;
  const max = Math.max(min, Math.floor(availableHeight / step) * step);

  elements.chartHeightSlider.max = String(max);
  elements.chartResizeHandle?.setAttribute("aria-valuemax", String(max));

  return {
    max,
    min,
    step,
  };
}

function setChartHeight(height) {
  const { max, min, step } = getChartHeightBounds();
  const snappedHeight = Math.round(height / step) * step;
  const chartHeight = Math.min(max, Math.max(min, snappedHeight));

  elements.chartHeightSlider.value = String(chartHeight);
  updateChartHeightDisplay();
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
  const dataset = getDataset(datasetKey);
  state.currentDatasetKey = dataset.key;
  state.rows = cloneDatasetRows(dataset.key);
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
  elements.chartHeightSlider.addEventListener("input", (event) => {
    setChartHeight(Number.parseInt(event.target.value, 10));
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
  window.addEventListener(
    "resize",
    debounce(() => {
      setChartHeight(Number.parseInt(elements.chartHeightSlider.value, 10));
      renderChart();
    }, 120)
  );
}

function bindChartResizeHandle() {
  const handle = elements.chartResizeHandle;

  if (!handle) {
    return;
  }

  let dragStartY = 0;
  let dragStartHeight = Number.parseInt(defaultSettings.chartHeight, 10);

  function getCurrentChartHeight() {
    const currentHeight = Number.parseInt(elements.chartHeightSlider.value, 10);

    return Number.isFinite(currentHeight)
      ? currentHeight
      : Number.parseInt(defaultSettings.chartHeight, 10);
  }

  function endDrag() {
    handle.classList.remove("is-dragging");
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", endDrag);
    document.removeEventListener("pointercancel", endDrag);
  }

  function onPointerMove(event) {
    setChartHeight(dragStartHeight + event.clientY - dragStartY);
    renderChart();
  }

  function resetChartHeight() {
    setChartHeight(Number.parseInt(defaultSettings.chartHeight, 10));
    renderChart();
  }

  handle.addEventListener("dblclick", resetChartHeight);

  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    dragStartY = event.clientY;
    dragStartHeight = getCurrentChartHeight();
    handle.classList.add("is-dragging");
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", endDrag, { once: true });
    document.addEventListener("pointercancel", endDrag, { once: true });
  });

  handle.addEventListener("keydown", (event) => {
    const { max, min, step: sliderStep } = getChartHeightBounds();
    const step = event.shiftKey ? sliderStep * 2 : sliderStep;
    const keyAdjustments = {
      ArrowDown: step,
      ArrowUp: -step,
      End: max - getCurrentChartHeight(),
      Home: min - getCurrentChartHeight(),
    };
    const adjustment = keyAdjustments[event.key];

    if (adjustment === undefined) {
      return;
    }

    event.preventDefault();
    setChartHeight(getCurrentChartHeight() + adjustment);
    renderChart();
  });
}

export function initializeUncertaintyApp() {
  populateDatasetSelector();
  elements.datasetSelector.value = defaultSettings.datasetKey;
  state.rows = cloneDatasetRows(defaultSettings.datasetKey);
  applyDefaultSettings({ preserveRows: true });
  sidebarController.applyStoredState();
  sidebarController.applyStoredPosition();
  updateLeftMarginDisplay();
  updateBarHeightDisplay();
  setChartHeight(Number.parseInt(elements.chartHeightSlider.value, 10));
  axisControls.updateCurrencyInputState();
  axisControls.normalizeCurrencyInput();
  axisControls.updateCurrencyValidationState();
  dataTableControls.updateVisibility();
  axisControls.updateYAxisInputState();
  bindEvents();
  bindChartResizeHandle();
  renderChart({ forceTableRender: true, resetScroll: true });
}

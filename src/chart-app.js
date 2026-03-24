import Highcharts from "highcharts";

const CATEGORY_COUNT = 40;
const TRACK_HEIGHT = 300;
const EMPTY_BAR_COLOR = "rgba(0, 0, 0, 0.05)";

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
  currentDatasetKey: "dataset1",
  currentStart: 0,
  pendingScrollStart: 0,
  previousStart: 0,
  scrollAnimationFrame: null,
  windowSize: 5,
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
  showDataTableCheckbox: document.getElementById("showDataTableCheckbox"),
  scrollbar: document.getElementById("scrollbar"),
  sliderStatus: document.getElementById("sliderStatus"),
  sortSelector: document.getElementById("sortSelector"),
  toggleLabels: document.getElementById("toggleLabels"),
  windowSizeSelector: document.getElementById("windowSizeSelector"),
  xAxisCurrencyInput: document.getElementById("xAxisCurrencyInput"),
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

function getCurrentDataset() {
  return datasets[state.currentDatasetKey];
}

function getSortedPairs() {
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

  return pairs;
}

function getSlice() {
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

  return {
    categories: slice.map((item) => item.name || "\u00A0"),
    data: slice,
  };
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
    options.currency = elements.xAxisCurrencyInput.value.trim().toUpperCase() || "USD";
    options.currencyDisplay = "symbol";
  }

  try {
    return new Intl.NumberFormat(locale, options);
  } catch (error) {
    console.warn("Invalid Intl.NumberFormat options, using defaults instead.", error);
    return new Intl.NumberFormat(undefined, options);
  }
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
    currency: elements.xAxisCurrencyInput.value.trim().toUpperCase() || "USD",
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

  try {
    return new Intl.NumberFormat(locale, options);
  } catch (error) {
    console.warn(
      "Invalid currency format options for bar labels, using defaults instead.",
      error
    );
    return new Intl.NumberFormat(undefined, options);
  }
}

function getChartOrientation() {
  return elements.orientationSelector.value;
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
    },
    title: { text: "" },
    xAxis: {
      categories: slice.categories,
      reversed: !isVertical,
      scrollbar: {
        enabled: true,
      },
    },
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
    credits: {
      enabled: false,
    },
    plotOptions: {
      series: {
        pointPadding:
          1 - Number.parseFloat(elements.barHeightSlider.value) / 2 - 0.5,
        groupPadding: 0,
        animation: { duration: 400, easing: "easeOutCubic" },
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

function renderDataTable() {
  updateDataTableVisibility();
  if (!elements.showDataTableCheckbox.checked) {
    return;
  }

  const tableFormatter = getBarValueFormatter() ?? getValueAxisFormatter();
  const allRows = getSortedPairs();
  const visibleRowKeys = new Set(
    allRows
      .slice(state.currentStart, state.currentStart + state.windowSize)
      .map((item) => `${item.index}:${item.name}`)
  );

  elements.dataTableBody.innerHTML = allRows
    .map(
      (item) => `
        <tr class="${
          visibleRowKeys.has(`${item.index}:${item.name}`)
            ? "data-table-row-visible"
            : ""
        }">
          <td>${escapeHtml(item.name)}</td>
          <td>${tableFormatter.format(item.y)}</td>
        </tr>
      `
    )
    .join("");
}

function renderChart({ resetScroll = false } = {}) {
  if (resetScroll) {
    state.currentStart = 0;
    state.pendingScrollStart = 0;
    state.previousStart = 0;
  }

  clampCurrentStart();
  updateLeftMarginDisplay();
  updateScrollbar();

  const options = getChartOptions();

  if (state.chart) {
    state.chart.destroy();
    state.chart = null;
  }

  state.chart = Highcharts.chart("container", options);
  renderDataTable();
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
  const direction = state.currentStart >= state.previousStart ? 1 : -1;

  state.chart.xAxis[0].update({ categories: slice.categories }, false);
  state.chart.series[0].update(
    { dataLabels: { enabled: elements.toggleLabels.checked } },
    false
  );
  state.chart.series[0].setData(slice.data, true, {
    duration: 400,
    easing: "easeOutCubic",
  });
  renderDataTable();

  const labelGroup = state.chart.xAxis[0].labelGroup?.element;
  if (labelGroup) {
    labelGroup.animate(
      [
        { transform: `translateY(${18 * direction}px)`, opacity: 0.25 },
        { transform: "translateY(0)", opacity: 1 },
      ],
      {
        duration: 320,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );
  }
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
  elements.showDataTableCheckbox.addEventListener("change", () =>
    renderDataTable()
  );
  elements.leftMarginSlider.addEventListener("input", () => renderChart());
  elements.sortSelector.addEventListener("change", () =>
    renderChart({ resetScroll: true })
  );
  elements.barHeightSlider.addEventListener("input", () => {
    updateBarHeightDisplay();
    renderChart();
  });
  elements.autoScaleCheckbox.addEventListener("change", () => {
    updateYAxisInputState();
    renderChart();
  });
  elements.yMinInput.addEventListener("input", () => {
    if (!elements.autoScaleCheckbox.checked) {
      renderChart();
    }
  });
  elements.yMaxInput.addEventListener("input", () => {
    if (!elements.autoScaleCheckbox.checked) {
      renderChart();
    }
  });
  elements.datasetSelector.addEventListener("change", (event) => {
    state.currentDatasetKey = event.target.value;
    renderChart({ resetScroll: true });
  });
  elements.xAxisLocaleInput.addEventListener("input", () => renderChart());
  elements.xAxisNotationSelect.addEventListener("change", () => renderChart());
  elements.xAxisStyleSelect.addEventListener("change", () => {
    updateCurrencyInputState();
    renderChart();
  });
  elements.xAxisCurrencyInput.addEventListener("input", () => renderChart());
  elements.xAxisFractionDigitsInput.addEventListener("input", () =>
    renderChart()
  );
  elements.xAxisGroupingCheckbox.addEventListener("change", () =>
    renderChart()
  );
  elements.scrollbar.addEventListener("input", (event) => {
    onScrollChange(event.target.value);
  });
}

export function initializeChartApp() {
  setActiveControlsTab("display");
  updateLeftMarginDisplay();
  updateBarHeightDisplay();
  updateCurrencyInputState();
  updateDataTableVisibility();
  updateYAxisInputState();
  bindEvents();
  renderChart({ resetScroll: true });
}

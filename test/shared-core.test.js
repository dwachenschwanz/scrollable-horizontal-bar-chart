import test from "node:test";
import assert from "node:assert/strict";
import {
  createBarChartViewModel,
  createUncertaintyChartViewModel,
  mountBarChart,
  mountUncertaintyChart,
  mountUncertaintyRangeChart,
} from "../src/chartkit/index.js";
import {
  buildWindowSlice,
  createAxisFormatControls,
  createChartWindowControls,
  createDataTableControls,
  createSafeNumberFormatter,
  createStandardCurrencyFormatter,
  createValueAxisFormatter,
  debounce,
  escapeHtml,
  getSanitizedFormatCurrency,
  readBooleanPreference,
  readJsonPreference,
  writeBooleanPreference,
  writeJsonPreference,
} from "../src/chartkit/demo-controls.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

function createClassList() {
  const values = new Set();
  return {
    contains(value) {
      return values.has(value);
    },
    remove(value) {
      values.delete(value);
    },
    toggle(value, force) {
      if (force) {
        values.add(value);
      } else {
        values.delete(value);
      }
    },
  };
}

function createField({ checked = false, value = "" } = {}) {
  return {
    checked,
    classList: createClassList(),
    disabled: false,
    parentElement: { style: {} },
    style: {},
    textContent: "",
    value,
  };
}

function createSortButton(field, text) {
  const attributes = new Map();
  const headerAttributes = new Map();
  return {
    addEventListener(type, handler) {
      if (type === "click") {
        this.onclick = handler;
      }
    },
    classList: createClassList(),
    closest(selector) {
      return selector === "th"
        ? {
            setAttribute(name, value) {
              headerAttributes.set(name, value);
            },
          }
        : null;
    },
    dataset: { tableSort: field },
    headerAttributes,
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    textContent: text,
  };
}

function createTableRow(sortedIndex) {
  return {
    classList: createClassList(),
    dataset: { sortedIndex: String(sortedIndex) },
  };
}

test("buildWindowSlice pads missing items without sharing the empty object", () => {
  const slice = buildWindowSlice([{ name: "A" }], 0, 3, { name: "", y: 0 });

  assert.deepEqual(slice, [{ name: "A" }, { name: "", y: 0 }, { name: "", y: 0 }]);
  assert.notEqual(slice[1], slice[2]);
});

test("escapeHtml escapes characters used in HTML markup", () => {
  assert.equal(
    escapeHtml(`A&B <tag attr="x">'`),
    "A&amp;B &lt;tag attr=&quot;x&quot;&gt;&#39;"
  );
});

test("createSafeNumberFormatter caches formatters and falls back on invalid options", () => {
  const cache = new Map();
  const formatter = createSafeNumberFormatter(
    cache,
    "en-US",
    { style: "currency", currency: "USD" },
    { style: "decimal" }
  );
  const cachedFormatter = createSafeNumberFormatter(
    cache,
    "en-US",
    { style: "currency", currency: "USD" },
    { style: "decimal" }
  );
  const originalWarn = console.warn;
  console.warn = () => {};
  let fallbackFormatter;
  try {
    fallbackFormatter = createSafeNumberFormatter(
      cache,
      "en-US",
      { style: "currency", currency: "INVALID" },
      { style: "decimal" }
    );
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(formatter, cachedFormatter);
  assert.equal(formatter.format(12), "$12.00");
  assert.equal(fallbackFormatter.format(12), "12");
});

test("shared format helpers build axis and standard currency formatters", () => {
  const cache = new Map();
  const settings = {
    currency: "usd",
    fractionDigits: "1",
    locale: "en-US",
    notation: "compact",
    style: "currency",
    useGrouping: true,
  };

  assert.equal(getSanitizedFormatCurrency(settings, "EUR"), "USD");
  assert.equal(
    createValueAxisFormatter({
      fallbackCurrency: "USD",
      formatterCache: cache,
      settings,
    }).format(12345),
    "$12.3K"
  );
  assert.equal(
    createStandardCurrencyFormatter({
      fallbackCurrency: "USD",
      formatterCache: cache,
      settings,
    }).format(12345),
    "$12,345.0"
  );
  assert.equal(
    createStandardCurrencyFormatter({
      fallbackCurrency: "USD",
      formatterCache: cache,
      settings: { ...settings, style: "decimal" },
    }),
    null
  );
});

test("chart mounts expose framework-neutral lifecycle wrappers", () => {
  const container = { nodeType: 1 };
  const mount = mountBarChart(container);

  assert.equal(mount.getChart(), null);
  assert.equal(typeof mount.update, "function");
  assert.equal(typeof mount.render, "function");
  assert.equal(typeof mount.updateWindow, "function");

  mount.destroy();
  mount.destroy();

  assert.equal(mount.getChart(), null);
  assert.throws(() => mount.update({}), /destroyed/);
});

test("chart mounts resolve selectors and validate unsupported updates", () => {
  const originalDocument = globalThis.document;
  const hadDocument = "document" in globalThis;
  const container = { nodeType: 1 };

  globalThis.document = {
    querySelector(selector) {
      return selector === "#chart" ? container : null;
    },
  };

  try {
    const mount = mountUncertaintyChart("#chart");
    assert.equal(mountUncertaintyRangeChart, mountUncertaintyChart);
    assert.throws(() => mount.updateWindow({}), /does not support/);
    assert.throws(() => mountBarChart("#missing"), /not found/);
    assert.throws(() => mountBarChart({}), /HTMLElement/);
    mount.destroy();
  } finally {
    if (hadDocument) {
      globalThis.document = originalDocument;
    } else {
      delete globalThis.document;
    }
  }
});

test("bar chart view model builds sorted slice and chart options", () => {
  const formatter = new Intl.NumberFormat("en-US");
  const viewModel = createBarChartViewModel({
    categories: ["Category 2", "Category 1", "Category 3"],
    data: [20, 40, 10],
    formatters: {
      barValueFormatter: formatter,
      valueAxisFormatter: formatter,
    },
    settings: {
      autoScale: true,
      barHeight: "0.75",
      chartHeight: "400",
      currentStart: 0,
      leftMargin: "100",
      orientation: "horizontal",
      showLabels: true,
      sort: "valueDesc",
      windowSize: 2,
      yMax: "100",
      yMin: "0",
    },
  });

  assert.deepEqual(
    viewModel.sortedPairs.map((item) => item.name),
    ["Category 1", "Category 2", "Category 3"]
  );
  assert.deepEqual(viewModel.slice.categories, ["Category 1", "Category 2"]);
  assert.deepEqual(viewModel.axisBounds, { min: 0, max: 40 });
  assert.equal(viewModel.chartOptions.series[0].data.length, 2);
});

test("uncertainty chart view model normalizes rows and formats visible ranges", () => {
  const formatter = new Intl.NumberFormat("en-US");
  const viewModel = createUncertaintyChartViewModel({
    formatters: {
      markerFormatter: formatter,
      rangeFormatter: formatter,
      valueAxisFormatter: formatter,
    },
    rows: [
      { id: "a", name: "Case 2", low: "30", base: "40", high: "10" },
      { id: "b", name: "Case 1", low: "0", base: "8", high: "12" },
    ],
    settings: {
      autoScale: false,
      barHeight: "0.72",
      chartHeight: "400",
      color: "#2caffe",
      currentStart: 0,
      leftMargin: "120",
      orientation: "horizontal",
      showLabels: true,
      showMean: true,
      sort: "baseDesc",
      windowSize: 1,
      yMax: "25",
      yMin: "-5",
    },
  });

  assert.equal(viewModel.normalizedRows[0].baseWasClamped, true);
  assert.deepEqual(
    viewModel.sortedRows.map((row) => row.name),
    ["Case 2", "Case 1"]
  );
  assert.deepEqual(viewModel.axisBounds, { min: -5, max: 25 });
  assert.equal(viewModel.visibleRows[0].formattedBase, "30");
  assert.equal(viewModel.chartOptions.custom.uncertainty.rows.length, 1);
});

test("axis format controls normalize, validate, and format shared controls", () => {
  const elements = {
    autoScaleCheckbox: createField({ checked: true }),
    xAxisCurrencyInput: createField({ value: "usd" }),
    xAxisCurrencyStatus: createField(),
    xAxisFractionDigitsInput: createField({ value: "0" }),
    xAxisGroupingCheckbox: createField({ checked: true }),
    xAxisLocaleInput: createField({ value: "en-US" }),
    xAxisNotationSelect: createField({ value: "compact" }),
    xAxisStyleSelect: createField({ value: "currency" }),
    yMaxFormattedValue: createField(),
    yMaxInput: createField({ value: "100" }),
    yMinFormattedValue: createField(),
    yMinInput: createField({ value: "0" }),
  };
  const controls = createAxisFormatControls({
    elements,
    fallbackCurrency: "USD",
    formatterCache: new Map(),
  });

  controls.normalizeCurrencyInput();
  controls.updateCurrencyInputState();
  controls.updateYAxisInputState();
  controls.updateAxisBoundDisplays({ min: 0, max: 50000 });

  assert.equal(elements.xAxisCurrencyInput.value, "USD");
  assert.equal(elements.xAxisCurrencyStatus.textContent, "");
  assert.equal(elements.yMinInput.disabled, true);
  assert.equal(elements.yMinFormattedValue.textContent, "$0");
  assert.equal(elements.yMaxFormattedValue.textContent, "$50K");
  assert.deepEqual(controls.getFormatRenderKeyParts(), [
    "en-US",
    "compact",
    "currency",
    "USD",
    "0",
    true,
  ]);

  elements.xAxisCurrencyInput.value = "bad";
  controls.updateCurrencyValidationState();
  assert.equal(
    elements.xAxisCurrencyStatus.textContent,
    "Invalid currency code. Using USD."
  );
});

test("chart window controls clamp starts and report visible indexes", () => {
  let total = 10;
  let changeCount = 0;
  let scrolledStart = null;
  const elements = {
    dynamicSliderStyle: { textContent: "" },
    scrollbar: {
      disabled: false,
      max: "",
      value: "",
      addEventListener() {},
    },
    sliderStatus: { textContent: "" },
  };
  const controls = createChartWindowControls({
    elements,
    getTotal: () => total,
    initialWindowSize: 4,
    minThumbHeight: 32,
    onScrollPosition: (start) => {
      scrolledStart = start;
    },
    onWindowChange: () => {
      changeCount += 1;
    },
    trackHeight: 100,
  });

  controls.updateScrollbar();
  assert.equal(elements.scrollbar.max, "6");
  assert.equal(elements.scrollbar.value, "0");
  assert.equal(elements.sliderStatus.textContent, "Showing 1-4 of 10");
  assert.deepEqual([...controls.getVisibleIndexes(total)], [0, 1, 2, 3]);

  controls.setWindowSize(6);
  controls.updateScrollbar();
  assert.equal(elements.sliderStatus.textContent, "Showing 1-6 of 10");

  total = 5;
  controls.setWindowSize(10, { resetStart: false });
  controls.updateScrollbar();
  assert.equal(elements.scrollbar.disabled, true);
  assert.equal(elements.sliderStatus.textContent, "Showing 1-5 of 5");

  controls.reset({ windowSize: 2 });
  controls.updateScrollbar();
  assert.equal(controls.windowSize, 2);
  assert.equal(changeCount > 0, true);

  controls.bindScrollbar();
  assert.equal(scrolledStart, null);
});

test("data table controls render, cache, sort headers, and highlight rows", () => {
  let renderCount = 0;
  let sortMode = "valueDesc";
  let nextSortMode = "";
  const rows = [createTableRow(0), createTableRow(1), createTableRow(2)];
  const valueButton = createSortButton("value", "Value");
  const nameButton = createSortButton("name", "Name");
  const elements = {
    dataTableBody: {
      innerHTML: "",
      querySelectorAll(selector) {
        return selector === "tr[data-sorted-index]" ? rows : [];
      },
    },
    dataTablePanel: { hidden: false },
    showDataTableCheckbox: { checked: true },
    tableSortButtons: [valueButton, nameButton],
  };
  const controls = createDataTableControls({
    elements,
    getRenderKey: () => sortMode,
    getSortMode: () => sortMode,
    getVisibleIndexes: () => new Set([1]),
    renderRows: () => {
      renderCount += 1;
      return "<tr data-sorted-index=\"0\"></tr>";
    },
    sortFields: ["name", "value"],
  });

  controls.render();
  controls.render();
  controls.bindSortButtons({
    onSortMode(mode) {
      nextSortMode = mode;
    },
  });

  valueButton.onclick?.();
  assert.equal(renderCount, 1);
  assert.equal(elements.dataTableBody.innerHTML, "<tr data-sorted-index=\"0\"></tr>");
  assert.equal(rows[0].classList.contains("data-table-row-visible"), false);
  assert.equal(rows[1].classList.contains("data-table-row-visible"), true);
  assert.equal(valueButton.dataset.sortDirection, "desc");
  assert.equal(valueButton.headerAttributes.get("aria-sort"), "descending");
  assert.equal(nextSortMode, "valueAsc");
});

test("preference helpers read and write safely through injected storage", () => {
  const storage = createMemoryStorage();

  assert.equal(readBooleanPreference("collapsed", { fallback: true, storage }), true);
  writeBooleanPreference("collapsed", false, { storage });
  assert.equal(readBooleanPreference("collapsed", { fallback: true, storage }), false);

  writeJsonPreference("position", { left: 10, top: 20 }, { storage });
  assert.deepEqual(
    readJsonPreference(
      "position",
      (value) => Number.isFinite(value?.left) && Number.isFinite(value?.top),
      { storage }
    ),
    { left: 10, top: 20 }
  );
  assert.equal(
    readJsonPreference("position", () => false, { fallback: "fallback", storage }),
    "fallback"
  );
});

test("debounce runs only the latest scheduled callback", async () => {
  const calls = [];
  const debounced = debounce((value) => {
    calls.push(value);
  }, 10);

  debounced("first");
  debounced("second");
  await new Promise((resolve) => setTimeout(resolve, 25));

  assert.deepEqual(calls, ["second"]);
});

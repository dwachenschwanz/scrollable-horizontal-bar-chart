import { createBarChartController } from "./bar-chart-controller.js";
import { createUncertaintyChartController } from "./uncertainty-chart-controller.js";

/**
 * @typedef {string|HTMLElement} ChartContainer
 */

/**
 * Lifecycle handle returned by chart mount functions.
 *
 * In Angular, create this in `ngAfterViewInit`, call `update(...)` when inputs
 * change, and call `destroy()` from `ngOnDestroy`.
 *
 * @typedef {Object} ChartMount
 * @property {() => void} destroy
 * @property {() => Object|null} getChart
 * @property {(options: Object) => Object} render
 * @property {(options: Object) => Object} update
 * @property {(options: Object) => Object|null} updateWindow
 */

/**
 * @param {ChartContainer} container
 * @returns {HTMLElement}
 */
function resolveChartContainer(container) {
  if (typeof container === "string") {
    const element = globalThis.document?.querySelector(container);

    if (!element) {
      throw new Error(`Chart container not found: ${container}`);
    }

    return element;
  }

  if (!container || container.nodeType !== 1) {
    throw new TypeError("Chart container must be an HTMLElement or selector.");
  }

  return container;
}

/**
 * @param {ChartContainer} container
 * @param {(container: HTMLElement) => Object} createController
 * @param {Object|null} initialOptions
 * @returns {ChartMount}
 */
function createChartMount(container, createController, initialOptions) {
  const controller = createController(resolveChartContainer(container));
  let destroyed = false;

  function assertActive() {
    if (destroyed) {
      throw new Error("Cannot update a destroyed chart mount.");
    }
  }

  const mount = {
    destroy() {
      if (destroyed) {
        return;
      }

      controller.destroy();
      destroyed = true;
    },

    getChart() {
      return controller.getChart();
    },

    render(options) {
      return this.update(options);
    },

    update(options) {
      assertActive();
      return controller.render(options);
    },

    updateWindow(options) {
      assertActive();

      if (typeof controller.updateWindow !== "function") {
        throw new TypeError("This chart mount does not support window updates.");
      }

      return controller.updateWindow(options);
    },
  };

  if (initialOptions) {
    mount.update(initialOptions);
  }

  return mount;
}

/**
 * Mounts a scrollable bar chart into an element or selector.
 *
 * @param {ChartContainer} container
 * @param {Object|null} [initialOptions=null]
 * @returns {ChartMount}
 */
export function mountBarChart(container, initialOptions = null) {
  return createChartMount(container, createBarChartController, initialOptions);
}

/**
 * Mounts an uncertainty range chart into an element or selector.
 *
 * @param {ChartContainer} container
 * @param {Object|null} [initialOptions=null]
 * @returns {ChartMount}
 */
export function mountUncertaintyChart(container, initialOptions = null) {
  return createChartMount(
    container,
    createUncertaintyChartController,
    initialOptions
  );
}

export const mountUncertaintyRangeChart = mountUncertaintyChart;

# Chart Comparison Demos

This repository contains two related Vite + vanilla JavaScript chart apps built on a shared `chartkit` codebase.

- **Scrollable bar chart**: the root app at `index.html`
- **Uncertainty range comparison**: the nested app at `uncertainty-range-comparison/index.html`

Both apps use Highcharts for rendering, but the reusable chart logic now lives in `src/chartkit/`. The demos provide browser controls, sample data, and tables around that shared chart layer.

## The Dual-App Model

The root app is a general scrollable bar chart. It plots one value per category and supports horizontal or vertical orientation, sorting, paging through visible bars, axis formatting, value labels, and a synchronized data table.

The uncertainty app compares ranges instead of single values. Each row has `low`, `base`, and `high` values. The chart draws each range from low to high, marks the base value inside the range, and can show a weighted mean marker:

```text
mean = 0.25 * low + 0.5 * base + 0.25 * high
```

The apps intentionally share the same interaction model:

- floating collapsible controls
- display, axis, and format sections
- custom visible-window scrolling
- horizontal or vertical chart orientation
- Analysis tab with Group By, Expand Unassigned, Color By, and numerical filter controls
- chart-height resizing from the divider pill below each chart
- auto or manual axis bounds
- `Intl.NumberFormat`-based axis and label formatting
- full category-label text exposed on hover and to assistive technology when labels are visually abridged
- synchronized data tables with visible-row highlighting

The important architectural point is that the apps are no longer two disconnected implementations. They are two demos using one shared chart foundation.

## Shared Chartkit Layer

`src/chartkit/index.js` is the stable embeddable API. This is the entrypoint a future Angular app should depend on.

It exports:

- `createBarChartViewModel`
- `createChartHeightResizeControls`
- `createUncertaintyChartViewModel`
- `mountBarChart`
- `mountUncertaintyChart`
- `mountUncertaintyRangeChart`

The view-model functions handle framework-neutral chart preparation:

- sorting
- visible-window slicing
- axis bounds
- normalized uncertainty rows
- formatted visible values
- Highcharts option creation

The mount functions own the Highcharts lifecycle:

- create chart
- update chart
- destroy chart

`src/chartkit/demo-controls.js` exports browser-demo helpers only. These are useful for the current Vite demos, but they are not intended as the primary Angular chart integration surface. The chart-height resize helper is framework-neutral DOM code exported by the stable chartkit API, so an Angular host can reuse that helper or implement the same interaction directly in a component.

## Project Structure

```text
index.html                                  Root scrollable bar chart shell
src/chart-app.js                            Root demo wiring and control state
src/chart-utils.js                          Compatibility wrapper around chartkit bar utilities
src/chartkit/index.js                       Stable embeddable chart API
src/chartkit/demo-controls.js               Demo-only browser control helpers
src/chartkit/bar-chart-model.js             Bar chart view-model builder
src/chartkit/bar-chart-controller.js        Bar chart Highcharts controller
src/chartkit/uncertainty-chart-model.js     Uncertainty chart view-model builder
src/chartkit/uncertainty-chart-controller.js Uncertainty chart Highcharts controller
src/chartkit/chart-mounts.js                Framework-neutral chart mount lifecycle
src/shared/chart-height-resize-controls.js  Framework-neutral chart height resize helper
src/shared/chart-resize.css                 Shared resize handle styling
src/shared/                                 Shared demo controls, formatting, and core utilities
uncertainty-range-comparison/               Nested uncertainty range comparison app
docs/angular-integration.md                 Angular integration notes and examples
vite.chartkit.config.js                     Library build config for chartkit
scripts/smoke-chartkit-build.mjs            Built-package smoke test
```

## Requirements

- Node.js `22.12.0` is recorded in `.nvmrc`
- npm

Use the project Node version with:

```sh
nvm use
```

Install dependencies from the repository root:

```sh
npm install
```

## Development

Run the root scrollable bar chart:

```sh
npm run dev
```

Run the root app on a fixed port:

```sh
npm run dev:bar
```

Run the uncertainty app on a fixed port:

```sh
npm run dev:uncertainty
```

Run both apps at the same time:

```sh
npm run dev:both
```

The default fixed ports are:

- bar chart: `http://127.0.0.1:5173/scrollable-horizontal-bar-chart/`
- uncertainty chart: `http://127.0.0.1:5174/uncertainty-range-comparison/`

## Builds

Build the root Vite app:

```sh
npm run build
```

Build the nested uncertainty app:

```sh
npm --prefix uncertainty-range-comparison run build
```

Build the reusable chartkit package artifact:

```sh
npm run build:chartkit
```

The chartkit build writes ES modules to:

```text
dist/chartkit/
```

The chartkit package build keeps `highcharts` external, so a host app such as Angular should install and own `highcharts`.
The package `files` allowlist includes `dist/chartkit`, so local package installs and packed artifacts include the built chartkit modules and resize stylesheet even though `dist/` is ignored by Git.

The package export map points consumers at the built chartkit files:

```js
import {
  createBarChartViewModel,
  createChartHeightResizeControls,
  mountBarChart,
} from "scrollable-horizontal-bar-chart";

import "scrollable-horizontal-bar-chart/chart-resize.css";
```

The demo-control entrypoint remains available for the current browser demos:

```js
import { createControlTabs } from "scrollable-horizontal-bar-chart/demo-controls";
```

## Tests

Run the full Node test suite:

```sh
npm test
```

Run the browser-level interaction tests:

```sh
npm run test:browser
```

Build and smoke-test the chartkit package artifact:

```sh
npm run test:chartkit-build
```

The browser tests start both fixed-port Vite apps and verify chart resize interactions and full-label tooltip attributes in Chromium. The smoke test imports the built `dist/chartkit/index.js` and `dist/chartkit/demo-controls.js` files and checks that the expected chartkit and demo exports exist.
`npm pack --dry-run` is useful before publishing or local package testing; it should list `dist/chartkit/index.js`, `dist/chartkit/demo-controls.js`, `dist/chartkit/chart-resize.css`, and the chartkit chunks.

## App Features

The scrollable bar chart supports:

- horizontal and vertical bar orientation
- built-in demo datasets loaded from `src/actionMenu/compareValue.json`
- value and name sorting
- visible-window scrolling
- Analysis tab with Group By, Expand Unassigned, Color By, and numerical filter controls
- chart-height resizing by dragging the pill below the chart
- chart-height reset by double-clicking the resize pill
- dynamic chart-height maximum based on the available chart viewport space
- auto-scale and manual axis bounds
- compact, standard, scientific, engineering, decimal, and currency formatting
- full category labels available through native hover tooltips when the axis label is truncated with an ellipsis
- value labels inside bars
- sortable synchronized data table

The uncertainty range comparison supports:

- horizontal and vertical range orientation
- low, base, high, mean, and spread calculations
- base labels and base divider markers
- optional mean marker shown as an `x`
- range-aware sorting
- Analysis tab with Group By, Expand Unassigned, Color By, and numerical filter controls
- chart-height resizing by dragging the pill below the chart
- chart-height reset by double-clicking the resize pill
- dynamic chart-height maximum based on the available chart viewport space
- full category labels available through native hover tooltips when the axis label is truncated with an ellipsis
- matching tooltip style for range bars
- vertical label fallback when labels do not fit inside bars
- synchronized data table with input adjustment warnings

## Chart Resize Handle

Both demo apps include a horizontal divider between the chart and the table. Only the centered pill is interactive. Drag the pill up or down to change the chart height; double-click it to restore the default chart height. The existing Chart Height control stays synchronized with the dragged height.

The maximum draggable height is calculated from the chart container's available viewport space instead of using a fixed pixel cap. The resize pill also supports keyboard adjustment with `ArrowUp`, `ArrowDown`, `Home`, and `End`.

## Angular Path

See [docs/angular-integration.md](docs/angular-integration.md) for a concrete Angular usage pattern.

The intended split is:

- Angular owns templates, forms, application state, and data loading.
- `chartkit` owns chart view models and the Highcharts lifecycle.

A typical Angular component should:

1. Create a mount in `ngAfterViewInit`.
2. Build a view model when inputs or form state change.
3. Pass `viewModel.chartOptions` to `mount.update(...)`.
4. Call `mount.destroy()` in `ngOnDestroy`.

## Deployment

The root app is configured for GitHub Pages.

```sh
npm run build
```

Notes:

- `vite.config.js` uses `base: "/scrollable-horizontal-bar-chart/"`
- the GitHub Pages workflow builds from `dist/`
- repository Pages settings should use `GitHub Actions`
- live site: [https://dwachenschwanz.github.io/scrollable-horizontal-bar-chart/](https://dwachenschwanz.github.io/scrollable-horizontal-bar-chart/)

## Development Notes

- The root app imports public chart logic from `src/chartkit/index.js`.
- Demo UI helpers come from `src/chartkit/demo-controls.js`.
- The nested uncertainty app imports shared chartkit modules from the root `src/chartkit/` directory.
- The compatibility utility files remain so existing app tests can keep their focused imports.
- Highcharts credits are disabled by the chart controllers.

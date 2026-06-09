# Uncertainty Range Comparison

A separate Vite + vanilla JavaScript project derived from the layout and interaction model of the original scrollable bar chart.

Each bar is driven by three values:

- `Low`
- `Base`
- `High`

The app also calculates `Mean` as `0.25 * Low + 0.5 * Base + 0.25 * High`.

The chart renders each bar from its low value to its high value, with a base divider line drawn inside the bar at the base value. The calculated mean can be plotted as an `X` marker.

## Features

- Scrollable horizontal uncertainty range chart
- Read-only low/base/high table for every bar
- Calculated weighted mean for every bar
- Optional mean marker plotted as an `X`
- Built-in demo datasets loaded from `src/actionMenu/compareUncertainty.json`
- Sort by base, uncertainty spread, or name
- Configurable bars per page with a custom scrollbar
- Analysis tab with Group By, Expand Unassigned, Color By, and dynamic numerical filter controls
- Chart-height resizing by dragging the centered pill below the chart
- Double-click chart-height reset from the resize pill
- Dynamic chart-height maximum based on the available chart viewport space
- Draggable, collapsible controls overlay that can float outside the chart workspace while staying inside the viewport
- Adjustable left margin and bar height
- Auto-scale or manual axis bounds
- `Intl.NumberFormat` controls for locale, notation, grouping, style, and currency
- Full category labels available through native hover tooltips when the y-axis label is truncated with an ellipsis
- Synced input table with visible-row highlighting

## Analysis Filters

The Analysis tab includes Group By, Expand Unassigned, Color By, and a dynamic filter builder. `Expand Unassigned` defaults to unchecked.

The filter builder starts with two filter cards. Use `Add +` to append another filter below the existing cards. When there are more than two filters, each card shows an `X` button in the upper-right corner; clicking it deletes that filter and renumbers the remaining cards. Reset returns the Analysis tab to the default two empty filters.

Selecting a field other than `<None>` expands the card with:

- a Min/Max row for the selected field
- an operator selector with `>`, `>=`, `=`, `<=`, and `<`
- a numeric value input bounded by the selected field's Min/Max

Uncertainty filters support `Low`, `Base`, `High`, `Mean`, and `Spread`. Min/Max values use the active number-format settings. The valid input bounds are rounded to the same displayed fraction precision, so values that match the displayed Min or Max are accepted even when the raw data contains more decimal precision.

Out-of-range values show a red input border, inline guidance, and accessible validation state through `aria-invalid` and `aria-describedby`. Clicking `Apply` focuses the first invalid filter value. If the Analysis tab overflows, only the area from Group By through the filter builder scrolls; Apply and Reset remain fixed at the bottom of the Analysis panel.

## Chart Resize Handle

The horizontal divider between the chart and the input table is a visual boundary. Only the centered pill is interactive. Drag the pill up or down to resize the chart height, or double-click it to restore the default chart height.

The Chart Height control remains synchronized with dragged changes. The maximum height is calculated from the chart container's available viewport space rather than a fixed pixel cap. Keyboard users can focus the pill and adjust height with `ArrowUp`, `ArrowDown`, `Home`, and `End`.

## Getting Started

```bash
cd uncertainty-range-comparison
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Run Tests

```bash
npm test
```

## Build

```bash
npm run build
```

## Project Structure

```text
index.html                    App shell and controls
src/main.js                   Lightweight app entry
src/uncertainty-app.js        Chart logic, controls, input table, sorting, and formatting
src/uncertainty-datasets.js   Adapter for the built-in compareUncertainty JSON source
src/uncertainty-utils.js      Pure utilities for ranges, sorting, slices, bounds, and formatting helpers
src/actionMenu/compareUncertainty.json
src/style.css                 App styles and layout
test/uncertainty-utils.test.js
test/index-shell.test.js
vite.config.js
```

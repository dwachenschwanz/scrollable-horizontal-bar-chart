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
- Sample datasets for capital planning, product cases, and operations
- Sort by base, uncertainty spread, or name
- Configurable bars per page with a custom scrollbar
- Draggable, collapsible controls overlay that can float outside the chart workspace while staying inside the viewport
- Adjustable left margin and bar height
- Auto-scale or manual axis bounds
- `Intl.NumberFormat` controls for locale, notation, grouping, style, and currency
- Synced input table with visible-row highlighting

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
src/uncertainty-utils.js      Pure utilities for ranges, sorting, slices, bounds, and formatting helpers
src/style.css                 App styles and layout
test/uncertainty-utils.test.js
test/index-shell.test.js
vite.config.js
```

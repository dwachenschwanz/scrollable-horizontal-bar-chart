# Scrollable Horizontal Bar Chart

A Vite + vanilla JavaScript app for exploring bar-chart data with Highcharts.

The app supports horizontal and vertical bar layouts, sorting, paging through visible bars, `Intl.NumberFormat`-based numeric formatting, and a synced data table below the chart.

## Features

- Horizontal and vertical bar orientation
- Sort by source order, value, or name
- Stable secondary tie-breakers for sorting
- Configurable bars per page with a custom scrollbar for the visible window
- Adjustable left margin and bar height
- Auto-scale or manual axis bounds
- `Intl.NumberFormat` controls for locale, notation, grouping, style, and currency
- Uppercase currency input with validation and safe fallback to `USD`
- Currency-aware value labels inside bars
- Tabbed controls sidebar
- Full data table below the chart
- Table row highlighting for rows currently visible in the chart
- One-click reset back to default settings while preserving the current dataset
- GitHub Pages-ready Vite configuration

## Getting Started

### Requirements

- Node.js 18+ recommended
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal.

### Run tests

```bash
npm test
```

The project uses Node's built-in test runner, so no extra test framework setup is required.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm test
```

## Project Structure

```text
index.html                       App shell and control markup
src/main.js                      Lightweight app entry
src/chart-app.js                 Chart logic, controls, sorting, formatting, and table sync
src/chart-utils.js               Pure chart utilities for sorting, slicing, bounds, and formatting helpers
src/style.css                    App styles and layout
test/chart-utils.test.js         Unit tests for sorting, slicing, bounds, formatting, and layout helpers
test/index-shell.test.js         Smoke tests for default control state in index.html
vite.config.js                   Vite config and GitHub Pages base path
.github/workflows/deploy-pages.yml  GitHub Pages deployment workflow
```

## Default Behavior

On first load, the app starts with:

- `Bars per page`: `5`
- `Orientation`: `Horizontal`
- `Sort`: `Value ↓`
- `Show values in bars`: enabled
- `Show data table`: enabled
- `Notation`: `Compact`
- `Style`: `Currency`
- `Currency`: `USD`

## Using the App

### Display tab

- Change bars per page
- Toggle value labels inside bars
- Show or hide the data table
- Switch between horizontal and vertical orientation
- Adjust left margin and bar height
- Change the sort order
- Reset the controls to default settings

### Axis tab

- Toggle auto-scaling
- Set manual axis min and max values

### Format tab

- Set locale
- Choose notation such as standard, compact, scientific, or engineering
- Switch between decimal and currency formatting
- Choose a currency code
- Invalid currency codes are highlighted and fall back to `USD`
- Set max fraction digits
- Toggle grouping separators

## Data Table

When enabled, the table shows the full sorted dataset below the chart.

- Rows currently visible in the chart are highlighted
- The table stays in sync with sorting, scrolling, dataset changes, and formatting
- The reset button does not change the currently selected dataset

## Sorting Notes

- `Value ↑` and `Value ↓` sort numerically
- `Name A-Z` and `Name Z-A` use natural string sorting, so `Category 2` sorts before `Category 10`
- Sorting uses stable secondary tie-breakers for more predictable output

## Deployment

This project is configured for GitHub Pages using GitHub Actions.

### Build for production

```bash
npm run build
```

### GitHub Pages notes

- `vite.config.js` uses `base: "/scrollable-horizontal-bar-chart/"`
- The GitHub Pages workflow builds from `dist/`
- In GitHub repository settings, Pages should use `GitHub Actions` as the source
- The live site is available at [https://dwachenschwanz.github.io/scrollable-horizontal-bar-chart/](https://dwachenschwanz.github.io/scrollable-horizontal-bar-chart/)
- After pushing to `main`, open that URL once the Pages workflow finishes successfully

## Testing

- `npm test` runs the Node-based test suite
- Unit tests cover sort behavior, visible-slice padding, auto-scale bounds, currency validation, label width, and point padding
- Shell smoke tests verify key default selections and checked controls in `index.html`

## Notes

- The demo datasets are generated in `src/chart-app.js`
- `dataset1` includes values up to the tens of thousands to exercise numeric formatting and axis behavior
- Auto-scale bounds, sorted rows, visible slices, table row references, and number formatters are cached to keep redraws lighter
- Highcharts credits are disabled in the chart configuration

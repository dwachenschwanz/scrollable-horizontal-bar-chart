# Scrollable Horizontal Bar Chart

A Vite + vanilla JavaScript app for exploring bar-chart data with Highcharts.

The app supports horizontal and vertical bar layouts, sorting, paging through visible bars, numeric formatting with `Intl.NumberFormat`, and an optional data table that stays synced with the chart.

## Features

- Horizontal or vertical bar orientation
- Sort by source order, value, or name
- Configurable bars per page with a custom scrollbar for the visible window
- Adjustable left margin and bar height
- Auto-scale or manual axis bounds
- `Intl.NumberFormat` controls for locale, notation, grouping, style, and currency
- Optional in-bar value labels
- Toggleable data table below the chart
- Highlighting in the table for rows currently visible in the chart

## Getting Started

### Requirements

- Node.js 18+ recommended
- npm

### Install

```bash
npm install
```

### Run the app

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Project Structure

```text
index.html          App shell and control markup
src/main.js         Lightweight app entry
src/chart-app.js    Chart logic, controls, sorting, formatting, and table sync
src/style.css       App styles and layout
```

## Using the App

### Display tab

- Switch between horizontal and vertical orientation
- Change bars per page
- Toggle value labels inside bars
- Adjust left margin and bar height
- Change the sort order
- Show or hide the data table

### Axis tab

- Toggle auto-scaling
- Set manual axis min and max values

### Format tab

- Set locale
- Choose notation such as standard, compact, scientific, or engineering
- Switch between decimal and currency formatting
- Choose a currency code
- Set max fraction digits
- Toggle grouping separators

## Data Table

When enabled, the table shows the full sorted dataset below the chart. Rows that are currently visible in the chart are highlighted so it is easy to relate the chart window to the full dataset.

## Notes

- The demo datasets are generated in `src/chart-app.js`.
- `dataset1` includes values up to the tens of thousands to better exercise numeric formatting and axis behavior.
- Highcharts credits are disabled in the chart configuration.

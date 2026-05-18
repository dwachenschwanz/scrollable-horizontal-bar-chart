import Highcharts from "highcharts";
import {
  escapeHtml,
  getHorizontalCategoryLabelWidth,
  getPointPadding,
} from "../shared/chart-core.js";

export function createBarCategoryAxisOptions({
  categories,
  leftMargin,
  orientation,
}) {
  const isVertical = orientation === "vertical";
  const categoryLabelWidth = getHorizontalCategoryLabelWidth(leftMargin);

  return {
    categories,
    labels: isVertical
      ? {}
      : {
          reserveSpace: false,
          useHTML: true,
          x: -8,
          formatter() {
            const label = typeof this.value === "string" ? this.value : "";
            return `<span class="chart-axis-label" title="${escapeHtml(label)}" style="width:${categoryLabelWidth}px">${escapeHtml(label)}</span>`;
          },
        },
    reversed: !isVertical,
    scrollbar: {
      enabled: true,
    },
  };
}

function getBarTooltipMarkup(point, valueFormatter) {
  const name = point.name || "";
  const value =
    typeof point.y === "number" ? valueFormatter.format(point.y) : "";

  if (!name || !value) {
    return false;
  }

  return `
    <div class="bar-tooltip">
      <div class="bar-tooltip-title">${escapeHtml(name)}</div>
      <div class="bar-tooltip-grid">
        <span>Value</span><strong>${escapeHtml(value)}</strong>
      </div>
    </div>
  `;
}

export function createBarChartOptions({
  axisBounds,
  barHeight,
  barValueFormatter,
  chartHeight,
  leftMargin,
  orientation,
  showLabels,
  slice,
  valueAxisFormatter,
}) {
  const isVertical = orientation === "vertical";

  return {
    chart: {
      type: isVertical ? "column" : "bar",
      animation: false,
      height: Number.parseInt(chartHeight, 10),
      marginLeft: Number.parseInt(leftMargin, 10),
      marginRight: 60,
      spacingLeft: 0,
      spacingRight: 0,
    },
    plotOptions: {
      series: {
        animation: false,
        dataLabels: {
          enabled: showLabels,
          formatter() {
            if (!(this.y > 0)) {
              return "";
            }

            return barValueFormatter
              ? barValueFormatter.format(this.y)
              : this.y;
          },
          inside: true,
          style: {
            color: "white",
            fontWeight: "bold",
            textOutline: "0px",
          },
        },
        groupPadding: 0,
        pointPadding: getPointPadding(barHeight),
      },
    },
    series: [
      {
        data: slice.data,
        name: "Values",
        showInLegend: false,
      },
    ],
    tooltip: {
      animation: false,
      backgroundColor: "transparent",
      borderWidth: 0,
      padding: 0,
      shadow: false,
      useHTML: true,
      formatter() {
        const point = this.point ?? this;
        return getBarTooltipMarkup(
          point,
          barValueFormatter ?? valueAxisFormatter
        );
      },
    },
    xAxis: createBarCategoryAxisOptions({
      categories: slice.categories,
      leftMargin,
      orientation,
    }),
    yAxis: {
      labels: {
        align: "center",
        formatter() {
          return valueAxisFormatter.format(this.value);
        },
        x: 0,
        y: 10,
      },
      max: axisBounds.max,
      min: axisBounds.min,
      opposite: !isVertical,
      title: {
        align: "middle",
        offset: 0,
        rotation: 0,
        style: { fontWeight: "bold", fontSize: 15 },
        text: null,
        x: 0,
        y: -20,
      },
    },
  };
}

function getChartConfig(options) {
  return {
    chart: options.chart,
    credits: { enabled: false },
    plotOptions: options.plotOptions,
    series: options.series,
    title: { text: "" },
    tooltip: options.tooltip,
    xAxis: options.xAxis,
    yAxis: options.yAxis,
  };
}

function updateExistingChart(chart, options) {
  const currentType = chart.options.chart?.type;
  const nextType = options.chart.type;

  if (currentType !== nextType) {
    return false;
  }

  chart.update(
    {
      chart: {
        height: options.chart.height,
        marginLeft: options.chart.marginLeft,
        marginRight: options.chart.marginRight,
        spacingLeft: options.chart.spacingLeft,
        spacingRight: options.chart.spacingRight,
      },
      tooltip: options.tooltip,
    },
    false,
    false,
    false
  );
  chart.xAxis[0].update(
    {
      labels: options.xAxis.labels,
      reversed: options.xAxis.reversed,
    },
    false
  );
  chart.yAxis[0].update(options.yAxis, false);
  chart.series[0].update(
    {
      dataLabels: options.plotOptions.series.dataLabels,
      groupPadding: options.plotOptions.series.groupPadding,
      pointPadding: options.plotOptions.series.pointPadding,
    },
    false
  );
  chart.xAxis[0].setCategories(options.xAxis.categories, false);
  chart.series[0].setData(options.series[0].data, false, false, false);
  chart.redraw();
  return true;
}

export function createBarChartController(container) {
  let chart = null;

  return {
    destroy() {
      chart?.destroy();
      chart = null;
    },

    getChart() {
      return chart;
    },

    render(options) {
      if (!chart) {
        chart = Highcharts.chart(container, getChartConfig(options));
        return chart;
      }

      if (!updateExistingChart(chart, options)) {
        chart.destroy();
        chart = Highcharts.chart(container, getChartConfig(options));
      }

      return chart;
    },

    updateWindow({ categoryAxisOptions, data, redraw = true }) {
      if (!chart) {
        return null;
      }

      chart.xAxis[0].update(
        {
          labels: categoryAxisOptions.labels,
          reversed: categoryAxisOptions.reversed,
        },
        false
      );
      chart.xAxis[0].setCategories(categoryAxisOptions.categories, false);
      chart.series[0].setData(data, redraw, false, false);
      return chart;
    },
  };
}

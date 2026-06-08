import Highcharts from "highcharts";
import {
  escapeHtml,
  getAbridgedAxisLabelMarkup,
  getHorizontalCategoryLabelWidth,
} from "../shared/chart-core.js";

const UNCERTAINTY_BAR_BORDER_COLOR = "#258ec9";

function createCategoryAxisOptions({ categories, leftMargin, orientation }) {
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
            return getAbridgedAxisLabelMarkup(label, categoryLabelWidth);
          },
        },
    max: categories.length - 0.5,
    min: -0.5,
    reversed: !isVertical,
    scrollbar: {
      enabled: true,
    },
    tickLength: 0,
    tickPositions: categories.map((_, index) => index),
    title: {
      text: null,
    },
  };
}

function createValueAxisOptions({ axisBounds, orientation, valueAxisFormatter }) {
  const isVertical = orientation === "vertical";

  return {
    gridLineWidth: 1,
    labels: isVertical
      ? {
          formatter() {
            return valueAxisFormatter.format(this.value);
          },
        }
      : {
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
    tickLength: 0,
    title: {
      align: "middle",
      offset: 0,
      rotation: 0,
      style: { fontWeight: "bold", fontSize: 15 },
      text: null,
      x: 0,
      y: isVertical ? 0 : -20,
    },
  };
}

export function createUncertaintyChartOptions({
  axisBounds,
  barHeight,
  chartHeight,
  leftMargin,
  orientation,
  rows,
  showLabels,
  showMean,
  slice,
  valueAxisFormatter,
}) {
  const isVertical = orientation === "vertical";
  const categoryAxisOptions = createCategoryAxisOptions({
    categories: slice.categories,
    leftMargin,
    orientation,
  });
  const valueAxisOptions = createValueAxisOptions({
    axisBounds,
    orientation,
    valueAxisFormatter,
  });

  return {
    chart: {
      animation: false,
      height: Number.parseInt(chartHeight, 10),
      marginLeft: Number.parseInt(leftMargin, 10),
      marginRight: 72,
      spacingLeft: 0,
      spacingRight: 0,
    },
    custom: {
      uncertainty: {
        axisBounds,
        barHeight: Number.parseFloat(barHeight),
        orientation,
        rows,
        showLabels,
        showMean,
      },
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      scatter: {
        marker: {
          enabled: false,
        },
      },
      series: {
        animation: false,
        enableMouseTracking: false,
        states: {
          inactive: {
            opacity: 1,
          },
        },
      },
    },
    series: [
      {
        data: [],
        showInLegend: false,
        type: "scatter",
      },
    ],
    tooltip: {
      enabled: false,
    },
    xAxis: isVertical ? categoryAxisOptions : valueAxisOptions,
    yAxis: isVertical ? valueAxisOptions : categoryAxisOptions,
  };
}

function clampToAxis(value, axisMin, axisMax) {
  return Math.min(Math.max(value, axisMin), axisMax);
}

function destroyUncertaintyLayer(chart) {
  if (!chart?.uncertaintyLayer) {
    return;
  }

  chart.uncertaintyLayer.layer.destroy();
  chart.uncertaintyLayer.clipRect.destroy();
  chart.uncertaintyLayer.tooltipElement?.remove();
  chart.uncertaintyLayer = null;
}

function createUncertaintyTooltip(chart) {
  const tooltipElement = document.createElement("div");
  tooltipElement.className = "uncertainty-tooltip";
  tooltipElement.hidden = true;
  chart.renderTo.appendChild(tooltipElement);
  return tooltipElement;
}

function getTooltipMarkup(item) {
  return `
    <div class="uncertainty-tooltip-title">${escapeHtml(item.row.name)}</div>
    <div class="uncertainty-tooltip-grid">
      <span>Low</span><strong>${escapeHtml(item.formattedLow)}</strong>
      <span>Base</span><strong>${escapeHtml(item.formattedBase)}</strong>
      <span>High</span><strong>${escapeHtml(item.formattedHigh)}</strong>
      <span>Mean</span><strong>${escapeHtml(item.formattedMean)}</strong>
      <span>Spread</span><strong>${escapeHtml(item.formattedSpread)}</strong>
    </div>
  `;
}

function positionUncertaintyTooltip(chart, tooltipElement, event) {
  const chartBounds = chart.renderTo.getBoundingClientRect();
  const tooltipBounds = tooltipElement.getBoundingClientRect();
  const offset = 12;
  const maxLeft = chart.renderTo.clientWidth - tooltipBounds.width - offset;
  const maxTop = chart.renderTo.clientHeight - tooltipBounds.height - offset;
  const pointerLeft = event.clientX - chartBounds.left;
  const pointerTop = event.clientY - chartBounds.top;
  const nextLeft =
    pointerLeft + tooltipBounds.width + offset > chart.renderTo.clientWidth
      ? pointerLeft - tooltipBounds.width - offset
      : pointerLeft + offset;
  const nextTop =
    pointerTop + tooltipBounds.height + offset > chart.renderTo.clientHeight
      ? pointerTop - tooltipBounds.height - offset
      : pointerTop + offset;

  tooltipElement.style.left = `${Math.max(offset, Math.min(nextLeft, maxLeft))}px`;
  tooltipElement.style.top = `${Math.max(offset, Math.min(nextTop, maxTop))}px`;
}

function showUncertaintyTooltip(chart, tooltipElement, item, event) {
  tooltipElement.innerHTML = getTooltipMarkup(item);
  tooltipElement.hidden = false;
  positionUncertaintyTooltip(chart, tooltipElement, event);
}

function hideUncertaintyTooltip(tooltipElement) {
  tooltipElement.hidden = true;
}

function drawMeanMarker(renderer, layer, x, yCenter, barThickness) {
  const markerSize = Math.min(13, Math.max(8, barThickness * 0.36));
  const halfSize = markerSize / 2;
  const top = yCenter - halfSize;
  const bottom = yCenter + halfSize;

  [
    [
      ["M", x - halfSize, top],
      ["L", x + halfSize, bottom],
    ],
    [
      ["M", x + halfSize, top],
      ["L", x - halfSize, bottom],
    ],
  ].forEach((path) => {
    renderer
      .path(path)
      .attr({
        stroke: "#0f172a",
        "stroke-linecap": "round",
        "stroke-width": 2,
      })
      .css({
        pointerEvents: "none",
      })
      .add(layer);
  });
}

function rangesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

function getRangeOverlapWidth(firstStart, firstEnd, secondStart, secondEnd) {
  return Math.max(
    0,
    Math.min(firstEnd, secondEnd) - Math.max(firstStart, secondStart)
  );
}

function clampPixelPosition(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getBestHorizontalLabelX({
  baseX,
  labelWidth,
  maxX,
  meanX = null,
  minX,
}) {
  const labelOffset = 8;
  const markerClearance = 14;

  if (minX > maxX) {
    return null;
  }

  const rightX = clampPixelPosition(baseX + labelOffset, minX, maxX);
  const leftX = clampPixelPosition(baseX - labelWidth - labelOffset, minX, maxX);

  if (meanX === null) {
    return rightX;
  }

  const meanStart = meanX - markerClearance;
  const meanEnd = meanX + markerClearance;
  const rightOverlapsMean = rangesOverlap(
    rightX,
    rightX + labelWidth,
    meanStart,
    meanEnd
  );
  const leftOverlapsMean = rangesOverlap(
    leftX,
    leftX + labelWidth,
    meanStart,
    meanEnd
  );

  if (!rightOverlapsMean) {
    return rightX;
  }

  if (!leftOverlapsMean) {
    return leftX;
  }

  const candidates = [
    rightX,
    leftX,
    clampPixelPosition(meanEnd + labelOffset, minX, maxX),
    clampPixelPosition(meanStart - labelWidth - labelOffset, minX, maxX),
  ];
  const bestCandidate = candidates.reduce((bestX, candidateX) => {
    const candidateOverlap = getRangeOverlapWidth(
      candidateX,
      candidateX + labelWidth,
      meanStart,
      meanEnd
    );
    const bestOverlap = getRangeOverlapWidth(
      bestX,
      bestX + labelWidth,
      meanStart,
      meanEnd
    );

    if (candidateOverlap !== bestOverlap) {
      return candidateOverlap < bestOverlap ? candidateX : bestX;
    }

    return Math.abs(candidateX - baseX) < Math.abs(bestX - baseX)
      ? candidateX
      : bestX;
  }, rightX);

  return bestCandidate;
}

function getCenteredTextBaseline(yCenter, textBox) {
  return yCenter - textBox.y - textBox.height / 2;
}

function getBestVerticalLabelBaseline({
  baseY,
  labelHeight,
  maxY,
  meanY = null,
  minY,
}) {
  const labelOffset = 8;
  const markerClearance = 14;
  const candidates = [baseY - labelOffset, baseY + labelHeight + labelOffset];

  if (meanY !== null) {
    candidates.push(
      meanY - markerClearance - labelOffset,
      meanY + markerClearance + labelHeight + labelOffset
    );
  }

  const validCandidates = candidates.filter(
    (candidateY) => candidateY >= minY && candidateY <= maxY
  );

  if (validCandidates.length === 0) {
    return null;
  }

  return validCandidates.reduce((bestY, candidateY) => {
    const candidateOverlap =
      meanY === null
        ? 0
        : getRangeOverlapWidth(
            candidateY - labelHeight,
            candidateY,
            meanY - markerClearance,
            meanY + markerClearance
          );
    const bestOverlap =
      meanY === null
        ? 0
        : getRangeOverlapWidth(
            bestY - labelHeight,
            bestY,
            meanY - markerClearance,
            meanY + markerClearance
          );

    if (candidateOverlap !== bestOverlap) {
      return candidateOverlap < bestOverlap ? candidateY : bestY;
    }

    return Math.abs(candidateY - baseY) < Math.abs(bestY - baseY)
      ? candidateY
      : bestY;
  }, validCandidates[0]);
}

function getClampedCenter(value, min, max) {
  return min <= max ? clampPixelPosition(value, min, max) : value;
}

function drawVerticalBaseLabel({
  barThickness,
  baseY,
  categoryCenter,
  chart,
  layer,
  meanY,
  rangeBottom,
  rangeTop,
  renderer,
  text,
}) {
  const fontStyles = {
    fontSize: "12px",
    fontWeight: "700",
    pointerEvents: "none",
  };
  const insidePadding = 4;
  const measure = renderer
    .text(text, 0, 0)
    .attr({
      align: "center",
    })
    .css(fontStyles)
    .add(layer);
  const textBox = measure.getBBox();
  measure.destroy();
  const fitsInsideBarWidth = textBox.width <= barThickness - insidePadding * 2;
  const insideBaseline = fitsInsideBarWidth
    ? getBestVerticalLabelBaseline({
        baseY,
        labelHeight: textBox.height,
        maxY: rangeBottom - insidePadding,
        meanY,
        minY: rangeTop + insidePadding + textBox.height,
      })
    : null;

  if (insideBaseline !== null) {
    renderer
      .text(text, categoryCenter, insideBaseline)
      .attr({
        align: "center",
      })
      .css({
        ...fontStyles,
        color: "#ffffff",
      })
      .add(layer);
    return;
  }

  const pillPaddingX = 6;
  const pillPaddingY = 4;
  const pillWidth = textBox.width + pillPaddingX * 2;
  const pillHeight = textBox.height + pillPaddingY * 2;
  const plotPadding = 2;
  const minCenterX = chart.plotLeft + pillWidth / 2 + plotPadding;
  const maxCenterX =
    chart.plotLeft + chart.plotWidth - pillWidth / 2 - plotPadding;
  const pillCenterX = getClampedCenter(categoryCenter, minCenterX, maxCenterX);
  const minBaseline = chart.plotTop + pillHeight + plotPadding;
  const maxBaseline = chart.plotTop + chart.plotHeight - plotPadding;
  const pillBaseline =
    getBestVerticalLabelBaseline({
      baseY,
      labelHeight: pillHeight,
      maxY: maxBaseline,
      meanY,
      minY: minBaseline,
    }) ??
    (minBaseline <= maxBaseline
      ? clampPixelPosition(baseY - 8, minBaseline, maxBaseline)
      : chart.plotTop + pillHeight);
  const pillLeft = pillCenterX - pillWidth / 2;
  const pillTop = pillBaseline - pillHeight;
  const pillBottom = pillTop + pillHeight;
  const connectorEndY =
    baseY < pillTop ? pillTop : baseY > pillBottom ? pillBottom : null;

  if (connectorEndY !== null) {
    renderer
      .path([
        ["M", categoryCenter, baseY],
        ["L", pillCenterX, connectorEndY],
      ])
      .attr({
        stroke: "#334155",
        "stroke-linecap": "round",
        "stroke-width": 1.5,
      })
      .css({
        pointerEvents: "none",
      })
      .add(layer);
  }

  renderer
    .rect(pillLeft, pillTop, pillWidth, pillHeight, 4)
    .attr({
      fill: "#ffffff",
      opacity: 0.96,
      stroke: "#cbd5e1",
      "stroke-width": 1,
    })
    .css({
      pointerEvents: "none",
    })
    .add(layer);

  renderer
    .text(text, pillCenterX, pillTop + pillPaddingY - textBox.y)
    .attr({
      align: "center",
    })
    .css({
      ...fontStyles,
      color: "#0f172a",
    })
    .add(layer);
}

function drawHorizontalBaseLabel({
  barThickness,
  baseX,
  chart,
  layer,
  meanX,
  rangeLeft,
  rangeRight,
  renderer,
  text,
  yCenter,
}) {
  const fontStyles = {
    fontSize: "12px",
    fontWeight: "700",
    pointerEvents: "none",
  };
  const insidePadding = 4;
  const measure = renderer
    .text(text, 0, 0)
    .css(fontStyles)
    .add(layer);
  const textBox = measure.getBBox();
  measure.destroy();
  const insideX = getBestHorizontalLabelX({
    baseX,
    labelWidth: textBox.width,
    maxX: rangeRight - insidePadding - textBox.width,
    meanX,
    minX: rangeLeft + insidePadding,
  });

  if (insideX !== null && textBox.height <= barThickness - insidePadding * 2) {
    renderer
      .text(text, insideX, getCenteredTextBaseline(yCenter, textBox))
      .css({
        ...fontStyles,
        color: "#ffffff",
      })
      .add(layer);
    return;
  }

  const pillPaddingX = 6;
  const pillPaddingY = 4;
  const pillWidth = textBox.width + pillPaddingX * 2;
  const pillHeight = textBox.height + pillPaddingY * 2;
  const plotPadding = 2;
  const plotMinX = chart.plotLeft + plotPadding;
  const plotMaxX = chart.plotLeft + chart.plotWidth - pillWidth - plotPadding;
  const pillX =
    getBestHorizontalLabelX({
      baseX,
      labelWidth: pillWidth,
      maxX: plotMaxX,
      meanX,
      minX: plotMinX,
    }) ??
    (plotMinX <= plotMaxX
      ? clampPixelPosition(baseX + 8, plotMinX, plotMaxX)
      : chart.plotLeft);
  const minCenterY = chart.plotTop + pillHeight / 2 + plotPadding;
  const maxCenterY =
    chart.plotTop + chart.plotHeight - pillHeight / 2 - plotPadding;
  const pillCenterY = getClampedCenter(yCenter, minCenterY, maxCenterY);
  const pillY = pillCenterY - pillHeight / 2;
  const pillRight = pillX + pillWidth;
  const connectorEndX =
    baseX < pillX ? pillX : baseX > pillRight ? pillRight : null;

  if (connectorEndX !== null) {
    renderer
      .path([
        ["M", baseX, yCenter],
        ["L", connectorEndX, pillCenterY],
      ])
      .attr({
        stroke: "#334155",
        "stroke-linecap": "round",
        "stroke-width": 1.5,
      })
      .css({
        pointerEvents: "none",
      })
      .add(layer);
  }

  renderer
    .rect(pillX, pillY, pillWidth, pillHeight, 4)
    .attr({
      fill: "#ffffff",
      opacity: 0.96,
      stroke: "#cbd5e1",
      "stroke-width": 1,
    })
    .css({
      pointerEvents: "none",
    })
    .add(layer);

  renderer
    .text(text, pillX + pillWidth / 2, pillY + pillPaddingY - textBox.y)
    .attr({
      align: "center",
    })
    .css({
      ...fontStyles,
      color: "#0f172a",
    })
    .add(layer);
}

function attachRangeTooltip(range, chart, tooltipElement, item) {
  range.element.addEventListener("mouseenter", (event) => {
    showUncertaintyTooltip(chart, tooltipElement, item, event);
  });
  range.element.addEventListener("mousemove", (event) => {
    positionUncertaintyTooltip(chart, tooltipElement, event);
  });
  range.element.addEventListener("mouseleave", () => {
    hideUncertaintyTooltip(tooltipElement);
  });
}

function drawUncertaintyRanges(chart) {
  const config = chart.options.custom?.uncertainty;
  if (!config) {
    destroyUncertaintyLayer(chart);
    return;
  }

  destroyUncertaintyLayer(chart);

  const isVertical = config.orientation === "vertical";
  const valueAxis = isVertical ? chart.yAxis[0] : chart.xAxis[0];
  const categoryAxis = isVertical ? chart.xAxis[0] : chart.yAxis[0];
  const axisMin = valueAxis.min ?? config.axisBounds.min;
  const axisMax = valueAxis.max ?? config.axisBounds.max;
  const renderer = chart.renderer;
  const clipRect = renderer.clipRect(
    chart.plotLeft,
    chart.plotTop,
    chart.plotWidth,
    chart.plotHeight
  );
  const layer = renderer
    .g("uncertainty-ranges")
    .attr({ zIndex: 3 })
    .clip(clipRect)
    .add();
  const tooltipElement = createUncertaintyTooltip(chart);
  const categorySpan = isVertical ? chart.plotWidth : chart.plotHeight;
  const categoryStep =
    config.rows.length > 1
      ? Math.abs(categoryAxis.toPixels(1) - categoryAxis.toPixels(0))
      : categorySpan / Math.max(config.rows.length, 1);
  const maxBarThickness = Math.max(8, categoryStep - 6);
  const barThickness = Math.max(
    6,
    Math.min(maxBarThickness, categoryStep * config.barHeight)
  );

  config.rows.forEach((item) => {
    if (item.empty) {
      return;
    }

    const { row } = item;
    const visibleLow = clampToAxis(row.low, axisMin, axisMax);
    const visibleHigh = clampToAxis(row.high, axisMin, axisMax);

    if (visibleLow === visibleHigh) {
      return;
    }

    const categoryCenter = categoryAxis.toPixels(item.index);
    const baseIsVisible = row.base >= visibleLow && row.base <= visibleHigh;
    const meanIsVisible = row.mean >= visibleLow && row.mean <= visibleHigh;
    const meanPosition =
      config.showMean && meanIsVisible ? valueAxis.toPixels(row.mean) : null;
    const titleText = `${row.name}: Low ${item.formattedLow}, Base ${item.formattedBase}, High ${item.formattedHigh}, Mean ${item.formattedMean}, Spread ${item.formattedSpread}`;

    if (isVertical) {
      const yLow = valueAxis.toPixels(visibleLow);
      const yHigh = valueAxis.toPixels(visibleHigh);
      const x = categoryCenter - barThickness / 2;
      const y = Math.min(yLow, yHigh);
      const height = Math.max(1, Math.abs(yHigh - yLow));
      const range = renderer
        .rect(x, y, barThickness, height, 0)
        .attr({
          "aria-label": titleText,
          fill: item.color,
          role: "img",
          stroke: UNCERTAINTY_BAR_BORDER_COLOR,
          "stroke-width": 1,
        })
        .add(layer);
      attachRangeTooltip(range, chart, tooltipElement, item);

      if (!baseIsVisible) {
        if (meanPosition !== null) {
          drawMeanMarker(
            renderer,
            layer,
            categoryCenter,
            meanPosition,
            barThickness
          );
        }
        return;
      }

      const baseY = valueAxis.toPixels(row.base);
      const lineLeft = x + 2;
      const lineRight = x + barThickness - 2;

      renderer
        .path([
          ["M", lineLeft, baseY],
          ["L", lineRight, baseY],
        ])
        .attr({
          stroke: "#ffffff",
          "stroke-linecap": "round",
          "stroke-width": 2,
        })
        .css({
          pointerEvents: "none",
        })
        .add(layer);

      if (config.showLabels) {
        drawVerticalBaseLabel({
          barThickness,
          baseY,
          categoryCenter,
          chart,
          layer,
          meanY: meanPosition,
          rangeBottom: y + height,
          rangeTop: y,
          renderer,
          text: item.formattedBase,
        });
      }

      if (meanPosition !== null) {
        drawMeanMarker(
          renderer,
          layer,
          categoryCenter,
          meanPosition,
          barThickness
        );
      }

      return;
    }

    const xLow = valueAxis.toPixels(visibleLow);
    const xHigh = valueAxis.toPixels(visibleHigh);
    const x = Math.min(xLow, xHigh);
    const width = Math.max(1, Math.abs(xHigh - xLow));
    const yCenter = categoryCenter;
    const y = yCenter - barThickness / 2;
    const range = renderer
      .rect(x, y, width, barThickness, 0)
      .attr({
        "aria-label": titleText,
        fill: item.color,
        role: "img",
        stroke: UNCERTAINTY_BAR_BORDER_COLOR,
        "stroke-width": 1,
      })
      .add(layer);
    attachRangeTooltip(range, chart, tooltipElement, item);

    if (!baseIsVisible) {
      if (meanPosition !== null) {
        drawMeanMarker(renderer, layer, meanPosition, yCenter, barThickness);
      }
      return;
    }

    const baseX = valueAxis.toPixels(row.base);
    const lineTop = y + 2;
    const lineBottom = y + barThickness - 2;

    renderer
      .path([
        ["M", baseX, lineTop],
        ["L", baseX, lineBottom],
      ])
      .attr({
        stroke: "#ffffff",
        "stroke-linecap": "round",
        "stroke-width": 2,
      })
      .css({
        pointerEvents: "none",
      })
      .add(layer);

    if (config.showLabels) {
      drawHorizontalBaseLabel({
        barThickness,
        baseX,
        chart,
        layer,
        meanX: meanPosition,
        rangeLeft: x,
        rangeRight: x + width,
        renderer,
        text: item.formattedBase,
        yCenter,
      });
    }

    if (meanPosition !== null) {
      drawMeanMarker(renderer, layer, meanPosition, yCenter, barThickness);
    }
  });

  chart.uncertaintyLayer = { clipRect, layer, tooltipElement };
}

function getChartConfig(options) {
  return {
    chart: {
      ...options.chart,
      events: {
        ...options.chart.events,
        render() {
          options.chart.events?.render?.call(this);
          drawUncertaintyRanges(this);
        },
      },
    },
    credits: { enabled: false },
    custom: options.custom,
    legend: options.legend,
    plotOptions: options.plotOptions,
    series: options.series,
    title: { text: "" },
    tooltip: options.tooltip,
    xAxis: options.xAxis,
    yAxis: options.yAxis,
  };
}

function updateExistingChart(chart, options) {
  const currentOrientation = chart.options.custom?.uncertainty?.orientation;
  const nextOrientation = options.custom?.uncertainty?.orientation;

  if (currentOrientation !== nextOrientation) {
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
      custom: options.custom,
      legend: options.legend,
      plotOptions: options.plotOptions,
      series: options.series,
      tooltip: options.tooltip,
      xAxis: options.xAxis,
      yAxis: options.yAxis,
    },
    true,
    true,
    false
  );
  return true;
}

export function createUncertaintyChartController(container) {
  let chart = null;

  return {
    destroy() {
      destroyUncertaintyLayer(chart);
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
        destroyUncertaintyLayer(chart);
        chart.destroy();
        chart = Highcharts.chart(container, getChartConfig(options));
      }

      return chart;
    },
  };
}

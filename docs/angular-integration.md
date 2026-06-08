# Angular Integration Notes

`chartkit` is split into two entrypoints:

- `src/chartkit/index.js` is the stable embeddable chart API.
- `src/chartkit/demo-controls.js` is for the Vite demo pages and should not be needed by an Angular app.

Build the package artifact with:

```sh
npm run build:chartkit
```

The output lives in `dist/chartkit/`. The build keeps `highcharts` external, so the Angular app should install and own the `highcharts` dependency.

## Recommended Ownership

Angular should own:

- templates and form controls
- input state and validation UX
- data fetching
- layout around the chart host element
- any chart-height resize handle or reset affordance

`chartkit` should own:

- sorting and slicing chart data
- axis bounds and formatted chart options
- Highcharts mount, update, and destroy lifecycle
- category-axis label markup, including full-label hover text for labels that are visually truncated

## Bar Chart Component Shape

Use `ngAfterViewInit` to create the mount, call the view-model builder whenever inputs change, and call `destroy()` from `ngOnDestroy`.

```ts
import {
  createBarChartViewModel,
  mountBarChart,
} from "../chartkit";

export class BarChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild("chartHost", { static: true })
  chartHost!: ElementRef<HTMLElement>;

  @Input() categories: string[] = [];
  @Input() data: number[] = [];
  @Input() settings = {
    autoScale: true,
    barHeight: "0.75",
    chartHeight: "400",
    currentStart: 0,
    leftMargin: "100",
    orientation: "horizontal",
    showLabels: true,
    sort: "valueDesc",
    windowSize: 5,
    yMax: "100",
    yMin: "0",
  };

  private chartMount?: ReturnType<typeof mountBarChart>;

  ngAfterViewInit(): void {
    this.chartMount = mountBarChart(this.chartHost.nativeElement);
    this.renderChart();
  }

  ngOnChanges(): void {
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.chartMount?.destroy();
  }

  private renderChart(): void {
    if (!this.chartMount) {
      return;
    }

    const formatter = new Intl.NumberFormat("en-US", {
      notation: "compact",
      style: "currency",
      currency: "USD",
    });
    const viewModel = createBarChartViewModel({
      categories: this.categories,
      data: this.data,
      formatters: {
        barValueFormatter: formatter,
        valueAxisFormatter: formatter,
      },
      settings: this.settings,
    });

    this.chartMount.update(viewModel.chartOptions);
  }
}
```

Template:

```html
<div #chartHost class="chart-host"></div>
```

## Uncertainty Chart Component Shape

The uncertainty chart follows the same lifecycle. The row values can arrive as strings from Angular forms or as numbers from application data.

```ts
import {
  createUncertaintyChartViewModel,
  mountUncertaintyChart,
} from "../chartkit";

type UncertaintyRow = {
  id?: string;
  name: string;
  low: string | number;
  base: string | number;
  high: string | number;
};

export class UncertaintyChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild("chartHost", { static: true })
  chartHost!: ElementRef<HTMLElement>;

  @Input() rows: UncertaintyRow[] = [];
  @Input() settings = {
    autoScale: true,
    barHeight: "0.72",
    chartHeight: "400",
    color: "#2caffe",
    currentStart: 0,
    leftMargin: "120",
    orientation: "horizontal",
    showLabels: true,
    showMean: true,
    sort: "baseDesc",
    windowSize: 5,
    yMax: "100",
    yMin: "0",
  };

  private chartMount?: ReturnType<typeof mountUncertaintyChart>;

  ngAfterViewInit(): void {
    this.chartMount = mountUncertaintyChart(this.chartHost.nativeElement);
    this.renderChart();
  }

  ngOnChanges(): void {
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.chartMount?.destroy();
  }

  private renderChart(): void {
    if (!this.chartMount) {
      return;
    }

    const compactCurrency = new Intl.NumberFormat("en-US", {
      currency: "USD",
      notation: "compact",
      style: "currency",
    });
    const standardCurrency = new Intl.NumberFormat("en-US", {
      currency: "USD",
      style: "currency",
    });
    const viewModel = createUncertaintyChartViewModel({
      formatters: {
        markerFormatter: standardCurrency,
        rangeFormatter: compactCurrency,
        valueAxisFormatter: compactCurrency,
      },
      rows: this.rows,
      settings: this.settings,
    });

    this.chartMount.update(viewModel.chartOptions);
  }
}
```

## Signals Or Reactive Forms

With Angular signals, the same render call can live inside an `effect` after the view is initialized:

```ts
effect(() => {
  const mount = this.chartMount();
  if (!mount) {
    return;
  }

  const viewModel = createBarChartViewModel({
    categories: this.categories(),
    data: this.data(),
    formatters: this.formatters(),
    settings: this.settings(),
  });

  mount.update(viewModel.chartOptions);
});
```

For reactive forms, convert the form state into the `settings` object and rebuild the view model in the form subscription.

## Windowed Scrolling

The current demos use a custom scrollbar control. In Angular, keep scrollbar state in the component and pass it as:

- `settings.currentStart`
- `settings.windowSize`

When those values change, rebuild the view model and call `mount.update(...)`. The bar chart also exposes `updateWindow(...)`, but `update(...)` is simpler and works for both chart types.

## Chart Height Resizing

The Vite demos include a centered resize pill between the chart and the data table. That pill is demo UI, not part of `chartkit`. An Angular host can implement the same interaction by updating `settings.chartHeight` and then rebuilding the view model.

The demo behavior is:

- drag the pill to change `settings.chartHeight`
- double-click the pill to restore the default chart height
- clamp the maximum height to the available chart viewport space
- keep any visible Chart Height form control synchronized with the dragged value

## Import Paths

During local development, the Angular app can point at the built artifact:

```ts
import { mountBarChart } from "../path-to-repo/dist/chartkit/index.js";
```

For a workspace package, expose `dist/chartkit/index.js` as the package entrypoint and keep `highcharts` as a peer dependency.

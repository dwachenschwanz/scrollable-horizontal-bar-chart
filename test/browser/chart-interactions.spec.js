import { expect, test } from "@playwright/test";

const apps = [
  {
    name: "scrollable bar chart",
    path: "/scrollable-horizontal-bar-chart/",
  },
  {
    name: "uncertainty range comparison",
    path: "http://127.0.0.1:5174/uncertainty-range-comparison/",
  },
];

async function openApp(page, path) {
  await page.goto(path);
  await expect(page.locator(".highcharts-container")).toBeVisible();
  await expect(page.locator("#chartResizeHandle")).toBeVisible();
}

async function getChartHeight(page) {
  const box = await page.locator("#container").boundingBox();

  if (!box) {
    throw new Error("Chart container is not visible.");
  }

  return box.height;
}

async function dragFromBoxCenter(page, box, deltaY) {
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + deltaY, { steps: 6 });
  await page.mouse.up();
}

for (const app of apps) {
  test.describe(app.name, () => {
    test("resizes from the pill and resets on double-click", async ({ page }) => {
      await openApp(page, app.path);

      const initialHeight = await getChartHeight(page);
      const handleBox = await page.locator("#chartResizeHandle").boundingBox();
      expect(handleBox).not.toBeNull();

      await dragFromBoxCenter(page, handleBox, 100);
      await expect
        .poll(() => getChartHeight(page), {
          message: "chart height should grow after dragging the resize pill",
        })
        .toBeGreaterThan(initialHeight + 40);

      await page.locator("#chartResizeHandle").dblclick();
      await expect
        .poll(() => getChartHeight(page), {
          message: "chart height should reset after double-clicking the pill",
        })
        .toBeCloseTo(initialHeight, 0);
    });

    test("does not resize from the non-pill divider line", async ({ page }) => {
      await openApp(page, app.path);

      const initialHeight = await getChartHeight(page);
      const rowBox = await page.locator(".chart-resize-row").boundingBox();
      const handleBox = await page.locator("#chartResizeHandle").boundingBox();
      expect(rowBox).not.toBeNull();
      expect(handleBox).not.toBeNull();

      await dragFromBoxCenter(
        page,
        {
          height: rowBox.height,
          width: 2,
          x: rowBox.x + 20,
          y: rowBox.y,
        },
        100
      );

      await page.waitForTimeout(120);
      expect(await getChartHeight(page)).toBeCloseTo(initialHeight, 0);
    });

    test("supports keyboard resizing from the pill", async ({ page }) => {
      await openApp(page, app.path);

      const initialHeight = await getChartHeight(page);
      const handle = page.locator("#chartResizeHandle");

      await handle.focus();
      await page.keyboard.press("ArrowDown");
      await expect
        .poll(() => getChartHeight(page), {
          message: "ArrowDown should increase chart height",
        })
        .toBeGreaterThan(initialHeight);

      await page.keyboard.press("ArrowUp");
      await expect
        .poll(() => getChartHeight(page), {
          message: "ArrowUp should decrease chart height",
        })
        .toBeCloseTo(initialHeight, 0);

      await page.keyboard.press("End");
      const maxHeight = Number(await handle.getAttribute("aria-valuemax"));
      await expect
        .poll(() => getChartHeight(page), {
          message: "End should resize chart to the maximum height",
        })
        .toBeCloseTo(maxHeight, 0);

      await page.keyboard.press("Home");
      await expect
        .poll(() => getChartHeight(page), {
          message: "Home should resize chart to the minimum height",
        })
        .toBeCloseTo(300, 0);
    });

    test("opens analysis filters from the sidebar tab", async ({ page }) => {
      await openApp(page, app.path);

      await page.getByRole("tab", { name: "Analysis" }).click();

      await expect(page.locator("#panel-analysis")).toBeVisible();
      await expect(page.locator(".filter-builder")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Filter 1" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Filter 2" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Advanced Filter/i })).toHaveCount(0);
      await expect(page.locator("#panel-analysis").locator('input[type="radio"]')).toHaveCount(0);
      await expect(
        page.locator("#panel-analysis").getByRole("button", { name: "Apply" })
      ).toBeVisible();
      await expect(page.locator("#resetAnalysisButton")).toBeVisible();
      await expect(page.locator("#groupBySelector")).toBeVisible();
      await expect(page.locator("#expandUnassignedCheckbox")).toBeVisible();
      await expect(page.locator("#colorBySelector")).toBeVisible();
      await expect(page.locator("#panel-display")).toBeHidden();

      await page.locator("#groupBySelector").selectOption("country");
      await page.locator("#expandUnassignedCheckbox").setChecked(false);
      await page.locator("#colorBySelector").selectOption("colorTag");
      const filterValue = app.name === "scrollable bar chart" ? "value" : "spread";
      await page.locator(".filter-field-select").first().selectOption(filterValue);
      await page.locator("#resetAnalysisButton").click();

      await expect(page.locator("#groupBySelector")).toHaveValue("none");
      await expect(page.locator("#expandUnassignedCheckbox")).toBeChecked();
      await expect(page.locator("#colorBySelector")).toHaveValue("none");
      await expect(page.locator(".filter-field-select").first()).toHaveValue("none");
    });

    test("abridged axis labels expose full label text", async ({ page }) => {
      await openApp(page, app.path);

      const label = page.locator(".chart-axis-label[title]").first();
      await expect(label).toBeVisible();

      const title = await label.getAttribute("title");
      const ariaLabel = await label.getAttribute("aria-label");

      expect(title).toBeTruthy();
      expect(ariaLabel).toBe(title);
    });
  });
}

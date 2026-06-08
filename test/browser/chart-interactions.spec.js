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

import { test, expect } from "@playwright/test";

// The grid uses the browser's automatic table layout, so a column is exactly as
// wide as its widest cell. Entering edit mode swaps that cell's text for an
// <input> — the column must not resize because of it, in neither direction:
// shrinking (the input's intrinsic width is the browser default, ~20 chars,
// not the text width) nor growing (a frozen width applied to the wrong box).
test.describe("column width while editing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Turn the demo's text truncation off, otherwise no cell can ever render
    // wider than 25 characters and the collapse this test guards against is not
    // reachable. The toggle is persisted in localStorage, so check its state.
    const toggle = page.locator('.toolbar-button.toggle[title="Toggle text truncation"]');
    if ((await toggle.getAttribute("class"))!.includes("active")) await toggle.click();
    await expect(toggle).not.toHaveClass(/active/);
    // Few rows, so the edited cell really is the one that defines the column
    // width. With all 300 demo rows visible there is always another cell of
    // similar length holding the column open, and the collapse cannot show.
    await page.locator(".ct-pagination-select").selectOption("10");
  });

  const columnWidth = (page: import("@playwright/test").Page, colIdx: number) =>
    page.evaluate(
      (idx) =>
        (document.querySelectorAll("thead th")[idx] as HTMLElement).getBoundingClientRect().width,
      colIdx,
    );

  test("stays unchanged when the widest cell of a column is edited", async ({ page }) => {
    const target = await page.evaluate(() => {
      const td = document.querySelector<HTMLElement>("td.col-type-String:not(.col-readonly)")!;
      return { rowIdx: Number(td.dataset.rowIdx), colIdx: Number(td.dataset.colIdx) };
    });

    const cell = page.locator(
      `td[data-row-idx="${target.rowIdx}"][data-col-idx="${target.colIdx}"]`,
    );

    // The cell has to be the widest one AND wider than an <input>'s intrinsic
    // width (the browser default of ~20 characters) — that is the constellation
    // in which the column used to collapse on edit. The demo data is too short
    // for that, so the test writes a long value first.
    await cell.click();
    await page.keyboard.press("F2");
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("VersetzteSenkrechtprofileVariabelUndNochLaenger");
    await page.keyboard.press("Enter");
    await expect(cell).toHaveText("VersetzteSenkrechtprofileVariabelUndNochLaenger");

    const before = await columnWidth(page, target.colIdx);

    await cell.click();
    await page.keyboard.press("F2");
    await expect(cell.locator(".cell-editor-input")).toBeVisible();

    const during = await columnWidth(page, target.colIdx);
    expect(during).toBeCloseTo(before, 0);

    await page.keyboard.press("Escape");
    await expect(cell.locator(".cell-editor-input")).toHaveCount(0);
    expect(await columnWidth(page, target.colIdx)).toBeCloseTo(before, 0);
  });
});

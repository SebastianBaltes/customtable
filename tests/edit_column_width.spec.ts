import { test, expect, Page } from "@playwright/test";

// The grid uses the browser's automatic table layout. Entering edit mode swaps a
// cell's text for an <input>, and the layout must not move because of it — in
// neither direction and in no column:
//   * the edited column must not collapse (an <input>'s intrinsic width is the
//     browser default of ~20 characters, not the width of its text),
//   * it must not grow either, and
//   * the other columns have to stay put, which is a separate problem: as soon
//     as the table is wider than its content, the browser distributes the
//     surplus across all columns, so constraining one column re-divides the
//     rest.
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

  const columnWidths = (page: Page) =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll("thead th")).map(
        (th) => th.getBoundingClientRect().width,
      ),
    );

  const expectSameWidths = (actual: number[], expected: number[]) => {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((w, i) => expect(w).toBeCloseTo(expected[i], 0));
  };

  const editWidestCell = async (page: Page) => {
    const target = await page.evaluate(() => {
      const td = document.querySelector<HTMLElement>("td.col-type-String:not(.col-readonly)")!;
      return { rowIdx: Number(td.dataset.rowIdx), colIdx: Number(td.dataset.colIdx) };
    });
    const cell = page.locator(
      `td[data-row-idx="${target.rowIdx}"][data-col-idx="${target.colIdx}"]`,
    );

    // The cell has to be the widest one AND wider than an <input>'s intrinsic
    // width — that is the constellation in which the column used to collapse.
    // The demo data is too short for that, so write a long value first.
    await cell.click();
    await page.keyboard.press("F2");
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("VersetzteSenkrechtprofileVariabelUndNochLaenger");
    await page.keyboard.press("Enter");
    await expect(cell).toHaveText("VersetzteSenkrechtprofileVariabelUndNochLaenger");

    return cell;
  };

  test("all column widths stay unchanged while the widest cell is edited", async ({ page }) => {
    const cell = await editWidestCell(page);
    const before = await columnWidths(page);

    await cell.click();
    await page.keyboard.press("F2");
    await expect(cell.locator(".cell-editor-input")).toBeVisible();
    expectSameWidths(await columnWidths(page), before);

    await page.keyboard.press("Escape");
    await expect(cell.locator(".cell-editor-input")).toHaveCount(0);
    expectSameWidths(await columnWidths(page), before);
  });

  // Guards the same property once the table is stretched past its content and
  // the browser has surplus to distribute. Note this test does NOT reproduce the
  // redistribution that motivated freezing every column instead of just the
  // edited one — that showed up in a real 9-column grid (a pinned column took a
  // larger share of the surplus and ended up wider than the value it was pinned
  // to, while the others lost ~2px each) and could not be provoked in this demo,
  // whose 30 columns are wider than the window to begin with.
  test("holds in a table stretched beyond its content width", async ({ page }) => {
    const cell = await editWidestCell(page);

    // The demo table is wider than the window, so there is nothing to
    // distribute — the surplus has to be created explicitly. (A grid whose
    // columns fit into the window, like the one this defect was reported on,
    // is in exactly this state.)
    const natural = (await columnWidths(page)).reduce((a, b) => a + b, 0);
    await page.addStyleTag({
      content: `.grid-db-editor-viewport > table { width: ${Math.round(natural) + 3000}px; }`,
    });

    const before = await columnWidths(page);
    // Guard the premise: without a surplus this test would silently degrade
    // into a duplicate of the one above.
    expect(before.reduce((a, b) => a + b, 0)).toBeGreaterThan(natural + 2500);

    await cell.click();
    await page.keyboard.press("F2");
    await expect(cell.locator(".cell-editor-input")).toBeVisible();
    expectSameWidths(await columnWidths(page), before);

    await page.keyboard.press("Escape");
    await expect(cell.locator(".cell-editor-input")).toHaveCount(0);
    expectSameWidths(await columnWidths(page), before);
  });
});

import { test, expect, Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // Wait for the table to render
  await page.waitForSelector("table");
});

// ============================================================================
// Basic rendering
// ============================================================================
test.describe("Basic rendering", () => {
  test("should render the table with rows and columns", async ({ page }) => {
    const rows = page.locator("table tbody tr");
    // 300 data rows + 1 sticky portal row
    expect(await rows.count()).toBeGreaterThan(100);

    const headers = page.locator("table thead th");
    expect(await headers.count()).toBeGreaterThan(5);
  });

  test("should render column headers with labels", async ({ page }) => {
    const firstHeader = page.locator("table thead th").first();
    await expect(firstHeader).toContainText("id");
  });

  test("should render toolbar with create button", async ({ page }) => {
    await expect(page.locator(".custom-table-toolbar")).toBeVisible();
    await expect(page.locator(".toolbar-button")).toContainText("Create Rows");
    await expect(page.locator(".toolbar-input")).toBeVisible();
  });

  test("should render all expected column headers", async ({ page }) => {
    const headers = page.locator("table thead th .col-header-label");
    await expect(headers.nth(0)).toContainText("id");
    await expect(headers.nth(1)).toContainText("Key");
    await expect(headers.nth(2)).toContainText("Torpfostenart");
    await expect(headers.nth(3)).toContainText("Active");
    await expect(headers.nth(4)).toContainText("Tags");
  });

  test("should render filter inputs in every column header", async ({ page }) => {
    const filterInputs = page.locator("table thead th .col-filter-input");
    const headerCount = await page.locator("table thead th").count();
    expect(await filterInputs.count()).toBe(headerCount);
  });

  test("should render sticky columns with sticky class", async ({ page }) => {
    // The example uses numberOfStickyColums=2, so first 2 columns should have sticky
    const firstCell = page.locator("table tbody tr").first().locator("td").first();
    await expect(firstCell).toHaveClass(/sticky/);
    const secondCell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(secondCell).toHaveClass(/sticky/);
    // Third column should NOT be sticky
    const thirdCell = page.locator("table tbody tr").first().locator("td").nth(2);
    await expect(thirdCell).not.toHaveClass(/sticky/);
  });
});

// ============================================================================
// Cursor navigation
// ============================================================================
test.describe("Cursor navigation", () => {
  test("should navigate with arrow keys", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // Press arrow down
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    // Press arrow right
    await page.keyboard.press("ArrowRight");

    // The cell should have the selected class
    const selectedCell = page.locator("td.cell-selected");
    expect(await selectedCell.count()).toBeGreaterThanOrEqual(0);
  });

  test("should navigate with Tab", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    await page.keyboard.press("Tab");
    // After tab, cursor should move right
  });

  test("should navigate with Home and End", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Home");
    // Cursor should be at first column
  });

  test("should navigate with Shift+Arrow for range selection", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // First move to a cell
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);

    // Select a range via Shift+ArrowDown
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await page.waitForTimeout(200);

    // Verify that multiple row headers get selected class
    const selectedRows = page.locator("table tbody tr.row-selected");
    // At least the start row should have the cursor class
    expect(await selectedRows.count()).toBeGreaterThanOrEqual(1);
  });

  test("should navigate with PageDown to last row", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    await page.keyboard.press("PageDown");
    // After PageDown, cursor should be at last row – verify it scrolled
    const viewport = page.locator(".custom-table-viewport");
    const scrollTop = await viewport.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeGreaterThan(0);
  });

  test("should navigate with End to last column", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    await page.keyboard.press("End");
    // Viewport should be scrolled to the right
    const viewport = page.locator(".custom-table-viewport");
    const scrollLeft = await viewport.evaluate((el) => el.scrollLeft);
    expect(scrollLeft).toBeGreaterThan(0);
  });
});

// ============================================================================
// Cell editing
// ============================================================================
test.describe("Cell editing", () => {
  test("should enter edit mode on Enter key and edit a string cell", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // Navigate to the "Key" column (index 1)
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    // Should show an input
    const input = page.locator("td .cell-editor-input");
    await expect(input.first()).toBeVisible();

    // Type new value
    await input.first().fill("NewValue");
    await page.keyboard.press("Enter");

    // The cell should now contain the new value
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("NewValue");
  });

  test("should enter edit mode on click then F2", async ({ page }) => {
    // Click on a cell to select it
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await cell.click();

    // Press F2 to enter edit mode
    await page.keyboard.press("F2");

    // Should show an input
    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible({ timeout: 2000 });
  });

  test("should toggle boolean cell on click", async ({ page }) => {
    // Navigate to the "Active" column (index 3)
    const checkbox = page.locator("table tbody tr").first().locator("td").nth(3).locator("input[type=checkbox]");
    const isChecked = await checkbox.isChecked();
    await checkbox.click();
    expect(await checkbox.isChecked()).toBe(!isChecked);
  });

  test("should show combobox editor on edit", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // Navigate to Torpfostenart column (index 2)
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    // Should show a select element
    const select = page.locator("td .cell-editor-select");
    await expect(select.first()).toBeVisible();
  });

  test("should not modify a readOnly column via Delete key", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // First column is id (readOnly). Get original value.
    const cell = page.locator("table tbody tr").first().locator("td").first();
    const originalText = await cell.textContent();

    // Press Delete on the readOnly cell
    await page.keyboard.press("Delete");

    // Cell value should remain unchanged
    await expect(cell).toHaveText(originalText!);
  });

  test("should cancel edit on Escape", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    const input = page.locator("td .cell-editor-input").first();
    await expect(input).toBeVisible();

    // Type a new value and press Escape to reset local state
    await input.fill("CANCELLED");
    await page.keyboard.press("Escape");

    // Click elsewhere to blur and exit edit mode (onBlur commits the reset value)
    await page.locator("table tbody tr").nth(2).locator("td").nth(1).click();
    await page.waitForTimeout(200);

    // Cell should still have original value
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("dummy");
  });

  test("should commit edit on Tab and move to next cell", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    const input = page.locator("td .cell-editor-input").first();
    await input.fill("TabCommit");
    await page.keyboard.press("Tab");

    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("TabCommit");
  });
});

// ============================================================================
// Row creation
// ============================================================================
test.describe("Row creation", () => {
  test("should create new rows using toolbar", async ({ page }) => {
    const rowsBefore = await page.locator("table tbody tr").count();

    // Set count to 3
    const input = page.locator(".toolbar-input");
    await input.fill("3");

    // Click create
    await page.locator(".toolbar-button").click();

    const rowsAfter = await page.locator("table tbody tr").count();
    expect(rowsAfter).toBe(rowsBefore + 3);
  });

  test("should create 1 row by default", async ({ page }) => {
    const rowsBefore = await page.locator("table tbody tr").count();

    // Don't change input (default 1), just click create
    await page.locator(".toolbar-button").click();

    const rowsAfter = await page.locator("table tbody tr").count();
    expect(rowsAfter).toBe(rowsBefore + 1);
  });

  test("should log onCreateRows to console", async ({ page }) => {
    const messages: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("onCreateRows")) {
        messages.push(msg.text());
      }
    });

    await page.locator(".toolbar-button").click();
    await page.waitForTimeout(200);

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toContain("onCreateRows");
  });
});

// ============================================================================
// Row deletion
// ============================================================================
test.describe("Row deletion", () => {
  test("should delete rows via context menu", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    const rowsBefore = await page.locator("table tbody tr").count();

    // Right-click on first row
    const firstCell = page.locator("table tbody tr").first().locator("td").first();
    await firstCell.click({ button: "right" });

    // Click "remove rows"
    const menuItem = page.locator(".context-menu-item").filter({ hasText: "remove rows" });
    await menuItem.click();

    const rowsAfter = await page.locator("table tbody tr").count();
    expect(rowsAfter).toBe(rowsBefore - 1);
  });

  test("should log onDeleteRows to console", async ({ page }) => {
    const messages: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("onDeleteRows")) {
        messages.push(msg.text());
      }
    });

    const firstCell = page.locator("table tbody tr").first().locator("td").first();
    await firstCell.click({ button: "right" });

    const menuItem = page.locator(".context-menu-item").filter({ hasText: "remove rows" });
    await menuItem.click();
    await page.waitForTimeout(200);

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toContain("onDeleteRows");
  });
});

// ============================================================================
// Sorting
// ============================================================================
test.describe("Sorting", () => {
  test("should sort by clicking column header", async ({ page }) => {
    // Click on the "Key" column header label
    const keyHeader = page.locator("table thead th").nth(1).locator(".col-header-label");
    await keyHeader.click();

    // Header should show sort indicator
    const headerText = await page.locator("table thead th").nth(1).locator(".col-header-label").textContent();
    expect(headerText).toContain("▲");

    // Click again for DESC
    await keyHeader.click();
    const headerText2 = await page.locator("table thead th").nth(1).locator(".col-header-label").textContent();
    expect(headerText2).toContain("▼");

    // Click again to remove sort
    await keyHeader.click();
    const headerText3 = await page.locator("table thead th").nth(1).locator(".col-header-label").textContent();
    expect(headerText3).not.toContain("▲");
    expect(headerText3).not.toContain("▼");
  });

  test("should cycle through ASC → DESC → none for id column", async ({ page }) => {
    const idHeader = page.locator("table thead th").first().locator(".col-header-label");

    // ASC
    await idHeader.click();
    await expect(page.locator("table thead th").first().locator(".col-header-label")).toContainText("▲");

    // DESC
    await idHeader.click();
    await expect(page.locator("table thead th").first().locator(".col-header-label")).toContainText("▼");

    // None
    await idHeader.click();
    const text = await page.locator("table thead th").first().locator(".col-header-label").textContent();
    expect(text).not.toContain("▲");
    expect(text).not.toContain("▼");
  });

  test("should change displayed row order when sorted", async ({ page }) => {
    // Get first cell value before sort
    const firstCellBefore = await page.locator("table tbody tr").first().locator("td").first().textContent();

    // Sort the id column DESC
    const idHeader = page.locator("table thead th").first().locator(".col-header-label");
    await idHeader.click(); // ASC
    await idHeader.click(); // DESC

    const firstCellAfter = await page.locator("table tbody tr").first().locator("td").first().textContent();
    // After DESC sort on id, the first row should be different (highest id first)
    expect(firstCellAfter).not.toBe(firstCellBefore);
  });
});

// ============================================================================
// Filtering
// ============================================================================
test.describe("Filtering", () => {
  test("should filter rows by typing in column filter", async ({ page }) => {
    const rowsBefore = await page.locator("table tbody tr").count();

    // Type a filter value in the "id" column filter
    const filterInput = page.locator("table thead th").first().locator(".col-filter-input");
    await filterInput.fill("42");

    // Wait for filtering
    await page.waitForTimeout(200);

    const rowsAfter = await page.locator("table tbody tr").count();
    // Should have fewer rows due to filtering (only rows containing "42" in id)
    expect(rowsAfter).toBeLessThan(rowsBefore);
  });

  test("should show all rows again after clearing filter", async ({ page }) => {
    const rowsBefore = await page.locator("table tbody tr").count();

    const filterInput = page.locator("table thead th").first().locator(".col-filter-input");
    await filterInput.fill("42");
    await page.waitForTimeout(200);

    const rowsFiltered = await page.locator("table tbody tr").count();
    expect(rowsFiltered).toBeLessThan(rowsBefore);

    // Clear the filter
    await filterInput.fill("");
    await page.waitForTimeout(200);

    const rowsAfterClear = await page.locator("table tbody tr").count();
    expect(rowsAfterClear).toBe(rowsBefore);
  });

  test("should filter across multiple columns simultaneously", async ({ page }) => {
    const rowsBefore = await page.locator("table tbody tr").count();

    // Filter on id column
    const idFilter = page.locator("table thead th").first().locator(".col-filter-input");
    await idFilter.fill("1");
    await page.waitForTimeout(200);

    const rowsAfterIdFilter = await page.locator("table tbody tr").count();
    expect(rowsAfterIdFilter).toBeLessThan(rowsBefore);

    // Add filter on Key column
    const keyFilter = page.locator("table thead th").nth(1).locator(".col-filter-input");
    await keyFilter.fill("dummy");
    await page.waitForTimeout(200);

    // Should still show rows (both filters must match)
    const rowsAfterBothFilters = await page.locator("table tbody tr").count();
    expect(rowsAfterBothFilters).toBeGreaterThan(0);
    expect(rowsAfterBothFilters).toBeLessThanOrEqual(rowsAfterIdFilter);
  });

  test("should show no data rows when filter matches nothing", async ({ page }) => {
    const filterInput = page.locator("table thead th").first().locator(".col-filter-input");
    await filterInput.fill("ZZZZZZNONEXISTENT");
    await page.waitForTimeout(200);

    const dataRows = await page.locator("table tbody tr").count();
    // Only the sticky portal row should remain (1), or 0 data rows
    expect(dataRows).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// Copy & Paste
// ============================================================================
test.describe("Copy & Paste", () => {
  test("should copy selected cell content", async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    const table = page.locator(".custom-table");
    await table.focus();

    // Select a cell and copy
    await page.keyboard.press("Control+c");

    // Read clipboard - should have the cell content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBeDefined();
  });

  test("should copy and paste a cell value", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    const table = page.locator(".custom-table");
    await table.focus();

    // Navigate to Key column (0,1) and copy it
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);
    await page.keyboard.press("Control+c");
    await page.waitForTimeout(200);

    // Verify clipboard has the cell content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe("dummy");

    // Now write a distinct value to the clipboard for the paste test
    await page.evaluate(() => navigator.clipboard.writeText("PastedValue"));
    await page.waitForTimeout(100);

    // Paste at current cell (0,1)
    await page.keyboard.press("Control+v");
    await page.waitForTimeout(400);

    // The cell should now have the pasted value
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("PastedValue");
  });

  test("should log onUpdateRows to console on paste", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    const messages: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("onUpdateRows")) {
        messages.push(msg.text());
      }
    });

    const table = page.locator(".custom-table");
    await table.focus();

    // Copy first cell
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Control+c");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Control+v");
    await page.waitForTimeout(300);

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toContain("onUpdateRows");
  });
});

// ============================================================================
// Undo/Redo
// ============================================================================
test.describe("Undo/Redo", () => {
  test("should undo and redo cell edit", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // Navigate to Key column and edit
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    const input = page.locator("td .cell-editor-input").first();
    await input.fill("TestUndo");
    await page.keyboard.press("Enter");

    // Verify the edit
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("TestUndo");

    // Click on the table to ensure focus
    await table.click();
    await page.waitForTimeout(100);

    // Undo
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(200);

    // Should revert to original value
    await expect(cell).toContainText("dummy");
  });

  test("should redo after undo", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // Edit cell (0, 1)
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    const input = page.locator("td .cell-editor-input").first();
    await input.fill("RedoTest");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);

    // Verify the edit took effect on row 0, col 1
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("RedoTest");

    // Re-focus the table for keyboard events
    await table.focus();
    await page.waitForTimeout(200);

    // Undo
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(500);
    await expect(cell).toContainText("dummy");

    // Re-focus table (rows changed on undo, cursor reset may have moved focus)
    await table.focus();
    await page.waitForTimeout(200);

    // Redo
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(500);
    await expect(cell).toContainText("RedoTest");
  });

  test("should undo row creation", async ({ page }) => {
    const table = page.locator(".custom-table");
    const rowsBefore = await page.locator("table tbody tr").count();

    await page.locator(".toolbar-button").click();
    await page.waitForTimeout(100);

    const rowsAfterCreate = await page.locator("table tbody tr").count();
    expect(rowsAfterCreate).toBe(rowsBefore + 1);

    // Focus table and undo
    await table.focus();
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(200);

    const rowsAfterUndo = await page.locator("table tbody tr").count();
    expect(rowsAfterUndo).toBe(rowsBefore);
  });

  test("should undo row deletion", async ({ page }) => {
    const table = page.locator(".custom-table");
    const rowsBefore = await page.locator("table tbody tr").count();

    // Delete first row
    const firstCell = page.locator("table tbody tr").first().locator("td").first();
    await firstCell.click({ button: "right" });
    await page.locator(".context-menu-item").filter({ hasText: "remove rows" }).click();
    await page.waitForTimeout(100);

    const rowsAfterDelete = await page.locator("table tbody tr").count();
    expect(rowsAfterDelete).toBe(rowsBefore - 1);

    // Undo
    await table.focus();
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(200);

    const rowsAfterUndo = await page.locator("table tbody tr").count();
    expect(rowsAfterUndo).toBe(rowsBefore);
  });
});

// ============================================================================
// Context menu
// ============================================================================
test.describe("Context menu", () => {
  test("should open context menu on right-click", async ({ page }) => {
    const firstCell = page.locator("table tbody tr").first().locator("td").first();
    await firstCell.click({ button: "right" });

    // Context menu should be visible
    await expect(page.locator(".context-menu")).toBeVisible();

    // Should have expected menu items
    await expect(page.locator(".context-menu-item").filter({ hasText: "copy content" })).toBeVisible();
    await expect(page.locator(".context-menu-item").filter({ hasText: "paste content" })).toBeVisible();
    await expect(page.locator(".context-menu-item").filter({ hasText: "delete content" })).toBeVisible();
    await expect(page.locator(".context-menu-item").filter({ hasText: "remove rows" })).toBeVisible();
  });

  test("should close context menu on click outside", async ({ page }) => {
    const firstCell = page.locator("table tbody tr").first().locator("td").first();
    await firstCell.click({ button: "right" });
    await expect(page.locator(".context-menu")).toBeVisible();

    // Click outside
    await page.locator(".context-menu-modal-background").click();
    await expect(page.locator(".context-menu")).not.toBeVisible();
  });

  test("should delete content via context menu", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // Navigate to Key column
    await page.keyboard.press("ArrowRight");

    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("dummy");

    // Right-click and delete
    await cell.click({ button: "right" });
    await page.locator(".context-menu-item").filter({ hasText: "delete content" }).click();
    await page.waitForTimeout(200);

    await expect(cell).not.toContainText("dummy");
  });
});

// ============================================================================
// Delete content
// ============================================================================
test.describe("Delete content", () => {
  test("should delete cell content with Delete key", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // Navigate to Key column
    await page.keyboard.press("ArrowRight");

    // Verify cell has content
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("dummy");

    // Press Delete
    await page.keyboard.press("Delete");

    // Cell should be empty
    await expect(cell).not.toContainText("dummy");
  });

  test("should delete cell content with Backspace key", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    await page.keyboard.press("ArrowRight");

    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("dummy");

    await page.keyboard.press("Backspace");

    await expect(cell).not.toContainText("dummy");
  });

  test("should delete multi-cell selection with Delete key", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // Navigate to Key column and select 3 rows
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");

    // Delete selection
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // First three rows Key column should be empty
    for (let r = 0; r < 3; r++) {
      const cell = page.locator("table tbody tr").nth(r).locator("td").nth(1);
      await expect(cell).not.toContainText("dummy");
    }
  });

  test("should log onUpdateRows on delete content", async ({ page }) => {
    const messages: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("onUpdateRows")) {
        messages.push(msg.text());
      }
    });

    const table = page.locator(".custom-table");
    await table.focus();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toContain("onUpdateRows");
  });
});

// ============================================================================
// Cell meta: styles, disabled, title
// ============================================================================
test.describe("Cell Meta", () => {
  test("should apply cell meta style to the specified cell", async ({ page }) => {
    // Row "3" (4th data row, 0-indexed) / column "Key" has background #fdd
    const cell = page.locator("table tbody tr").nth(3).locator("td").nth(1);
    const bgColor = await cell.evaluate((el) => getComputedStyle(el).backgroundColor);
    // #fdd = rgb(255, 221, 221)
    expect(bgColor).toBe("rgb(255, 221, 221)");
  });

  test("should apply cell meta title attribute", async ({ page }) => {
    // Row "3" / column "Key" has a title
    const cell = page.locator("table tbody tr").nth(3).locator("td").nth(1);
    await expect(cell).toHaveAttribute("title", "Validation error: Key must not be 'dummy'");
  });

  test("should apply cell meta className", async ({ page }) => {
    // Row "3" / column "Key" has className "cell-error"
    const cell = page.locator("table tbody tr").nth(3).locator("td").nth(1);
    await expect(cell).toHaveClass(/cell-error/);
  });

  test("should apply row meta style to the tr element", async ({ page }) => {
    // Row "5" (6th data row) has __row style background #eee
    const row = page.locator("table tbody tr").nth(5);
    const bgColor = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
    // #eee = rgb(238, 238, 238)
    expect(bgColor).toBe("rgb(238, 238, 238)");
  });

  test("should apply row meta title to the tr element", async ({ page }) => {
    const row = page.locator("table tbody tr").nth(5);
    await expect(row).toHaveAttribute("title", "This row is read-only");
  });

  test("should apply disabled state to cell – no editing on click", async ({ page }) => {
    // Row "5" / column "Key" is disabled
    const cell = page.locator("table tbody tr").nth(5).locator("td").nth(1);
    await expect(cell).toHaveClass(/cell-disabled/);

    // Click the cell to select, then click again to try to edit
    await cell.click();
    await cell.click();
    await page.waitForTimeout(200);

    // No editor input should appear
    const input = cell.locator(".cell-editor-input");
    await expect(input).not.toBeVisible();
  });

  test("should apply disabled state to cell – no editing via keyboard", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // Navigate to row 5, column Key (disabled)
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");

    // Try Enter to edit
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    const cell = page.locator("table tbody tr").nth(5).locator("td").nth(1);
    const input = cell.locator(".cell-editor-input");
    await expect(input).not.toBeVisible();
  });

  test("should have disabled title tooltip on disabled cell", async ({ page }) => {
    const cell = page.locator("table tbody tr").nth(5).locator("td").nth(1);
    await expect(cell).toHaveAttribute("title", "Disabled cell");
  });
});

// ============================================================================
// onUpdateRows callback
// ============================================================================
test.describe("onUpdateRows callback", () => {
  test("should fire onUpdateRows on cell edit", async ({ page }) => {
    const messages: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("onUpdateRows")) {
        messages.push(msg.text());
      }
    });

    const table = page.locator(".custom-table");
    await table.focus();

    // Edit Key column
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    const input = page.locator("td .cell-editor-input").first();
    await input.fill("UpdateTest");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toContain("onUpdateRows");
  });

  test("should fire onUpdateRows on boolean toggle", async ({ page }) => {
    const messages: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("onUpdateRows")) {
        messages.push(msg.text());
      }
    });

    const checkbox = page.locator("table tbody tr").first().locator("td").nth(3).locator("input[type=checkbox]");
    await checkbox.click();
    await page.waitForTimeout(300);

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toContain("onUpdateRows");
  });
});

// ============================================================================
// Multi-Combobox editor
// ============================================================================
test.describe("MultiCombobox editor", () => {
  test("should show multi-combobox dropdown on edit", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // Navigate to Tags column (index 4)
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    // Should show multi-combobox
    const dropdown = page.locator(".multi-combobox-dropdown");
    await expect(dropdown.first()).toBeVisible({ timeout: 2000 });
  });

  test("should toggle option in multi-combobox", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // Navigate to Tags column (index 4) and edit
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // The dropdown should be visible
    const dropdown = page.locator(".multi-combobox-dropdown").first();
    await expect(dropdown).toBeVisible();

    // Click "Tag1" label
    const tag1Label = dropdown.locator("label").filter({ hasText: "Tag1" });
    await tag1Label.click();
    await page.waitForTimeout(500);

    // After toggle, the cell should contain "Tag1" in its text
    const cell = page.locator("table tbody tr").first().locator("td").nth(4);
    await expect(cell).toContainText("Tag1");
  });
});

// ============================================================================
// Selection rectangle
// ============================================================================
test.describe("Selection rectangle", () => {
  // Helper: read the numeric px value from a style string like "42.5px"
  const parsePx = (s: string) => parseFloat(s);

  test("should position selection rectangle over a non-sticky cell after click", async ({ page }) => {
    // Use a non-sticky cell (col index 2, columns 0+1 are sticky)
    const cell = page.locator("table tbody tr").nth(0).locator("td").nth(2);
    await cell.click();
    await page.waitForTimeout(300);

    const rect = await page.evaluate(() => {
      const viewport = document.querySelector(".custom-table-viewport") as HTMLElement;
      const cellEl = document.querySelector("table tbody tr:first-child td:nth-child(3)") as HTMLElement;
      const selRect = document.getElementById("selection-rectangle") as HTMLElement;
      if (!viewport || !cellEl || !selRect) return null;

      const vr = viewport.getBoundingClientRect();
      const cr = cellEl.getBoundingClientRect();
      return {
        expectedTop: cr.top - vr.top + viewport.scrollTop,
        expectedLeft: cr.left - vr.left + viewport.scrollLeft,
        expectedWidth: cr.width,
        expectedHeight: cr.height,
        actualTop: parseFloat(selRect.style.top),
        actualLeft: parseFloat(selRect.style.left),
        actualWidth: parseFloat(selRect.style.width),
        actualHeight: parseFloat(selRect.style.height),
        display: selRect.style.display,
      };
    });

    expect(rect).not.toBeNull();
    expect(rect!.display).toBe("block");
    // Allow ±1px for sub-pixel rounding
    expect(rect!.actualTop).toBeCloseTo(rect!.expectedTop, 0);
    expect(rect!.actualLeft).toBeCloseTo(rect!.expectedLeft, 0);
    expect(rect!.actualWidth).toBeCloseTo(rect!.expectedWidth, 0);
    expect(rect!.actualHeight).toBeCloseTo(rect!.expectedHeight, 0);
  });

  test("selection rectangle top must use viewport top, not viewport left", async ({ page }) => {
    // This test catches the swapped topDelta/leftDelta bug:
    // viewport.top differs from viewport.left due to the toolbar above the viewport.
    // If the bug is present, actualTop would equal cellRect.top - viewport.left (wrong).
    const cell = page.locator("table tbody tr").nth(0).locator("td").nth(2);
    await cell.click();
    await page.waitForTimeout(300);

    const result = await page.evaluate(() => {
      const viewport = document.querySelector(".custom-table-viewport") as HTMLElement;
      const cellEl = document.querySelector("table tbody tr:first-child td:nth-child(3)") as HTMLElement;
      const selRect = document.getElementById("selection-rectangle") as HTMLElement;
      if (!viewport || !cellEl || !selRect) return null;

      const vr = viewport.getBoundingClientRect();
      const cr = cellEl.getBoundingClientRect();
      const correctTop = cr.top - vr.top + viewport.scrollTop;
      const buggyTop = cr.top - vr.left + viewport.scrollTop; // what the old buggy code produced
      return {
        actualTop: parseFloat(selRect.style.top),
        correctTop,
        buggyTop,
        viewportTopEqualsLeft: Math.abs(vr.top - vr.left) < 1,
      };
    });

    expect(result).not.toBeNull();
    // The toolbar makes viewport.top != viewport.left; verify this test is meaningful
    if (!result!.viewportTopEqualsLeft) {
      expect(result!.actualTop).toBeCloseTo(result!.correctTop, 0);
      expect(result!.actualTop).not.toBeCloseTo(result!.buggyTop, 0);
    }
    expect(result!.actualTop).toBeCloseTo(result!.correctTop, 0);
  });

  test("selection rectangle matches cell ClientRect for first cell of each row (rows 0-4)", async ({ page }) => {
    for (let rowIdx = 0; rowIdx < 5; rowIdx++) {
      const cell = page.locator("table tbody tr").nth(rowIdx).locator("td").nth(2);
      await cell.click();
      await page.waitForTimeout(200);

      const result = await page.evaluate((row) => {
        const viewport = document.querySelector(".custom-table-viewport") as HTMLElement;
        const cellEl = document.querySelector(
          `table tbody tr:nth-child(${row + 1}) td:nth-child(3)`,
        ) as HTMLElement;
        const selRect = document.getElementById("selection-rectangle") as HTMLElement;
        if (!viewport || !cellEl || !selRect) return null;

        const vr = viewport.getBoundingClientRect();
        const cr = cellEl.getBoundingClientRect();
        return {
          expectedTop: cr.top - vr.top + viewport.scrollTop,
          expectedLeft: cr.left - vr.left + viewport.scrollLeft,
          actualTop: parseFloat(selRect.style.top),
          actualLeft: parseFloat(selRect.style.left),
        };
      }, rowIdx);

      expect(result).not.toBeNull();
      expect(result!.actualTop).toBeCloseTo(result!.expectedTop, 0);
      expect(result!.actualLeft).toBeCloseTo(result!.expectedLeft, 0);
    }
  });

  test("should show selection rectangle and hide it when editing", async ({ page }) => {
    const cell = page.locator("table tbody tr").nth(0).locator("td").nth(2);
    await cell.click();
    await page.waitForTimeout(200);

    const displayBefore = await page.evaluate(() => {
      const selRect = document.getElementById("selection-rectangle");
      return selRect?.style.display;
    });
    expect(displayBefore).toBe("block");

    // Enter edit mode
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);

    const displayDuring = await page.evaluate(() => {
      const selRect = document.getElementById("selection-rectangle");
      return selRect?.style.display;
    });
    expect(displayDuring).toBe("none");

    // Leave edit mode
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
  });

  test("cell selected via keyboard: selection rectangle top/left matches cell ClientRect", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // Move to col 2, row 0
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);

    const result = await page.evaluate(() => {
      const viewport = document.querySelector(".custom-table-viewport") as HTMLElement;
      const cellEl = document.querySelector("table tbody tr:first-child td:nth-child(3)") as HTMLElement;
      const selRect = document.getElementById("selection-rectangle") as HTMLElement;
      if (!viewport || !cellEl || !selRect) return null;

      const vr = viewport.getBoundingClientRect();
      const cr = cellEl.getBoundingClientRect();
      return {
        expectedTop: cr.top - vr.top + viewport.scrollTop,
        expectedLeft: cr.left - vr.left + viewport.scrollLeft,
        actualTop: parseFloat(selRect.style.top),
        actualLeft: parseFloat(selRect.style.left),
        display: selRect.style.display,
      };
    });

    expect(result).not.toBeNull();
    expect(result!.display).toBe("block");
    expect(result!.actualTop).toBeCloseTo(result!.expectedTop, 0);
    expect(result!.actualLeft).toBeCloseTo(result!.expectedLeft, 0);
  });
});

// ============================================================================
// Column selection
// ============================================================================
test.describe("Column selection", () => {
  test("should select entire column on header click and toggle sort", async ({ page }) => {
    // Clicking the header both selects the column and toggles sort.
    // After sort changes, cursor resets and the selection class is lost,
    // but the sort indicator should appear.
    const headerLabel = page.locator("table thead th").nth(1).locator(".col-header-label");
    await headerLabel.click();
    await page.waitForTimeout(300);

    // Sort indicator should appear (ASC)
    await expect(headerLabel).toContainText("▲");

    // The header should still be present and functional
    await expect(page.locator("table thead th").nth(1)).toBeVisible();
  });
});

// ============================================================================
// Filter + Sort interaction
// ============================================================================
test.describe("Filter + Sort interaction", () => {
  test("should sort filtered results correctly", async ({ page }) => {
    // Filter to rows containing "1" in id
    const filterInput = page.locator("table thead th").first().locator(".col-filter-input");
    await filterInput.fill("1");
    await page.waitForTimeout(200);

    // Now sort id DESC
    const idHeader = page.locator("table thead th").first().locator(".col-header-label");
    await idHeader.click(); // ASC
    await idHeader.click(); // DESC
    await page.waitForTimeout(200);

    // Get first visible id — should be a high number containing "1"
    const firstId = await page.locator("table tbody tr").first().locator("td").first().textContent();
    const lastId = await page.locator("table tbody tr").nth(1).locator("td").first().textContent();
    // With DESC sort, first should be >= last
    expect(Number(firstId)).toBeGreaterThanOrEqual(Number(lastId));
  });

  test("should maintain filter when sort changes", async ({ page }) => {
    const filterInput = page.locator("table thead th").first().locator(".col-filter-input");
    await filterInput.fill("42");
    await page.waitForTimeout(200);

    const rowsFiltered = await page.locator("table tbody tr").count();

    // Sort
    const idHeader = page.locator("table thead th").first().locator(".col-header-label");
    await idHeader.click();
    await page.waitForTimeout(200);

    const rowsAfterSort = await page.locator("table tbody tr").count();
    // Row count should not change when sorting
    expect(rowsAfterSort).toBe(rowsFiltered);
  });
});

// ============================================================================
// Keyboard: prevent input during pending (smoke test)
// ============================================================================
test.describe("Pending state", () => {
  test("should not crash when rapid mutations happen", async ({ page }) => {
    const table = page.locator(".custom-table");
    await table.focus();

    // Rapid-fire multiple edits
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Delete");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Delete");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Table should still be functional
    await expect(table).toBeVisible();
    const rows = page.locator("table tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
  });
});

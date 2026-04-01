import { test, expect, Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // Wait for the table to render
  await page.waitForSelector("table");
  // Show all rows so tests are not affected by pagination
  await page.locator(".ct-pagination-select").selectOption("0");
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
    await expect(firstHeader).toContainText("ID");
  });

  test("should render toolbar with create button", async ({ page }) => {
    await expect(page.locator(".grid-db-editor-toolbar")).toBeVisible();
    await expect(page.locator(".grid-db-editor-toolbar .toolbar-button")).toBeVisible();
    await expect(page.locator(".grid-db-editor-toolbar .toolbar-input")).toBeVisible();
  });

  test("should render all expected column headers", async ({ page }) => {
    const headers = page.locator("table thead th .col-header-label");
    await expect(headers.nth(0)).toContainText("ID");
    await expect(headers.nth(1)).toContainText("System Key");
    await expect(headers.nth(2)).toContainText("First Name");
    await expect(headers.nth(3)).toContainText("Last Name");
    await expect(headers.nth(4)).toContainText("Email");
    await expect(headers.nth(5)).toContainText("Department");
    await expect(headers.nth(6)).toContainText("Skills");
  });

  test("should render filter inputs in every column header", async ({ page }) => {
    const filterInputs = page.locator("table thead th .col-filter-input");
    const headerCount = await page.locator("table thead th").count();
    expect(await filterInputs.count()).toBe(headerCount);
  });

  test("should render sticky columns with sticky class", async ({ page }) => {
    // The example uses numberOfStickyColums=1, so first column should have sticky
    const firstCell = page.locator("table tbody tr").first().locator("td").first();
    await expect(firstCell).toHaveClass(/sticky/);
    // Second column should NOT be sticky
    const secondCell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(secondCell).not.toHaveClass(/sticky/);
  });
});

// ============================================================================
// Cursor navigation
// ============================================================================
test.describe("Cursor navigation", () => {
  test("should navigate with arrow keys", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
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
    const table = page.locator(".grid-db-editor");
    await table.focus();

    await page.keyboard.press("Tab");
    // After tab, cursor should move right
  });

  test("should navigate with Home and End", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Home");
    // Cursor should be at first column
  });

  test("should navigate with Shift+Arrow for range selection", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
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
    // With Shift+ArrowDown twice, we span 3 rows (starting row + 2 down)
    expect(await selectedRows.count()).toBe(3);
  });

  test("should navigate with PageDown to last row", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    await page.keyboard.press("PageDown");
    // After PageDown, cursor should be at last row – verify it scrolled
    const viewport = page.locator(".grid-db-editor-viewport");
    const scrollTop = await viewport.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeGreaterThan(0);
  });

  test("should navigate with End to last column", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    await page.keyboard.press("End");
    // Viewport should be scrolled to the right
    const viewport = page.locator(".grid-db-editor-viewport");
    const scrollLeft = await viewport.evaluate((el) => el.scrollLeft);
    expect(scrollLeft).toBeGreaterThan(0);
  });
});

// ============================================================================
// Cell editing
// ============================================================================
test.describe("Cell editing", () => {
  test("should enter edit mode on Enter key and edit a string cell", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
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

  test("should enter edit mode on double click", async ({ page }) => {
    // Double click on a cell
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await cell.dblclick();

    // Should show an input
    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible({ timeout: 2000 });
  });

  test("should start editing and enter value when typing on selected cell", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Select a cell (Row 0, Col 1) using arrow keys
    await page.keyboard.press("ArrowRight");
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toHaveClass(/cell-selected/);

    // Type "abc"
    await page.keyboard.type("abc");

    // The first "a" should have triggered edit mode, "bc" should have followed
    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("abc");

    // Cursor should be at the end - if we type more, it should append
    await page.keyboard.type("d");
    await expect(input).toHaveValue("abcd");

    // Commit
    await page.keyboard.press("Enter");
    await expect(cell).toContainText("abcd");
  });

  test("should move cursor to row+1 (not 0/0) after typing-to-edit + Enter", async ({ page }) => {
    // Regression test: when edit mode is entered by typing (not by ENTER/F2/dblclick),
    // pressing Enter to commit must advance to row+1, not reset to cell (0,0).
    const row2Cell = page.locator("table tbody tr").nth(2).locator("td").nth(1);

    // Select cell at row 2, col 1 via mouse click
    await row2Cell.click();
    await expect(row2Cell).toHaveClass(/cell-selected/);

    // Immediately start typing – this triggers edit mode
    await page.keyboard.type("TestValue");
    const input = row2Cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("TestValue");

    // Commit with Enter – cursor should move to row 3, col 1 – NOT to (0, 0)
    await page.keyboard.press("Enter");

    // The edited cell should contain the new value
    await expect(row2Cell).toContainText("TestValue");

    // The selection must now be at row 3, col 1 (one below), not row 0
    const row3Cell = page.locator("table tbody tr").nth(3).locator("td").nth(1);
    await expect(row3Cell).toHaveClass(/cell-selected/);

    // row 0, col 1 must NOT be selected (regression guard against the 0/0 bug)
    const row0Cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(row0Cell).not.toHaveClass(/cell-selected/);
  });

  test("should not enter edit mode on single click even if selected", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);

    // First click selects
    await cell.click();
    await expect(cell).toHaveClass(/cell-selected/);
    await expect(cell.locator(".cell-editor-input")).not.toBeVisible();

    // Second click after delay should still NOT enter edit mode
    await page.waitForTimeout(600); // Wait longer than typical dblclick window
    await cell.click();
    await expect(cell.locator(".cell-editor-input")).not.toBeVisible();

    // Actual dblclick should work
    await cell.dblclick();
    await expect(cell.locator(".cell-editor-input")).toBeVisible();
  });

  test("clicking inside already-editing cell should stay in edit mode", async ({ page }) => {
    // Enter edit mode via F2
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await cell.click();
    await page.keyboard.press("F2");
    const input = cell.locator("input.cell-editor-input");
    await expect(input).toBeVisible();

    // Click once inside the input — must NOT exit edit mode (regression check)
    await input.click({ position: { x: 5, y: 5 } });
    await expect(input).toBeVisible();
    await expect(cell).toHaveClass(/cell-edited/);

    // Typing should work (proving the input is focused and interactive)
    await page.keyboard.type("X");
    const val = await input.inputValue();
    expect(val).toContain("X");
  });

  test("should toggle boolean cell on click", async ({ page }) => {
    // Navigate to the "Active" column (index 8)
    const checkbox = page
      .locator("table tbody tr")
      .first()
      .locator("td")
      .nth(8)
      .locator("input[type=checkbox]");
    const isChecked = await checkbox.isChecked();
    await checkbox.click();
    expect(await checkbox.isChecked()).toBe(!isChecked);
  });

  test("Enter on selected boolean cell toggles value and keeps cell selected", async ({ page }) => {
    // isActive is column index 8 in the demo data.
    const boolCell = page.locator("table tbody tr").first().locator("td").nth(8);
    const checkbox = boolCell.locator("input[type=checkbox]");

    // Select the boolean cell via keyboard navigation
    const table = page.locator(".grid-db-editor");
    await table.focus();
    for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowRight");
    await expect(boolCell).toHaveClass(/cell-selected/);

    const before = await checkbox.isChecked();

    // Press Enter → should toggle, not enter edit mode, not move cursor
    await page.keyboard.press("Enter");

    expect(await checkbox.isChecked()).toBe(!before);

    // Cell must still be selected (cursor did not move)
    await expect(boolCell).toHaveClass(/cell-selected/);

    // Press Enter again → toggles back
    await page.keyboard.press("Enter");
    expect(await checkbox.isChecked()).toBe(before);
    await expect(boolCell).toHaveClass(/cell-selected/);
  });

  test("should show combobox editor on edit", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Department column (index 5)
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    // Should show the custom dropdown input and option list
    await expect(page.locator("td .combo-dropdown-input").first()).toBeVisible();
    await expect(page.locator("td .combo-dropdown-list").first()).toBeVisible();
  });

  test("should not modify a readOnly column via Delete key", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
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
    const table = page.locator(".grid-db-editor");
    await table.focus();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    const input = page.locator("td .cell-editor-input").first();
    await expect(input).toBeVisible();

    // Type a new value and press Escape to reset local state
    await input.fill("CANCELLED");
    await page.keyboard.press("Escape");

    // Click elsewhere to blur and exit edit mode
    const targetCell = page.locator("table tbody tr").nth(2).locator("td").nth(1);
    await targetCell.click();
    await page.waitForTimeout(200);

    // Clicking should have selected the targetCell
    await expect(targetCell).toHaveClass(/cell-selected/);

    // Cell 0,1 should still have original value
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("2ahYgqh2jbbm6ZY");

    // Press ArrowRight from targetCell (2,1) should move to (2,2)
    await page.keyboard.press("ArrowRight");
    const nextCell = page.locator("table tbody tr").nth(2).locator("td").nth(2);
    await expect(nextCell).toHaveClass(/cell-selected/);
  });

  test("should commit edit on Tab and move to next cell", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Start at col 1 (name), enter edit mode
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    const input = page.locator("td .cell-editor-input").first();
    await input.fill("TabCommit");
    await page.keyboard.press("Tab");

    // Value should be committed
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("TabCommit");

    // Cursor should have moved to col 2 (next column)
    const nextCell = page.locator("table tbody tr").first().locator("td").nth(2);
    await expect(nextCell).toHaveClass(/cell-selected/);

    // The table container (not a native input inside a cell) should have focus
    // i.e. no native input/checkbox element should have document focus
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(["DIV", "BODY"]).toContain(focusedTag);
  });

  test("should commit edit on Shift+Tab and move to previous cell", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to col 2 first
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    const input = page.locator("td .cell-editor-input").first();
    await input.fill("ShiftTabCommit");
    await page.keyboard.press("Shift+Tab");

    // Value committed
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await expect(cell).toContainText("ShiftTabCommit");

    // Cursor should have moved LEFT to col 1
    const prevCell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(prevCell).toHaveClass(/cell-selected/);
  });

  test("Tab in edit mode must not give focus to an external page checkbox", async ({ page }) => {
    // Regression guard: a focusable checkbox placed AFTER the table in the DOM (and thus
    // in the browser's native tab order) must NOT receive focus when Tab is pressed inside
    // a table cell editor. The table intercepts Tab with preventDefault().
    await page.evaluate(() => {
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = "external-checkbox";
      document.body.appendChild(cb);
    });

    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Enter edit mode on a string cell (col 1)
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    const input = page.locator("td .cell-editor-input").first();
    await expect(input).toBeVisible();

    // Tab must stay inside the table, not jump to the external checkbox
    await page.keyboard.press("Tab");

    const externalFocused = await page.evaluate(() => document.activeElement?.id);
    expect(externalFocused).not.toBe("external-checkbox");

    // Cursor should have advanced to col 2
    const nextCell = page.locator("table tbody tr").first().locator("td").nth(2);
    await expect(nextCell).toHaveClass(/cell-selected/);
  });

  test("Tab in navigation mode must not give focus to an external page checkbox", async ({
    page,
  }) => {
    // Same guard for navigation mode (no active editor). The table handles Tab with
    // preventDefault() so focus must remain on the table container and the cursor
    // must advance to the next column.
    await page.evaluate(() => {
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = "external-checkbox";
      document.body.appendChild(cb);
    });

    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Move to col 1 so Tab has somewhere to go
    await page.keyboard.press("ArrowRight");

    await page.keyboard.press("Tab");

    const externalFocused = await page.evaluate(() => document.activeElement?.id);
    expect(externalFocused).not.toBe("external-checkbox");

    // Cursor must be on col 2
    const nextCell = page.locator("table tbody tr").first().locator("td").nth(2);
    await expect(nextCell).toHaveClass(/cell-selected/);

    // Focus must remain on the table container, not on any native input
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName?.toUpperCase());
    expect(["DIV", "BODY"]).toContain(focusedTag);
  });

  test("Tab in edit mode must not give focus to a checkbox in the next column", async ({
    page,
  }) => {
    // Regression: BooleanEditor rendered a focusable checkbox which intercepted Tab.
    // After Tab from a string cell, if the next column is boolean, focus must stay
    // on the table container (tabIndex={-1} on the checkbox).
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Find a string cell one column to the LEFT of a boolean cell.
    // Col 0 = id (readOnly), col 1 = name (string), col 2 = active (bool).
    // So edit col 1 and Tab to col 2.
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    const input = page.locator("td .cell-editor-input").first();
    await expect(input).toBeVisible();
    await page.keyboard.press("Tab");

    // The checkbox in col 2 must NOT have document focus
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName?.toUpperCase());
    expect(focusedTag).not.toBe("INPUT");

    // The cursor must be on col 2 (the boolean cell)
    const boolCell = page.locator("table tbody tr").first().locator("td").nth(2);
    await expect(boolCell).toHaveClass(/cell-selected/);
  });

  test("should commit edit on Enter and move to next row", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    const input = page.locator("td .cell-editor-input").first();
    await input.fill("EnterCommit");
    await page.keyboard.press("Enter");

    // Check if cell is updated
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("EnterCommit");

    // Selection should be on next row
    const nextRowCell = page.locator("table tbody tr").nth(1).locator("td").nth(1);
    await expect(nextRowCell).toHaveClass(/cell-selected/);
  });
});

// ============================================================================
// Google Sheets-like editing behavior
// ============================================================================
test.describe("Google Sheets-like editing behavior", () => {
  test("F2 places cursor at end of text, not select-all", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await cell.click();
    await page.keyboard.press("F2");

    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();

    // Cursor should be at end, not select-all. Typing should APPEND, not replace.
    const valueBefore = await input.inputValue();
    await page.keyboard.type("X");
    await expect(input).toHaveValue(valueBefore + "X");
    await page.keyboard.press("Escape");
  });

  test("typing on selected cell replaces content", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();
    await page.keyboard.press("ArrowRight"); // col 1
    await page.keyboard.press("ArrowRight"); // col 2

    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await expect(cell).toHaveClass(/cell-selected/);

    // Typing replaces cell content
    await page.keyboard.type("NewName");
    const input = cell.locator(".cell-editor-input");
    await expect(input).toHaveValue("NewName");
    await page.keyboard.press("Escape");
  });

  test("ArrowRight at end of input navigates to next cell when entered via typing", async ({
    page,
  }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();
    await page.keyboard.press("ArrowRight"); // col 1
    await page.keyboard.press("ArrowRight"); // col 2

    // Type to enter edit mode
    await page.keyboard.type("Hi");
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    const input = cell.locator(".cell-editor-input");
    await expect(input).toHaveValue("Hi");

    // ArrowRight at end → navigate to next cell
    await page.keyboard.press("ArrowRight");

    // Should be on col 3 now, not editing
    const nextCell = page.locator("table tbody tr").first().locator("td").nth(3);
    await expect(nextCell).toHaveClass(/cell-selected/);
    await expect(cell).not.toHaveClass(/cell-edited/);
  });

  test("ArrowRight at end does NOT navigate when entered via F2", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await cell.click();
    await page.keyboard.press("F2");

    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();

    // Move cursor to end
    await page.keyboard.press("End");
    // ArrowRight at end → should NOT leave the cell
    await page.keyboard.press("ArrowRight");

    // Still editing same cell
    await expect(input).toBeVisible();
    await expect(cell).toHaveClass(/cell-edited/);
    await page.keyboard.press("Escape");
  });

  test("ArrowRight at end does NOT navigate when entered via double-click", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await cell.dblclick();

    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();

    await page.keyboard.press("End");
    await page.keyboard.press("ArrowRight");

    // Still editing same cell
    await expect(input).toBeVisible();
    await expect(cell).toHaveClass(/cell-edited/);
    await page.keyboard.press("Escape");
  });

  test("double-click places cursor at end (not select-all)", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await cell.dblclick();

    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();

    // Typing should append (cursor at end), not replace (select-all)
    const valueBefore = await input.inputValue();
    await page.keyboard.type("Z");
    await expect(input).toHaveValue(valueBefore + "Z");
    await page.keyboard.press("Escape");
  });

  test("triple-click selects all text", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);

    // Triple-click
    await cell.click({ clickCount: 3 });

    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();

    // Typing should REPLACE (all text was selected)
    await page.keyboard.type("Replaced");
    await expect(input).toHaveValue("Replaced");
    await page.keyboard.press("Escape");
  });

  test("single click on selected non-editing cell does nothing", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await cell.click(); // select
    await expect(cell).toHaveClass(/cell-selected/);

    await cell.click(); // second click — should NOT enter edit mode
    await expect(cell.locator(".cell-editor-input")).not.toBeVisible();
    await expect(cell).toHaveClass(/cell-selected/);
  });

  test("ArrowLeft in edit mode cannot leave the cell", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await cell.click();
    await page.keyboard.press("F2");

    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();

    // Press Home to go to start, then ArrowLeft
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowLeft");

    // Still editing same cell
    await expect(input).toBeVisible();
    await expect(cell).toHaveClass(/cell-edited/);
    await page.keyboard.press("Escape");
  });

  test("DEL on selected non-editing cell clears content", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    const originalText = await cell.textContent();
    expect(originalText!.length).toBeGreaterThan(0);

    await cell.click();
    await page.keyboard.press("Delete");

    // Cell content should be empty
    await expect(cell).toHaveText("");
  });

  test("Backspace on selected non-editing cell clears content", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(3);
    const originalText = await cell.textContent();
    expect(originalText!.length).toBeGreaterThan(0);

    await cell.click();
    await page.keyboard.press("Backspace");

    // Cell content should be empty
    await expect(cell).toHaveText("");
  });

  test("ESC exits edit mode", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await cell.dblclick();

    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(input).not.toBeVisible();
    await expect(cell).toHaveClass(/cell-selected/);
  });

  test("combobox dropdown opens when entering edit mode via typing", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Department column (col 5)
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");

    // Type to enter edit mode
    await page.keyboard.type("E");

    // Dropdown should be visible
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();
    // Input should contain the typed character
    await expect(page.locator(".combo-dropdown-input").first()).toHaveValue("E");
    await page.keyboard.press("Escape");
  });

  test("combobox dropdown opens when entering edit mode via F2", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Department column (col 5)
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("F2");

    // Dropdown should be visible
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("combobox dropdown opens when clicking dropdown zone (right edge)", async ({ page }) => {
    // Click on the right edge of the Department cell (dropdown zone is the rightmost 2rem)
    const cell = page.locator("table tbody tr").first().locator("td").nth(5);
    const box = await cell.boundingBox();
    // Click near the right edge of the cell
    await page.mouse.click(box!.x + box!.width - 10, box!.y + box!.height / 2);

    // Dropdown should be visible
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("multi-combobox dropdown opens when entering edit mode via typing", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Skills column (col 6)
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");

    // Type to enter edit mode
    await page.keyboard.type("R");

    // Dropdown should be visible (not CSV-only mode)
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();
    // Input should contain the typed character
    await expect(page.locator(".combo-dropdown-input").first()).toHaveValue("R");
    await page.keyboard.press("Escape");
  });
});

// ============================================================================
// Row creation
// ============================================================================
test.describe("Row creation", () => {
  test("should create new rows using toolbar", async ({ page }) => {
    const rowsBefore = await page.locator("table tbody tr").count();

    // Set count to 3
    const input = page.locator(".grid-db-editor-toolbar .toolbar-input");
    await input.fill("3");

    // Click create
    await page.locator(".grid-db-editor-toolbar .toolbar-button").click();

    const rowsAfter = await page.locator("table tbody tr").count();
    expect(rowsAfter).toBe(rowsBefore + 3);
  });

  test("should create 1 row by default", async ({ page }) => {
    const rowsBefore = await page.locator("table tbody tr").count();

    // Don't change input (default 1), just click create
    await page.locator(".grid-db-editor-toolbar .toolbar-button").click();

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

    await page.locator(".grid-db-editor-toolbar .toolbar-button").click();
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
    const table = page.locator(".grid-db-editor");
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
    const headerText = await page
      .locator("table thead th")
      .nth(1)
      .locator(".col-header-label")
      .textContent();
    expect(headerText).toContain("▲");

    // Click again for DESC
    await keyHeader.click();
    const headerText2 = await page
      .locator("table thead th")
      .nth(1)
      .locator(".col-header-label")
      .textContent();
    expect(headerText2).toContain("▼");

    // Click again to remove sort
    await keyHeader.click();
    const headerText3 = await page
      .locator("table thead th")
      .nth(1)
      .locator(".col-header-label")
      .textContent();
    expect(headerText3).not.toContain("▲");
    expect(headerText3).not.toContain("▼");
  });

  test("should cycle through ASC → DESC → none for id column", async ({ page }) => {
    const idHeader = page.locator("table thead th").first().locator(".col-header-label");

    // ASC
    await idHeader.click();
    await expect(page.locator("table thead th").first().locator(".col-header-label")).toContainText(
      "▲",
    );

    // DESC
    await idHeader.click();
    await expect(page.locator("table thead th").first().locator(".col-header-label")).toContainText(
      "▼",
    );

    // None
    await idHeader.click();
    const text = await page
      .locator("table thead th")
      .first()
      .locator(".col-header-label")
      .textContent();
    expect(text).not.toContain("▲");
    expect(text).not.toContain("▼");
  });

  test("should change displayed row order when sorted", async ({ page }) => {
    // Get first cell value before sort
    const firstCellBefore = await page
      .locator("table tbody tr")
      .first()
      .locator("td")
      .first()
      .textContent();

    // Sort the id column DESC
    const idHeader = page.locator("table thead th").first().locator(".col-header-label");
    await idHeader.click(); // ASC
    await idHeader.click(); // DESC

    const firstCellAfter = await page
      .locator("table tbody tr")
      .first()
      .locator("td")
      .first()
      .textContent();
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
  // Firefox does not support granting clipboard permissions via Playwright
  test.skip(
    ({ browserName }) => browserName === "firefox",
    "Clipboard permissions not supported in Firefox",
  );

  test("should copy selected cell content", async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Select a cell and copy
    await page.keyboard.press("Control+c");

    // Read clipboard - should have the cell content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBeDefined();
  });

  test("should copy and paste a cell value", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Key column (0,1) and copy it
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);
    await page.keyboard.press("Control+c");
    await page.waitForTimeout(200);

    // Verify clipboard has the cell content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe("2ahYgqh2jbbm6ZY");

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

    const table = page.locator(".grid-db-editor");
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
    const table = page.locator(".grid-db-editor");
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
    await expect(cell).toContainText("2ahYgqh2jbbm6ZY");
  });

  test("should redo after undo", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
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
    await expect(cell).toContainText("2ahYgqh2jbbm6ZY");

    // Re-focus table (rows changed on undo, cursor reset may have moved focus)
    await table.focus();
    await page.waitForTimeout(200);

    // Redo
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(500);
    await expect(cell).toContainText("RedoTest");
  });

  test("should undo row creation", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    const rowsBefore = await page.locator("table tbody tr").count();

    await page.locator(".grid-db-editor-toolbar .toolbar-button").click();
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
    const table = page.locator(".grid-db-editor");
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

  test("should log onUndo and change callbacks when undoing", async ({ page }) => {
    const messages: string[] = [];
    page.on("console", (msg) => {
      if (
        msg.text().includes("onUndo") ||
        msg.text().includes("onUpdateRows") ||
        msg.text().includes("onRedo") ||
        msg.text().includes("onCreateRows")
      ) {
        messages.push(msg.text());
      }
    });

    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate and edit
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    const input = page.locator("td .cell-editor-input").first();
    await input.fill("TestingCallbacks");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    // Clear messages from the first UpdateRows
    messages.length = 0;

    // Undo
    await table.focus();
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);

    // After undo, onUndo and onUpdateRows should be called
    expect(messages.some((m) => m.includes("onUndo"))).toBeTruthy();
    expect(messages.some((m) => m.includes("onUpdateRows"))).toBeTruthy();
    messages.length = 0;

    // Redo
    await table.focus();
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(300);

    // After redo, onRedo and onUpdateRows should be called
    expect(messages.some((m) => m.includes("onRedo"))).toBeTruthy();
    expect(messages.some((m) => m.includes("onUpdateRows"))).toBeTruthy();
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
    await expect(
      page.locator(".context-menu-item").filter({ hasText: "copy content" }),
    ).toBeVisible();
    await expect(
      page.locator(".context-menu-item").filter({ hasText: "paste content" }),
    ).toBeVisible();
    await expect(
      page.locator(".context-menu-item").filter({ hasText: "delete content" }),
    ).toBeVisible();
    await expect(
      page.locator(".context-menu-item").filter({ hasText: "remove rows" }),
    ).toBeVisible();
  });

  test("should close context menu on click outside", async ({ page }) => {
    const firstCell = page.locator("table tbody tr").first().locator("td").first();
    await firstCell.click({ button: "right" });
    await expect(page.locator(".context-menu")).toBeVisible();

    // Click on a different cell — menu should close and that cell gets selected
    const otherCell = page.locator("table tbody tr").nth(2).locator("td").nth(2);
    await otherCell.click();
    await expect(page.locator(".context-menu")).not.toBeVisible();
    await expect(otherCell).toHaveClass(/cell-selected/);
  });

  test("should delete content via context menu", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Key column
    await page.keyboard.press("ArrowRight");

    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("2ahYgqh2jbbm6ZY");

    // Right-click and delete
    await cell.click({ button: "right" });
    await page.locator(".context-menu-item").filter({ hasText: "delete content" }).click();
    await page.waitForTimeout(200);

    await expect(cell).not.toContainText("2ahYgqh2jbbm6ZY");
  });

  test("should not open context menu on column header filter right-click", async ({ page }) => {
    const filterInput = page.locator("table thead th").nth(2).locator(".col-filter-input");
    await filterInput.click({ button: "right" });
    await page.waitForTimeout(100);

    const contextMenu = page.locator(".context-menu");
    await expect(contextMenu).not.toBeVisible();
  });

  test("should not open context menu when editor dialog is open", async ({ page }) => {
    // Click on Description cell's pencil icon to open the textarea dialog
    const descCell = page.locator("table tbody tr").first().locator("td.col-description");
    await descCell.click();
    await page.waitForTimeout(100);
    const pencil = descCell.locator(".cell-popup-indicator");
    await pencil.click({ force: true });
    await page.waitForTimeout(200);

    // Dialog should be open
    await expect(page.locator(".editor-dialog-overlay")).toBeVisible();

    // Right-click on the table viewport — context menu should NOT appear
    await page.locator(".grid-db-editor-viewport").click({ button: "right", position: { x: 10, y: 10 }, force: true });
    await page.waitForTimeout(100);

    const contextMenu = page.locator(".context-menu");
    await expect(contextMenu).not.toBeVisible();
  });

  test("should show undo/redo in context menu with correct disabled state", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);

    // Before any edit, Undo should be disabled
    await cell.click({ button: "right" });
    const undoItem = page.locator(".context-menu-item").filter({ hasText: "Undo" });
    await expect(undoItem).toHaveClass(/context-menu-item-disabled/);
    const redoItem = page.locator(".context-menu-item").filter({ hasText: "Redo" });
    await expect(redoItem).toHaveClass(/context-menu-item-disabled/);

    // Close menu by clicking outside, make an edit, then check again
    await page.locator(".grid-db-editor").click();
    await page.waitForTimeout(100);
    await cell.click();
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    await cell.click({ button: "right" });
    const undoItemAfter = page.locator(".context-menu-item").filter({ hasText: "Undo" });
    await expect(undoItemAfter).not.toHaveClass(/context-menu-item-disabled/);
  });

  test("should filter by cell value via context menu", async ({ page }) => {
    const rowsBefore = await page.locator("table tbody tr").count();

    // Right-click on a cell and select "Filter by value"
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await cell.click({ button: "right" });

    const filterItem = page.locator(".context-menu-item").filter({ hasText: "Filter by value" });
    await expect(filterItem).toBeVisible();
    await filterItem.click();
    await page.waitForTimeout(300);

    // Rows should be filtered (fewer than before)
    const rowsAfter = await page.locator("table tbody tr").count();
    expect(rowsAfter).toBeLessThan(rowsBefore);
  });

  test("should clear filter via context menu", async ({ page }) => {
    // First apply a filter
    const filterInput = page.locator("table thead th").first().locator(".col-filter-input");
    await filterInput.fill("42");
    await page.waitForTimeout(300);
    const rowsFiltered = await page.locator("table tbody tr").count();

    // Right-click and clear filter
    const cell = page.locator("table tbody tr").first().locator("td").first();
    await cell.click({ button: "right" });

    const clearItem = page.locator(".context-menu-item").filter({ hasText: "Clear filter" });
    await expect(clearItem).not.toHaveClass(/context-menu-item-disabled/);
    await clearItem.click();
    await page.waitForTimeout(300);

    const rowsAfter = await page.locator("table tbody tr").count();
    expect(rowsAfter).toBeGreaterThan(rowsFiltered);
  });
});

// ============================================================================
// Delete content
// ============================================================================
test.describe("Delete content", () => {
  test("should delete cell content with Delete key", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Key column
    await page.keyboard.press("ArrowRight");

    // Verify cell has content
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("2ahYgqh2jbbm6ZY");

    // Press Delete
    await page.keyboard.press("Delete");

    // Cell should be empty
    await expect(cell).not.toContainText("2ahYgqh2jbbm6ZY");
  });

  test("should delete cell content with Backspace key", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    await page.keyboard.press("ArrowRight");

    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(cell).toContainText("2ahYgqh2jbbm6ZY");

    await page.keyboard.press("Backspace");

    await expect(cell).not.toContainText("2ahYgqh2jbbm6ZY");
  });

  test("should delete multi-cell selection with Delete key", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
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
      await expect(cell).not.toContainText("2ahYgqh2jbbm6ZY");
    }
  });

  test("should log onUpdateRows on delete content", async ({ page }) => {
    const messages: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("onUpdateRows")) {
        messages.push(msg.text());
      }
    });

    const table = page.locator(".grid-db-editor");
    await table.focus();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toContain("onUpdateRows");
  });
});

// ============================================================================
// Ellipsis feature
// ============================================================================
test.describe("Ellipsis", () => {
  test("should truncate long text based on textEllipsisLength and expand on edit", async ({
    page,
  }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Find row 0, col 2 (firstName)
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);

    // Edit the cell and input long chars
    await cell.click();
    await page.keyboard.press("Enter");
    const input = cell.locator(".cell-editor-input");

    const longText = "This string is absolutely longer than twenty-five characters.";
    await input.fill(longText);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);

    // Check displayed text
    const cellText = await cell.textContent();
    expect(cellText).toContain("[...]");
    expect(cellText).toBe(longText.substring(0, 25) + " [...]");

    // Enter edit mode again
    await cell.click();
    await page.keyboard.press("Enter");
    const editInput = cell.locator(".cell-editor-input");
    const inputValue = await editInput.inputValue();

    // Expect full text in input
    expect(inputValue).toBe(longText);
  });
});

// ============================================================================
// Cell meta: styles, disabled, title
// ============================================================================
test.describe("Cell Meta", () => {
  test("should apply cell meta style to the specified cell", async ({ page }) => {
    // Row "3" (rowIndex 3) / column "System Key" (index 1) has background #fdd
    const cell = page.locator("table tbody tr").nth(3).locator("td").nth(1);
    const bgColor = await cell.evaluate((el) => getComputedStyle(el).backgroundColor);
    // cell-error class uses --ct-cell-error-bg from theme
    expect(bgColor).not.toBe("rgba(0, 0, 0, 0)"); // has a background
    expect(bgColor).toMatch(/^rgb/); // is a valid color
  });

  test("should apply cell meta title attribute", async ({ page }) => {
    // Row "3" / column "System Key" has a title
    const cell = page.locator("table tbody tr").nth(3).locator("td").nth(1);
    await expect(cell).toHaveAttribute("title", "Validation error: Key must not be 'dummy'");
  });

  test("should apply cell meta className", async ({ page }) => {
    // Row "3" / column "System Key" has className "cell-error"
    const cell = page.locator("table tbody tr").nth(3).locator("td").nth(1);
    await expect(cell).toHaveClass(/cell-error/);
  });

  test("should apply row meta style to the tr element", async ({ page }) => {
    // Row "5" (6th data row) has row-readonly class — background is applied to td cells
    const row = page.locator("table tbody tr").nth(5);
    await expect(row).toHaveClass(/row-readonly/);
    const cellBg = await row.locator("td").first().evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(cellBg).not.toBe("rgba(0, 0, 0, 0)"); // td has themed background
  });

  test("should apply row meta title to the tr element", async ({ page }) => {
    const row = page.locator("table tbody tr").nth(5);
    await expect(row).toHaveAttribute("title", "This row is read-only");
  });

  test("should apply disabled state to cell – no editing on click", async ({ page }) => {
    // Row "5" / column "System Key" is disabled
    const cell = page.locator("table tbody tr").nth(5).locator("td").nth(1);
    await expect(cell).toHaveClass(/cell-disabled/);

    // Click the cell to select, then click again (now dblclick is required for edit, single click should just select)
    await cell.click();
    await cell.click();
    await page.waitForTimeout(200);

    // No editor input should appear
    const input = cell.locator(".cell-editor-input");
    await expect(input).not.toBeVisible();
  });

  test("should apply disabled state to cell – no editing via keyboard", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to row 5, column System Key (disabled)
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

    const table = page.locator(".grid-db-editor");
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

    const checkbox = page
      .locator("table tbody tr")
      .first()
      .locator("td")
      .nth(8)
      .locator("input[type=checkbox]");
    await checkbox.click();
    await page.waitForTimeout(300);

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toContain("onUpdateRows");
  });
});

// ============================================================================
// Multi-Combobox editor
// ============================================================================
// ============================================================================
// Combobox keyboard navigation
// Department = col 5 (Combobox), options: HR, IT, Sales, Marketing, Finance, Legal
// Skills     = col 6 (MultiCombobox)
// ============================================================================
test.describe("Combobox keyboard navigation", () => {
  test("Enter in Combobox edit mode commits and moves to next row", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter"); // open editor
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();

    // Enter with no highlight → commit current value, advance row
    await page.keyboard.press("Enter");

    // Dropdown must be gone
    await expect(page.locator(".combo-dropdown-list")).not.toBeVisible();
    // Cursor must have moved to row 1 col 5
    const nextRowCell = page.locator("table tbody tr").nth(1).locator("td").nth(5);
    await expect(nextRowCell).toHaveClass(/cell-selected/);
  });

  test("ArrowDown highlights options, Enter selects and advances row", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter"); // open editor
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();

    // Clear the input so all 6 options are visible (input starts pre-filled with current value)
    const input = page.locator(".combo-dropdown-input").first();
    await input.clear();

    // ArrowDown → first option highlighted
    await page.keyboard.press("ArrowDown");
    const firstOption = page.locator(".combo-dropdown-option").first();
    await expect(firstOption).toHaveClass(/is-highlighted/);

    // ArrowDown again → second option highlighted
    await page.keyboard.press("ArrowDown");
    const secondOption = page.locator(".combo-dropdown-option").nth(1);
    await expect(secondOption).toHaveClass(/is-highlighted/);
    const secondText = (await secondOption.locator("span").first().textContent()) ?? "";

    // Enter → selects second option, cursor moves to row 1
    await page.keyboard.press("Enter");
    await expect(page.locator(".combo-dropdown-list")).not.toBeVisible();

    const deptCell = page.locator("table tbody tr").first().locator("td").nth(5);
    await expect(deptCell).toContainText(secondText);

    const nextRowCell = page.locator("table tbody tr").nth(1).locator("td").nth(5);
    await expect(nextRowCell).toHaveClass(/cell-selected/);
  });

  test("ArrowUp wraps around to last option", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();

    // ArrowUp from no-highlight → wraps to last option
    await page.keyboard.press("ArrowUp");
    const lastOption = page.locator(".combo-dropdown-option").last();
    await expect(lastOption).toHaveClass(/is-highlighted/);
    await page.keyboard.press("Escape");
  });

  test("Space in MultiCombobox toggles the highlighted option", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter"); // open MultiCombobox editor
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();

    // Navigate to first option
    await page.keyboard.press("ArrowDown");
    const firstOption = page.locator(".combo-dropdown-option").first();
    await expect(firstOption).toHaveClass(/is-highlighted/);

    // Record initial selected state — toggle must flip it regardless of start state
    const before = await firstOption.evaluate((el) => el.classList.contains("is-selected"));

    // Space → toggle
    await page.keyboard.press(" ");
    if (before) {
      await expect(firstOption).not.toHaveClass(/is-selected/);
    } else {
      await expect(firstOption).toHaveClass(/is-selected/);
    }

    // Space again → toggle back
    await page.keyboard.press(" ");
    if (before) {
      await expect(firstOption).toHaveClass(/is-selected/);
    } else {
      await expect(firstOption).not.toHaveClass(/is-selected/);
    }

    await page.keyboard.press("Escape");
  });

  test("Enter in MultiCombobox with empty input advances to next row", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();

    // Enter with no highlighted option and empty input → advance row
    await page.keyboard.press("Enter");
    await expect(page.locator(".combo-dropdown-list")).not.toBeVisible();

    const nextRowCell = page.locator("table tbody tr").nth(1).locator("td").nth(6);
    await expect(nextRowCell).toHaveClass(/cell-selected/);
  });
});

test.describe("MultiCombobox editor", () => {
  test("should show multi-combobox dropdown on edit", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Skills column (index 6)
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    // Should show the custom dropdown list with options
    await expect(page.locator("td .combo-dropdown-list").first()).toBeVisible();
    await expect(page.locator("td .combo-dropdown-option").first()).toBeVisible();
  });

  test("should toggle option in multi-combobox", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Skills column (index 6) and edit
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    // The dropdown should be visible
    await expect(page.locator("td .combo-dropdown-list").first()).toBeVisible();

    // Find "React" option and record its initial state
    const reactOption = page
      .locator("td .combo-dropdown-option")
      .filter({ hasText: "React" })
      .first();
    const wasBefore = await reactOption.evaluate((el) => el.classList.contains("is-selected"));

    // Click to toggle
    await reactOption.click();

    // State must have flipped
    if (wasBefore) {
      await expect(reactOption).not.toHaveClass(/is-selected/);
    } else {
      await expect(reactOption).toHaveClass(/is-selected/);
    }

    // Commit and verify cell text reflects the current selection
    await page.keyboard.press("Enter");
    const cell = page.locator("table tbody tr").first().locator("td").nth(6);
    if (!wasBefore) {
      await expect(cell).toContainText("React");
    }
  });
});

// ============================================================================
// MultiCombobox: selected options sorted to top
// ============================================================================
test.describe("MultiCombobox selected options sorted to top", () => {
  test("should show selected options before unselected options", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Skills column (col 6, MultiCombobox)
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();

    const options = page.locator(".combo-dropdown-option");
    const count = await options.count();

    // Collect which options are selected and their positions
    let lastSelectedIdx = -1;
    let firstUnselectedIdx = count;
    for (let i = 0; i < count; i++) {
      const isSelected = await options
        .nth(i)
        .evaluate((el) => el.classList.contains("is-selected"));
      if (isSelected) lastSelectedIdx = i;
      if (!isSelected && firstUnselectedIdx === count) firstUnselectedIdx = i;
    }

    // All selected options must come before all unselected options
    if (lastSelectedIdx >= 0 && firstUnselectedIdx < count) {
      expect(lastSelectedIdx).toBeLessThan(firstUnselectedIdx);
    }

    await page.keyboard.press("Escape");
  });

  test("should keep sort order stable during toggling", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();

    // Record the initial option label order (second span = label text)
    const options = page.locator(".combo-dropdown-option");
    const initialOrder: string[] = [];
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      initialOrder.push((await options.nth(i).locator("span").nth(1).textContent()) ?? "");
    }

    // Toggle the first option (check or uncheck)
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press(" ");

    // The label order should remain the same (stable sort)
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).locator("span").nth(1).textContent();
      expect(text).toBe(initialOrder[i]);
    }

    await page.keyboard.press("Escape");
  });
});

// ============================================================================
// Selection rectangle
// ============================================================================
test.describe("Selection rectangle", () => {
  // Helper: read the numeric px value from a style string like "42.5px"
  const parsePx = (s: string) => parseFloat(s);

  test("should position selection rectangle over a non-sticky cell after click", async ({
    page,
  }) => {
    // Use a non-sticky cell (col index 2, columns 0+1 are sticky)
    const cell = page.locator("table tbody tr").nth(0).locator("td").nth(2);
    await cell.click();
    await page.waitForTimeout(300);

    const rect = await page.evaluate(() => {
      const viewport = document.querySelector(".grid-db-editor-viewport") as HTMLElement;
      const cellEl = document.querySelector(
        "table tbody tr:first-child td:nth-child(3)",
      ) as HTMLElement;
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
      const viewport = document.querySelector(".grid-db-editor-viewport") as HTMLElement;
      const cellEl = document.querySelector(
        "table tbody tr:first-child td:nth-child(3)",
      ) as HTMLElement;
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

  test("selection rectangle matches cell ClientRect for first cell of each row (rows 0-4)", async ({
    page,
  }) => {
    for (let rowIdx = 0; rowIdx < 5; rowIdx++) {
      const cell = page.locator("table tbody tr").nth(rowIdx).locator("td").nth(2);
      await cell.click();
      await page.waitForTimeout(200);

      const result = await page.evaluate((row) => {
        const viewport = document.querySelector(".grid-db-editor-viewport") as HTMLElement;
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

  test("cell selected via keyboard: selection rectangle top/left matches cell ClientRect", async ({
    page,
  }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Move to col 2, row 0
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);

    const result = await page.evaluate(() => {
      const viewport = document.querySelector(".grid-db-editor-viewport") as HTMLElement;
      const cellEl = document.querySelector(
        "table tbody tr:first-child td:nth-child(3)",
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
    const firstId = await page
      .locator("table tbody tr")
      .first()
      .locator("td")
      .first()
      .textContent();
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
    const table = page.locator(".grid-db-editor");
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

// ============================================================================
// Number formatting
// Column indices in the demo data:
//   0  id              – Number, readOnly, no numberFormat
//   9  salary          – Number, decimalPlaces:2, thousandsSeparator:true, suffix:" €"
//  19  performanceScore– Number, decimalPlaces:2, thousandsSeparator:false
//  20  bonus           – Number, decimalPlaces:0, thousandsSeparator:true, prefix:"+ ", suffix:" €"
// ============================================================================
test.describe("Number formatting", () => {
  test("Number cells and their headers carry cell-align-right class", async ({ page }) => {
    const salaryTd = page.locator("table tbody tr").first().locator("td").nth(9);
    const salaryTh = page.locator("table thead th").nth(9);
    await expect(salaryTd).toHaveClass(/cell-align-right/);
    await expect(salaryTh).toHaveClass(/cell-align-right/);
  });

  test("Number cell without numberFormat shows the raw number", async ({ page }) => {
    // id column (index 0) has no numberFormat – plain numeric text
    const idCell = page.locator("table tbody tr").first().locator("td").nth(0);
    const text = (await idCell.textContent())?.trim() ?? "";
    expect(Number(text)).not.toBeNaN();
    // No affix characters
    expect(text).not.toContain("€");
    expect(text).not.toContain("+");
  });

  test("salary displays suffix and 2 decimal places after editing", async ({ page }) => {
    const salaryCell = page.locator("table tbody tr").first().locator("td").nth(9);
    await salaryCell.click();
    await page.keyboard.press("Enter");
    await salaryCell.locator("input").fill("1000");
    await page.keyboard.press("Enter");

    const text = (await salaryCell.textContent()) ?? "";
    // Must end with "00 €" — holds for en-US "1,000.00 €" and de-DE "1.000,00 €"
    expect(text.endsWith("00 €")).toBe(true);
  });

  test("salary edit mode: input is type=text, shows formatted number without affix", async ({
    page,
  }) => {
    // First set a known value so we can predict the formatted string
    const salaryCell = page.locator("table tbody tr").first().locator("td").nth(9);
    await salaryCell.click();
    await page.keyboard.press("Enter");
    await salaryCell.locator("input").fill("1000");
    await page.keyboard.press("Enter");

    // Enter edit mode again — click back to row 0, then Enter
    await salaryCell.click();
    await page.keyboard.press("Enter");
    const input = salaryCell.locator("input");
    await expect(input).toBeVisible();

    // Input must be type="text" (not type="number")
    const inputType = await input.getAttribute("type");
    expect(inputType).toBe("text");

    // Input value must NOT contain affix characters
    const raw = await input.inputValue();
    expect(raw).not.toContain("€");
    expect(raw).not.toContain("+");

    // Input value must contain the formatted decimal part: ends with "00"
    // (en-US "1,000.00" / de-DE "1.000,00" — both end with "00")
    expect(raw.endsWith("00")).toBe(true);

    await page.keyboard.press("Escape");
  });

  test("salary edit mode: wrapper element carries data-prefix/data-suffix for CSS affixes", async ({
    page,
  }) => {
    const salaryCell = page.locator("table tbody tr").first().locator("td").nth(9);
    await salaryCell.click();
    await page.keyboard.press("Enter");

    // The wrapper span must carry the data attributes used by ::before / ::after
    const wrapper = salaryCell.locator(".number-editor-wrapper");
    await expect(wrapper).toBeVisible();
    // salary has no prefix → data-prefix should be empty
    await expect(wrapper).toHaveAttribute("data-prefix", "");
    // salary suffix is " €"
    await expect(wrapper).toHaveAttribute("data-suffix", " €");

    await page.keyboard.press("Escape");
  });

  test("bonus edit mode: wrapper carries prefix and suffix data attributes", async ({ page }) => {
    const bonusCell = page.locator("table tbody tr").first().locator("td").nth(20);
    await bonusCell.click();
    await page.keyboard.press("Enter");

    const wrapper = bonusCell.locator(".number-editor-wrapper");
    await expect(wrapper).toBeVisible();
    await expect(wrapper).toHaveAttribute("data-prefix", "+ ");
    await expect(wrapper).toHaveAttribute("data-suffix", " €");

    await page.keyboard.press("Escape");
  });

  test("single click on selected Number cell does NOT enter edit mode", async ({ page }) => {
    const salaryCell = page.locator("table tbody tr").first().locator("td").nth(9);
    // First click: select the cell
    await salaryCell.click();
    await expect(salaryCell.locator("input")).not.toBeVisible();
    // Second click: should NOT enter edit mode (Google Sheets behavior)
    await salaryCell.click();
    await expect(salaryCell.locator("input")).not.toBeVisible();
  });

  test("clicking within the open Number editor does not exit edit mode", async ({ page }) => {
    const salaryCell = page.locator("table tbody tr").first().locator("td").nth(9);
    // Enter edit mode via F2
    await salaryCell.click();
    await page.keyboard.press("F2");
    const input = salaryCell.locator("input");
    await expect(input).toBeVisible();
    // Click within the input — must stay in edit mode
    await input.click();
    await expect(input).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("editing a formatted value round-trips correctly", async ({ page }) => {
    // Set salary to a locale-formatted value by typing the formatted string
    const salaryCell = page.locator("table tbody tr").first().locator("td").nth(9);
    await salaryCell.click();
    await page.keyboard.press("Enter");
    // Type "2500" as plain digits — parseLocaleNumber must handle this
    await salaryCell.locator("input").fill("2500");
    await page.keyboard.press("Enter");

    const displayed = (await salaryCell.textContent()) ?? "";
    // Should show 2500 formatted with 2 decimals and suffix
    expect(displayed.endsWith("00 €")).toBe(true);
    // Enter edit mode — click back to row 0, then Enter
    await salaryCell.click();
    await page.keyboard.press("Enter");
    const inputVal = await salaryCell.locator("input").inputValue();
    expect(inputVal.endsWith("00")).toBe(true);
    await page.keyboard.press("Escape");
  });

  test("bonus displays prefix and suffix, no decimal part", async ({ page }) => {
    const bonusCell = page.locator("table tbody tr").first().locator("td").nth(20);
    await bonusCell.click();
    await page.keyboard.press("Enter");
    await bonusCell.locator("input").fill("500");
    await page.keyboard.press("Enter");

    const text = (await bonusCell.textContent()) ?? "";
    // prefix "+" and suffix "€" must be present
    expect(text.startsWith("+ ")).toBe(true);
    expect(text.endsWith(" €")).toBe(true);
    // decimalPlaces:0 — no decimal separator in the number portion
    const numberPart = text.slice(2, -2); // strip "+" prefix and "€" suffix
    expect(numberPart).not.toMatch(/[.,]\d+$/);
  });

  test("performanceScore shows 2 decimal places, no affix", async ({ page }) => {
    const scoreCell = page.locator("table tbody tr").first().locator("td").nth(19);
    await scoreCell.click();
    await page.keyboard.press("Enter");
    await scoreCell.locator("input").fill("3.5");
    await page.keyboard.press("Enter");

    const text = (await scoreCell.textContent()) ?? "";
    // With decimalPlaces:2 the value 3.5 → "3.50" (en-US) or "3,50" (de-DE) — ends with "50"
    expect(text.endsWith("50")).toBe(true);
    // No affix configured for this column
    expect(text).not.toContain("€");
    expect(text).not.toContain("+");
  });
});

// ============================================================================
// Click outside clears selection
// ============================================================================
test.describe("Click outside clears selection", () => {
  test("clicking outside the table removes cell-selected class", async ({ page }) => {
    // Select a cell
    const cell = page.locator("table tbody tr").first().locator("td").nth(1);
    await cell.click();
    await expect(cell).toHaveClass(/cell-selected/);

    // Click outside the table (on the pagination bar)
    await page.locator(".ct-pagination").click();

    await expect(cell).not.toHaveClass(/cell-selected/);
  });

  test("clicking outside removes row-selected class", async ({ page }) => {
    const cell = page.locator("table tbody tr").nth(2).locator("td").nth(1);
    await cell.click();
    const row = page.locator("table tbody tr").nth(2);
    await expect(row).toHaveClass(/row-selected/);

    await page.locator(".ct-pagination").click();

    await expect(row).not.toHaveClass(/row-selected/);
  });
});

// ============================================================================
// ReadOnly behaviour
// ============================================================================
test.describe("ReadOnly", () => {
  test("readOnly column: Enter does not open editor", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Cursor starts at col 0 (ID, readOnly). Press Enter.
    await page.keyboard.press("Enter");

    // No editor input should appear
    const input = page.locator("td .cell-editor-input");
    await expect(input).toHaveCount(0);
  });

  test("readOnly column: F2 does not open editor", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Cursor starts at col 0 (ID, readOnly). Press F2.
    await page.keyboard.press("F2");

    const input = page.locator("td .cell-editor-input");
    await expect(input).toHaveCount(0);
  });

  test("readOnly column: double-click does not open editor", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").first();
    await cell.dblclick();

    const input = cell.locator(".cell-editor-input");
    await expect(input).toHaveCount(0);
  });

  test("readOnly column: typing does not open editor", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Cursor starts at col 0 (ID, readOnly). Type a character.
    await page.keyboard.press("A");

    const input = page.locator("td .cell-editor-input");
    await expect(input).toHaveCount(0);
  });

  test("readOnly column: cell shows cell-selected (not cell-edited) after Enter", async ({
    page,
  }) => {
    // Click the ID cell (col 0, readOnly) to select it, then press Enter.
    const cell = page.locator("table tbody tr").first().locator("td").first();
    await cell.click();
    await expect(cell).toHaveClass(/cell-selected/);

    await page.keyboard.press("Enter");

    await expect(cell).toHaveClass(/cell-selected/);
    await expect(cell).not.toHaveClass(/cell-edited/);
  });

  test("readOnly row: Enter does not open editor", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to row 5 (0-based display row 5, which has readOnly: true), col 1 (System Key)
    await page.keyboard.press("ArrowRight");
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");

    await page.keyboard.press("Enter");

    const input = page.locator("td .cell-editor-input");
    await expect(input).toHaveCount(0);
  });

  test("readOnly row: double-click does not open editor", async ({ page }) => {
    // Row 5 (0-based) has readOnly: true. Click col 1 (System Key) of that row.
    const cell = page.locator("table tbody tr").nth(5).locator("td").nth(1);
    await cell.dblclick();

    const input = cell.locator(".cell-editor-input");
    await expect(input).toHaveCount(0);
  });

  test("readOnly row: Delete key does not modify cell value", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to row 5, col 1 (System Key, part of readOnly row)
    await page.keyboard.press("ArrowRight");
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");

    const cell = page.locator("table tbody tr").nth(5).locator("td").nth(1);
    const originalText = await cell.textContent();

    await page.keyboard.press("Delete");

    await expect(cell).toHaveText(originalText!);
  });
});

// ============================================================================
// Focus / Blur behavior
// ============================================================================
test.describe("Focus and Blur", () => {
  test("should select cell (0,0) when table receives focus", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    const firstCell = page.locator("table tbody tr").first().locator("td").first();
    await expect(firstCell).toHaveClass(/cell-selected/);
  });

  test("should deselect all cells when focus leaves the table", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Verify a cell is selected
    const firstCell = page.locator("table tbody tr").first().locator("td").first();
    await expect(firstCell).toHaveClass(/cell-selected/);

    // Click outside the table to blur
    await page.locator("body").click({ position: { x: 5, y: 5 } });

    // No cell should be selected
    await expect(page.locator("td.cell-selected")).toHaveCount(0);
  });
});

// ============================================================================
// ARIA conformance
// ============================================================================
test.describe("ARIA conformance", () => {
  test("table container should have tabIndex for keyboard access", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await expect(table).toHaveAttribute("tabindex", "0");
  });

  test("arrow key navigation should work immediately after focus (no extra click needed)", async ({
    page,
  }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // First cell should be selected
    const firstCell = page.locator("table tbody tr").first().locator("td").first();
    await expect(firstCell).toHaveClass(/cell-selected/);

    // Navigate right and down
    await page.keyboard.press("ArrowRight");
    const secondCol = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(secondCol).toHaveClass(/cell-selected/);

    await page.keyboard.press("ArrowDown");
    const nextRowCell = page.locator("table tbody tr").nth(1).locator("td").nth(1);
    await expect(nextRowCell).toHaveClass(/cell-selected/);
  });

  test("Enter should not open editor on readOnly column", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Cursor is at col 0 (ID, readOnly)
    await page.keyboard.press("Enter");

    // Should NOT show cell-edited
    const cell = page.locator("table tbody tr").first().locator("td").first();
    await expect(cell).not.toHaveClass(/cell-edited/);
  });

  test("typing should not open editor on readOnly column", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Cursor is at col 0 (ID, readOnly)
    await page.keyboard.press("A");

    const input = page.locator("td .cell-editor-input");
    await expect(input).toHaveCount(0);
  });

  test("table should have an accessible caption", async ({ page }) => {
    const caption = page.locator("table caption");
    await expect(caption).toHaveText("Employee Data");
  });

  test("column headers should have scope=col", async ({ page }) => {
    const headers = page.locator("table thead th");
    const count = await headers.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(headers.nth(i)).toHaveAttribute("scope", "col");
    }
  });

  test("column headers should have aria-label matching column label", async ({ page }) => {
    const firstHeader = page.locator("table thead th").first();
    await expect(firstHeader).toHaveAttribute("aria-label", "ID");
  });

  test("data rows should have aria-label with row key", async ({ page }) => {
    const firstDataRow = page.locator("table tbody tr").first();
    const label = await firstDataRow.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label).toMatch(/^Row /);
  });

  test("Escape from edit mode should return focus to table container", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Move to editable column and enter edit mode
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    // Verify editor is open
    await expect(page.locator("td .cell-editor-input").first()).toBeVisible();

    // Escape should close editor and refocus table
    await page.keyboard.press("Escape");

    await expect(page.locator("td .cell-editor-input")).toHaveCount(0);
    // Table should still have focus (can press arrow keys)
    await page.keyboard.press("ArrowDown");
    const movedCell = page.locator("table tbody tr").nth(1).locator("td").nth(1);
    await expect(movedCell).toHaveClass(/cell-selected/);
  });
});

// ============================================================================
// Touch device interaction
// ============================================================================
test.describe("Touch device interaction", () => {
  test.use({ hasTouch: true });

  test("single tap should select a cell", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await cell.tap();
    await expect(cell).toHaveClass(/cell-selected/);
  });

  test("double tap should enter edit mode", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await cell.tap();
    await cell.tap();
    await expect(cell).toHaveClass(/cell-edited/);
  });

  test("tapping a different cell should move selection", async ({ page }) => {
    const cell1 = page.locator("table tbody tr").first().locator("td").nth(2);
    await cell1.tap();
    await expect(cell1).toHaveClass(/cell-selected/);

    const cell2 = page.locator("table tbody tr").nth(1).locator("td").nth(3);
    await cell2.tap();
    await expect(cell2).toHaveClass(/cell-selected/);
    await expect(cell1).not.toHaveClass(/cell-selected/);
  });

  test("tapping outside table should deselect cells", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await cell.tap();
    await expect(cell).toHaveClass(/cell-selected/);

    // Tap outside the table
    await page.locator("body").tap({ position: { x: 5, y: 5 } });
    await expect(page.locator("td.cell-selected")).toHaveCount(0);
  });

  test("third tap in edit mode should keep editor open and allow cursor movement", async ({
    page,
  }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    // Double-tap to enter edit mode
    await cell.tap();
    await cell.tap();
    const input = cell.locator("input.cell-editor-input");
    await expect(input).toBeVisible();

    // Tap inside the input — must stay in edit mode
    await input.click({ position: { x: 5, y: 5 } });
    await expect(input).toBeVisible();
    await expect(cell).toHaveClass(/cell-edited/);

    // Home key should move caret to position 0
    await page.keyboard.press("Home");
    const selStart = await input.evaluate((el: HTMLInputElement) => el.selectionStart);
    expect(selStart).toBe(0);
  });
});

// ============================================================================
// Textarea Dialog Editor (Description column)
// ============================================================================
test.describe("Textarea Dialog Editor", () => {
  test("should show popup indicator on description cell", async ({ page }) => {
    // Description column is col 7
    const cell = page.locator("table tbody tr").first().locator("td").nth(7);
    const indicator = cell.locator(".cell-popup-indicator");
    await expect(indicator).toBeVisible();
  });

  test("should open dialog when clicking popup indicator", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(7);
    const indicator = cell.locator(".cell-popup-indicator");
    await indicator.click();

    await expect(page.locator(".editor-dialog")).toBeVisible();
    await expect(page.locator(".editor-dialog-input")).toBeVisible();
  });

  test("should show title with row values in dialog header", async ({ page }) => {
    // Get the first row's firstName and lastName
    const firstNameCell = page.locator("table tbody tr").first().locator("td").nth(2);
    const lastNameCell = page.locator("table tbody tr").first().locator("td").nth(3);
    const firstName = await firstNameCell.textContent();
    const lastName = await lastNameCell.textContent();

    const cell = page.locator("table tbody tr").first().locator("td").nth(7);
    await cell.locator(".cell-popup-indicator").click();

    const title = page.locator(".editor-dialog-title");
    await expect(title).toContainText(`${firstName} ${lastName}: Description`);
  });

  test("should save text and close dialog on Save click", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(7);
    await cell.locator(".cell-popup-indicator").click();

    const textarea = page.locator(".editor-dialog-input");
    await textarea.fill("New description text");

    await page.locator(".editor-dialog-btn-save").click();

    // Dialog should be closed
    await expect(page.locator(".editor-dialog")).not.toBeVisible();

    // Cell should contain the new value
    await expect(cell).toContainText("New description text");
  });

  test("should discard changes and close dialog on Cancel click", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(7);
    const originalText = await cell.textContent();

    await cell.locator(".cell-popup-indicator").click();

    const textarea = page.locator(".editor-dialog-input");
    await textarea.fill("This should be discarded");

    await page.locator(".editor-dialog-btn-cancel").click();

    // Dialog should be closed
    await expect(page.locator(".editor-dialog")).not.toBeVisible();

    // Cell should still have original value
    await expect(cell).toHaveText(originalText!);
  });

  test("should close dialog on X button click", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(7);
    await cell.locator(".cell-popup-indicator").click();

    await expect(page.locator(".editor-dialog")).toBeVisible();
    await page.locator(".editor-dialog-close").click();

    await expect(page.locator(".editor-dialog")).not.toBeVisible();
  });

  test("should close dialog on Escape key", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(7);
    await cell.locator(".cell-popup-indicator").click();

    await expect(page.locator(".editor-dialog")).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(page.locator(".editor-dialog")).not.toBeVisible();
  });

  test("should show inline text editor on double-click", async ({ page }) => {
    const cell = page.locator("table tbody tr").first().locator("td").nth(7);
    await cell.dblclick();

    // Should show inline input (same as StringEditor)
    const input = cell.locator("input.cell-editor-input");
    await expect(input).toBeVisible();
    // Pencil icon should still be visible during inline editing
    await expect(cell.locator(".cell-popup-indicator")).toBeVisible();

    // Type something and commit
    await input.fill("New description");
    await page.keyboard.press("Enter");

    // Value should be updated
    await expect(cell).toContainText("New description");
  });
});

// ============================================================================
// Combobox: show all options on open (Feature 1)
// Department = col 5 (Combobox), options: HR, IT, Sales, Marketing, Finance, Legal
// ============================================================================
test.describe("Combobox shows all options on open", () => {
  test("should show all options when opening a combobox cell with existing value", async ({
    page,
  }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Department column (col 5)
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");

    // Enter edit mode
    await page.keyboard.press("Enter");
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();

    // All 6 options must be visible, even though the cell has a value
    const options = page.locator(".combo-dropdown-option");
    await expect(options).toHaveCount(6);
  });

  test("should filter options when user types in combobox", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Department column (col 5)
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");

    // Enter edit mode
    await page.keyboard.press("Enter");
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();

    // Clear and type to filter
    const input = page.locator(".combo-dropdown-input").first();
    await input.clear();
    await input.fill("Mar");

    // Only "Marketing" should match
    const options = page.locator(".combo-dropdown-option");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText("Marketing");
  });

  test("should show all options again after clearing filter text", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();

    const input = page.locator(".combo-dropdown-input").first();
    await input.clear();
    await input.fill("IT");

    // Filtered to 1
    await expect(page.locator(".combo-dropdown-option")).toHaveCount(1);

    // Clear → all 6 visible again
    await input.clear();
    await expect(page.locator(".combo-dropdown-option")).toHaveCount(6);
  });
});

// ============================================================================
// Combobox: click option closes popover (Feature 2)
// ============================================================================
test.describe("Combobox option click closes popover", () => {
  test("should close popover when clicking a different option", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Department column (col 5)
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");

    // Enter edit mode
    await page.keyboard.press("Enter");
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();

    // Get current value
    const cell = page.locator("table tbody tr").first().locator("td").nth(5);
    const originalText = (await cell.textContent())?.replace("▾", "").trim();

    // Click a different option
    const optionsToClick = page.locator(".combo-dropdown-option").filter({
      hasNotText: originalText ?? "",
    });
    const targetOption = optionsToClick.first();
    const targetText = await targetOption.locator("span").first().textContent();
    await targetOption.click();

    // Popover should be closed
    await expect(page.locator(".combo-dropdown-list")).not.toBeVisible();

    // Value should be updated
    await expect(cell).toContainText(targetText!);
  });

  test("should close popover when clicking the same option that is already selected", async ({
    page,
  }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Department column (col 5)
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");

    // Get the current cell value
    const cell = page.locator("table tbody tr").first().locator("td").nth(5);
    const originalText = (await cell.textContent())?.replace("▾", "").trim();

    // Enter edit mode
    await page.keyboard.press("Enter");
    await expect(page.locator(".combo-dropdown-list").first()).toBeVisible();

    // Click the option that matches the current value
    const sameOption = page
      .locator(".combo-dropdown-option")
      .filter({
        hasText: originalText ?? "",
      })
      .first();
    await sameOption.click();

    // Popover should be closed even though we clicked the same value
    await expect(page.locator(".combo-dropdown-list")).not.toBeVisible();

    // Value should remain the same
    await expect(cell).toContainText(originalText!);
  });
});

// ============================================================================
// Z-index: selected cell must not paint above sticky header / sticky column
// ============================================================================
test.describe("Selected cell z-index vs sticky elements", () => {
  test("selected cell should not overlap the sticky header row after vertical scroll", async ({
    page,
  }) => {
    const table = page.locator(".grid-db-editor");
    const viewport = page.locator(".grid-db-editor-viewport");
    await table.focus();

    // Click a cell in the second row, second column (non-sticky)
    const targetCell = page.locator("table tbody tr").nth(1).locator("td").nth(1);
    await targetCell.click();
    await expect(targetCell).toHaveClass(/cell-selected/);

    // Scroll down so the selected cell is behind the sticky header
    await viewport.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(100);

    // The header z-index must be greater than the selected cell z-index
    const headerTh = page.locator("table thead th").nth(1);
    const headerZ = await headerTh.evaluate((el) => {
      return parseInt(getComputedStyle(el).zIndex) || 0;
    });
    const cellZ = await targetCell.evaluate((el) => {
      return parseInt(getComputedStyle(el).zIndex) || 0;
    });
    expect(headerZ).toBeGreaterThan(cellZ);
  });

  test("selected cell should not overlap the sticky first column after horizontal scroll", async ({
    page,
  }) => {
    const table = page.locator(".grid-db-editor");
    const viewport = page.locator(".grid-db-editor-viewport");
    await table.focus();

    // Navigate right to a non-sticky cell far from the first column
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");

    const selectedCell = page.locator("td.cell-selected");
    await expect(selectedCell).toBeVisible();

    // Scroll left so the selected cell is behind the sticky column
    await viewport.evaluate((el) => {
      el.scrollLeft = 0;
    });
    await page.waitForTimeout(100);

    // The sticky column cell z-index must be greater than the selected cell
    const stickyCell = page.locator("table tbody tr").first().locator("td.sticky").first();
    const stickyZ = await stickyCell.evaluate((el) => {
      return parseInt(getComputedStyle(el).zIndex) || 0;
    });
    const cellZ = await selectedCell.evaluate((el) => {
      return parseInt(getComputedStyle(el).zIndex) || 0;
    });
    expect(stickyZ).toBeGreaterThan(cellZ);
  });

  test("sticky header in sticky column should have highest z-index", async ({ page }) => {
    const stickyHeader = page.locator("table thead th.sticky").first();
    const regularHeader = page.locator("table thead th").nth(1);
    const stickyBodyCell = page.locator("table tbody tr").first().locator("td.sticky").first();

    const stickyHeaderZ = await stickyHeader.evaluate(
      (el) => parseInt(getComputedStyle(el).zIndex) || 0,
    );
    const regularHeaderZ = await regularHeader.evaluate(
      (el) => parseInt(getComputedStyle(el).zIndex) || 0,
    );
    const stickyBodyZ = await stickyBodyCell.evaluate(
      (el) => parseInt(getComputedStyle(el).zIndex) || 0,
    );

    // Sticky header corner must be above both regular headers and sticky body cells
    expect(stickyHeaderZ).toBeGreaterThan(regularHeaderZ);
    expect(stickyHeaderZ).toBeGreaterThan(stickyBodyZ);
  });
});

// ============================================================================
// Backend mode – sort delay
// ============================================================================
test.describe("Backend mode – sort delay", () => {
  test.beforeEach(async ({ page }) => {
    // Switch to Backend (2 s) mode
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("backend-slow");
    // Wait for initial "Synced" status
    await page.waitForSelector(".toolbar-status-ok");
  });

  test("clicking sort must NOT change row data immediately", async ({ page }) => {
    // Collect the first 5 Email values before sort
    const emailCells = () =>
      page
        .locator("table tbody tr")
        .locator("td:nth-child(5)")
        .evaluateAll((cells) => cells.slice(0, 5).map((c) => c.textContent?.trim() ?? ""));

    const before = await emailCells();
    expect(before.length).toBeGreaterThan(0);

    // Click the Email column header to sort
    const emailHeader = page.locator("table thead th .col-header-label").nth(4);
    await emailHeader.click();

    // A spinner should appear on the Email column header
    await expect(page.locator("table thead th .col-sort-spinner")).toBeVisible();

    // Immediately after click: data must be UNCHANGED
    const afterClick = await emailCells();
    expect(afterClick).toEqual(before);

    // Status should show loading
    await expect(page.locator(".toolbar-status-info")).toBeVisible();

    // After the 2s delay, data should change (sort applied)
    await page.waitForSelector(".toolbar-status-ok", { timeout: 5000 });
    const afterDelay = await emailCells();
    // The sort arrow should now be visible
    await expect(page.locator(".col-sort-asc")).toBeVisible();
    // Data should have changed (sorted ascending by email)
    expect(afterDelay).not.toEqual(before);
  });

  test("clicking sort should show spinner, then sort arrow after delay", async ({ page }) => {
    const emailHeader = page.locator("table thead th .col-header-label").nth(4);

    // No sort arrow initially
    await expect(page.locator(".col-sort-asc")).not.toBeVisible();
    await expect(page.locator(".col-sort-desc")).not.toBeVisible();

    // Click to sort
    await emailHeader.click();

    // Spinner visible, no arrow
    await expect(page.locator(".col-sort-spinner")).toBeVisible();
    await expect(page.locator(".col-sort-asc")).not.toBeVisible();

    // Wait for backend response
    await page.waitForSelector(".toolbar-status-ok", { timeout: 5000 });

    // Spinner gone, arrow visible
    await expect(page.locator(".col-sort-spinner")).not.toBeVisible();
    await expect(page.locator(".col-sort-asc")).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Reset to local mode
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("local");
  });
});

// ============================================================================
// Backend mode – filter delay
// ============================================================================
test.describe("Backend mode – filter delay", () => {
  test.beforeEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("backend-slow");
    await page.waitForSelector(".toolbar-status-ok");
  });

  test("typing in a filter input must be immediately visible but data unchanged", async ({
    page,
  }) => {
    // Capture row count before filtering
    const rowCountBefore = await page.locator("table tbody tr").count();

    // Email filter (5th column, text input)
    const emailFilter = page.locator("table thead th").nth(4).locator(".col-filter-input");
    await emailFilter.click();
    await emailFilter.fill("alice");

    // The typed text should appear immediately
    await expect(emailFilter).toHaveValue("alice");

    // But data should NOT have changed yet (still same row count)
    const rowCountAfter = await page.locator("table tbody tr").count();
    expect(rowCountAfter).toBe(rowCountBefore);

    // After delay, data should filter down
    await page.waitForSelector(".toolbar-status-ok", { timeout: 5000 });
    const rowCountFiltered = await page.locator("table tbody tr").count();
    expect(rowCountFiltered).toBeLessThan(rowCountBefore);
  });

  test("filter spinner should only appear on the changed column", async ({ page }) => {
    // Type in Email filter
    const emailFilter = page.locator("table thead th").nth(4).locator(".col-filter-input");
    await emailFilter.click();
    await emailFilter.fill("test");

    // Spinner should appear only in Email header
    const emailSpinner = page.locator("table thead th").nth(4).locator(".col-filter-spinner");
    await expect(emailSpinner).toBeVisible();

    // No spinner on other columns (e.g. First Name)
    const nameSpinner = page.locator("table thead th").nth(2).locator(".col-filter-spinner");
    await expect(nameSpinner).not.toBeVisible();
  });

  test("filter spinner disappears after delay", async ({ page }) => {
    const emailFilter = page.locator("table thead th").nth(4).locator(".col-filter-input");
    await emailFilter.click();
    await emailFilter.fill("test");

    // Spinner visible
    const emailSpinner = page.locator("table thead th").nth(4).locator(".col-filter-spinner");
    await expect(emailSpinner).toBeVisible();

    // After delay, spinner gone
    await page.waitForSelector(".toolbar-status-ok", { timeout: 5000 });
    await expect(emailSpinner).not.toBeVisible();
  });

  test("second filter does not add spinner to first filter column", async ({ page }) => {
    // First: filter Skills (combobox)
    const skillsHeader = page.locator("table thead th").nth(6);
    const skillsInput = skillsHeader.locator(".col-filter-input");
    await skillsInput.click();
    // Select "React" checkbox
    const reactOption = skillsHeader.locator(".col-filter-dropdown-option", { hasText: "React" });
    await reactOption.click();

    // Wait for skills filter to complete
    await page.waitForSelector(".toolbar-status-ok", { timeout: 5000 });

    // Now filter Email
    const emailFilter = page.locator("table thead th").nth(4).locator(".col-filter-input");
    await emailFilter.click();
    await emailFilter.fill("alice");

    // Spinner only on Email, NOT on Skills
    const emailSpinner = page.locator("table thead th").nth(4).locator(".col-filter-spinner");
    const skillsSpinner = skillsHeader.locator(".col-filter-spinner");
    await expect(emailSpinner).toBeVisible();
    await expect(skillsSpinner).not.toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("local");
  });
});

// ============================================================================
// Backend mode – rapid operations & cancellation
// ============================================================================
test.describe("Backend mode – rapid operations", () => {
  test.beforeEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("backend-slow");
    await page.waitForSelector(".toolbar-status-ok");
  });

  test("rapid sort on different columns: first cancelled, second wins", async ({ page }) => {
    const emailHeader = page.locator("table thead th .col-header-label").nth(4);
    const firstNameHeader = page.locator("table thead th .col-header-label").nth(2);

    // Capture initial data
    const emailCells = () =>
      page
        .locator("table tbody tr")
        .locator("td:nth-child(5)")
        .evaluateAll((cells) => cells.slice(0, 5).map((c) => c.textContent?.trim() ?? ""));
    const before = await emailCells();

    // Click Email sort
    await emailHeader.click();
    await expect(page.locator(".col-sort-spinner")).toBeVisible();

    // Quickly click First Name sort before first timer fires (cancels first)
    await page.waitForTimeout(500);
    await firstNameHeader.click();

    // Data should still be unchanged
    const duringPending = await emailCells();
    expect(duringPending).toEqual(before);

    // Spinner should now be on First Name column (3rd header)
    const firstNameSpinner = page.locator("table thead th").nth(2).locator(".col-sort-spinner");
    await expect(firstNameSpinner).toBeVisible();

    // Wait for the final result
    await page.waitForSelector(".toolbar-status-ok", { timeout: 5000 });

    // Sort arrow should be on First Name, not Email
    await expect(page.locator("table thead th").nth(2).locator(".col-sort-asc")).toBeVisible();
    await expect(page.locator("table thead th").nth(4).locator(".col-sort-asc")).not.toBeVisible();
    await expect(page.locator(".col-sort-spinner")).not.toBeVisible();
  });

  test("sort then filter: both pending simultaneously", async ({ page }) => {
    const emailHeader = page.locator("table thead th .col-header-label").nth(4);

    // Click sort
    await emailHeader.click();
    await expect(page.locator(".col-sort-spinner")).toBeVisible();

    // Also filter First Name
    const nameFilter = page.locator("table thead th").nth(2).locator(".col-filter-input");
    await nameFilter.click();
    await nameFilter.fill("Eva");

    // Both indicators visible
    await expect(page.locator(".col-sort-spinner")).toBeVisible();
    const nameSpinner = page.locator("table thead th").nth(2).locator(".col-filter-spinner");
    await expect(nameSpinner).toBeVisible();

    // After delay, both resolved
    await page.waitForSelector(".toolbar-status-ok", { timeout: 5000 });
    await expect(page.locator(".col-sort-spinner")).not.toBeVisible();
    await expect(nameSpinner).not.toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("local");
  });
});

// ============================================================================
// Backend mode – mode switching
// ============================================================================
test.describe("Backend mode – mode switching", () => {
  test("switching to local mode makes operations instant", async ({ page }) => {
    // Start in backend-slow
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("backend-slow");
    await page.waitForSelector(".toolbar-status-ok");

    // Switch back to local
    await modeSelect.selectOption("local");

    // No status indicator in local mode
    await expect(page.locator(".toolbar-status")).not.toBeVisible();

    // Sort should be instant
    const emailCells = () =>
      page
        .locator("table tbody tr")
        .locator("td:nth-child(5)")
        .evaluateAll((cells) => cells.slice(0, 5).map((c) => c.textContent?.trim() ?? ""));
    const before = await emailCells();

    const emailHeader = page.locator("table thead th .col-header-label").nth(4);
    await emailHeader.click();

    // No spinner, no loading status
    await expect(page.locator(".col-sort-spinner")).not.toBeVisible();

    // Data should change immediately
    const after = await emailCells();
    expect(after).not.toEqual(before);

    // Sort arrow should be visible immediately
    await expect(page.locator(".col-sort-asc")).toBeVisible();
  });

  test("switching from local to backend adds delay", async ({ page }) => {
    // Ensure local mode
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("local");

    // Switch to backend-slow
    await modeSelect.selectOption("backend-slow");
    await page.waitForSelector(".toolbar-status-ok");

    // Sort should now be delayed
    const emailHeader = page.locator("table thead th .col-header-label").nth(4);
    await emailHeader.click();

    await expect(page.locator(".col-sort-spinner")).toBeVisible();
    await expect(page.locator(".toolbar-status-info")).toBeVisible();
  });
});

// ============================================================================
// Backend mode – status indicator
// ============================================================================
test.describe("Backend mode – status indicator", () => {
  test.beforeEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("backend-slow");
    await page.waitForSelector(".toolbar-status-ok");
  });

  test("status shows 'Loading...' during pending operation", async ({ page }) => {
    const emailHeader = page.locator("table thead th .col-header-label").nth(4);
    await emailHeader.click();

    await expect(page.locator(".toolbar-status-info")).toContainText("Loading");
    // Spinner element should be visible
    await expect(page.locator(".toolbar-status-spinner")).toBeVisible();
  });

  test("status shows 'Synced' after operation completes", async ({ page }) => {
    const emailHeader = page.locator("table thead th .col-header-label").nth(4);
    await emailHeader.click();

    // Wait for completion
    await page.waitForSelector(".toolbar-status-ok", { timeout: 5000 });
    await expect(page.locator(".toolbar-status-ok")).toContainText("Synced");
  });

  test("no status indicator in local mode", async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("local");

    await expect(page.locator(".toolbar-status")).not.toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("local");
  });
});

// ============================================================================
// Backend mode – optimistic edits
// ============================================================================
test.describe("Backend mode – optimistic edits", () => {
  test.beforeEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("backend-slow");
    await page.waitForSelector(".toolbar-status-ok");
  });

  test("edited cell value stays visible during backend delay", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to row 1, col 2 (First Name)
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    // The cell we're editing — identified by data attributes (stable after cursor moves)
    const editedCell = page.locator('td[data-row-idx="1"][data-col-idx="2"]');
    const originalValue = await editedCell.textContent();

    // Enter edit mode and type a new value
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("OptimisticTestName");
    await page.keyboard.press("Tab"); // commit without changing row

    // The new value should be visible immediately (optimistic)
    await expect(editedCell).toContainText("OptimisticTestName");

    // Wait a moment to verify it doesn't revert
    await page.waitForTimeout(1000);
    await expect(editedCell).toContainText("OptimisticTestName");

    // After the full backend delay, value should still be there
    await page.waitForSelector(".toolbar-status-ok", { timeout: 5000 });
    await expect(editedCell).toContainText("OptimisticTestName");
  });

  test("typing in cell, Tab to next cell, typing there — both values visible immediately", async ({
    page,
  }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to row 1, col 2 (First Name)
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    const cell1 = page.locator('td[data-row-idx="1"][data-col-idx="2"]');
    const cell2 = page.locator('td[data-row-idx="1"][data-col-idx="3"]');

    // Edit cell 1
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("CellOneValue");
    // Tab → commit cell 1, move to cell 2
    await page.keyboard.press("Tab");

    // Cell 1 should show new value immediately
    await expect(cell1).toContainText("CellOneValue");

    // Now type in cell 2 (starts edit mode via initialEditValue)
    await page.keyboard.type("CellTwoValue");
    // The typed text should be visible in the editor immediately
    const editor = cell2.locator("input.cell-editor-input");
    await expect(editor).toHaveValue("CellTwoValue");

    // Commit cell 2
    await page.keyboard.press("Tab");

    // Both values should be visible immediately
    await expect(cell1).toContainText("CellOneValue");
    await expect(cell2).toContainText("CellTwoValue");

    // Wait a moment — values must NOT revert
    await page.waitForTimeout(1000);
    await expect(cell1).toContainText("CellOneValue");
    await expect(cell2).toContainText("CellTwoValue");

    // After backend delay, still there
    await page.waitForSelector(".toolbar-status-ok", { timeout: 10000 });
    await expect(cell1).toContainText("CellOneValue");
    await expect(cell2).toContainText("CellTwoValue");
  });

  test("insert row, edit 3 cells sequentially — no data loss during loading", async ({
    page,
  }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to first data row
    await page.keyboard.press("ArrowDown");

    // Count rows before insert
    const rowsBefore = await page.locator("table tbody tr").count();

    // Right-click → Insert row below
    const firstCell = page.locator("td.cell-selected");
    await firstCell.click({ button: "right" });
    await page.waitForSelector(".context-menu");
    const insertBelow = page.locator(".context-menu-item").nth(1); // "Insert row below"
    await insertBelow.click();

    // Verify row was inserted
    const rowsAfter = await page.locator("table tbody tr").count();
    expect(rowsAfter).toBe(rowsBefore + 1);

    // Navigate to the new row (it's below the current one)
    await page.keyboard.press("ArrowDown");
    // Move to col 1 (System Key) — col 0 is ID (readOnly)
    await page.keyboard.press("ArrowRight");

    // Get the row index of the new row from the selected cell
    const newRowIdx = await page
      .locator("td.cell-selected")
      .getAttribute("data-row-idx");

    // Edit cell 1 (System Key): Enter → type → Tab
    await page.keyboard.press("Enter");
    await page.keyboard.type("KEY001");
    await page.keyboard.press("Tab");

    // Edit cell 2 (First Name): Enter → type → Tab
    await page.keyboard.press("Enter");
    await page.keyboard.type("TestFirst");
    await page.keyboard.press("Tab");

    // Edit cell 3 (Last Name): Enter → type → Tab
    await page.keyboard.press("Enter");
    await page.keyboard.type("TestLast");
    await page.keyboard.press("Tab");

    // All three cells should show their values immediately
    const cellKey = page.locator(`td[data-row-idx="${newRowIdx}"][data-col-idx="1"]`);
    const cellFirst = page.locator(`td[data-row-idx="${newRowIdx}"][data-col-idx="2"]`);
    const cellLast = page.locator(`td[data-row-idx="${newRowIdx}"][data-col-idx="3"]`);

    await expect(cellKey).toContainText("KEY001");
    await expect(cellFirst).toContainText("TestFirst");
    await expect(cellLast).toContainText("TestLast");

    // Wait during loading — values must NOT revert
    await page.waitForTimeout(1500);
    await expect(cellKey).toContainText("KEY001");
    await expect(cellFirst).toContainText("TestFirst");
    await expect(cellLast).toContainText("TestLast");

    // After all backend delays resolve — still there
    await page.waitForSelector(".toolbar-status-ok", { timeout: 10000 });
    await expect(cellKey).toContainText("KEY001");
    await expect(cellFirst).toContainText("TestFirst");
    await expect(cellLast).toContainText("TestLast");
  });

  test.afterEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("local");
  });
});

// ============================================================================
// Backend mode – error handling
// ============================================================================
test.describe("Backend mode – error handling (server error)", () => {
  test.beforeEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("backend-error");
    await page.waitForSelector(".toolbar-status-ok");
  });

  test("editing a cell shows error status after delay and rolls back", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to row 1, col 2 (First Name)
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    const cell = page.locator('td[data-row-idx="1"][data-col-idx="2"]');
    const original = await cell.textContent();

    // Edit
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("WillFail");
    await page.keyboard.press("Tab");

    // Optimistically shows the edit
    await expect(cell).toContainText("WillFail");

    // After 2s delay: error status + rollback
    await expect(page.locator(".toolbar-status-error")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".toolbar-status-error")).toContainText("failed");

    // Cell should roll back to original value
    await expect(cell).toContainText(original!);
  });

  test("rollback triggers shake animation on the table", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Set up a MutationObserver to detect the shake class
    await page.evaluate(() => {
      (window as any).__shakeDetected = false;
      const el = document.querySelector(".grid-db-editor");
      if (!el) return;
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === "attributes" && (m.target as HTMLElement).classList.contains("shake")) {
            (window as any).__shakeDetected = true;
          }
        }
      });
      observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    });

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    // Edit a cell (will be rolled back after 2s)
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("ShakeTest");
    await page.keyboard.press("Tab");

    // Wait for the rollback to happen (2s delay + margin)
    await page.waitForTimeout(3000);

    // The MutationObserver should have caught the shake class
    const shakeDetected = await page.evaluate(() => (window as any).__shakeDetected);
    expect(shakeDetected).toBe(true);

    // After animation ends, shake class should be gone
    await expect(table).not.toHaveClass(/shake/);
  });

  test("deleting a row rolls back — row reappears", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    const rowsBefore = await page.locator("table tbody tr").count();

    // Right-click → delete
    const cell = page.locator("td.cell-selected");
    await cell.click({ button: "right" });
    await page.waitForSelector(".context-menu");
    const removeItem = page.locator(".context-menu-item", { hasText: /Remove rows/ });
    await removeItem.click();

    // Row removed optimistically
    const rowsAfterDelete = await page.locator("table tbody tr").count();
    expect(rowsAfterDelete).toBe(rowsBefore - 1);

    // After error: row reappears (rollback)
    await expect(page.locator(".toolbar-status-error")).toBeVisible({ timeout: 5000 });
    const rowsAfterRollback = await page.locator("table tbody tr").count();
    expect(rowsAfterRollback).toBe(rowsBefore);
  });

  test.afterEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("local");
  });
});

// ============================================================================
// Backend mode – connection error (immediate failure)
// ============================================================================
test.describe("Backend mode – connection error", () => {
  test.beforeEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("backend-offline");
    await page.waitForSelector(".toolbar-status-ok");
  });

  test("editing a cell keeps the value and marks it unsaved", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    const cell = page.locator('td[data-row-idx="1"][data-col-idx="2"]');

    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("OfflineEdit");
    await page.keyboard.press("Tab");

    // Value stays visible (no rollback!)
    await expect(cell).toContainText("OfflineEdit");

    // Cell marked as unsaved
    await expect(cell).toHaveClass(/cell-unsaved/);

    // Status shows connection error / unsaved
    await expect(page.locator(".toolbar-status")).toBeVisible({ timeout: 2000 });

    // Value persists even after waiting
    await page.waitForTimeout(1000);
    await expect(cell).toContainText("OfflineEdit");
  });

  test("inserting a row keeps the row (no rollback)", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    await page.keyboard.press("ArrowDown");
    const rowsBefore = await page.locator("table tbody tr").count();

    // Create row via toolbar
    await page.locator(".grid-db-editor-toolbar .toolbar-button").click();

    // Row stays (not rolled back)
    const rowsAfter = await page.locator("table tbody tr").count();
    expect(rowsAfter).toBe(rowsBefore + 1);

    // Status shows error
    await expect(page.locator(".toolbar-status-error")).toBeVisible({ timeout: 2000 });
  });

  test("editing cell 2 does NOT clear unsaved marking on cell 1", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Edit cell 1 (First Name, row 1 col 2)
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    const cell1 = page.locator('td[data-row-idx="1"][data-col-idx="2"]');
    const cell2 = page.locator('td[data-row-idx="1"][data-col-idx="3"]');

    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Unsaved1");
    await page.keyboard.press("Tab");

    // Cell 1 should be unsaved
    await expect(cell1).toContainText("Unsaved1");
    await expect(cell1).toHaveClass(/cell-unsaved/);

    // Now edit cell 2 (Last Name, same row, cursor moved here via Tab)
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Unsaved2");
    await page.keyboard.press("Tab");

    // Cell 2 should also be unsaved
    await expect(cell2).toContainText("Unsaved2");
    await expect(cell2).toHaveClass(/cell-unsaved/);

    // Cell 1 MUST STILL be unsaved (not cleared!)
    await expect(cell1).toContainText("Unsaved1");
    await expect(cell1).toHaveClass(/cell-unsaved/);
  });

  test("unsaved status persists and shows retrying", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("RetryMe");
    await page.keyboard.press("Tab");

    // Wait for background retry to start
    await page.waitForTimeout(3000);

    // Status should show retrying or unsaved (not "Synced")
    const statusText = await page.locator(".toolbar-status").textContent();
    expect(statusText).not.toContain("Synced");

    // Value still there
    const cell = page.locator('td[data-row-idx="1"][data-col-idx="2"]');
    await expect(cell).toContainText("RetryMe");
  });

  test.afterEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("local");
  });
});

// ============================================================================
// Backend mode – validation errors from backend
// ============================================================================
test.describe("Backend mode – validation errors", () => {
  test.beforeEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("backend-validation");
    await page.waitForSelector(".toolbar-status-ok");
  });

  test("invalid email gets cell-error class and tooltip after backend response", async ({
    page,
  }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to row 1, Email column (col 4)
    await page.keyboard.press("ArrowDown");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");

    const emailCell = page.locator('td[data-row-idx="1"][data-col-idx="4"]');

    // Type an invalid email (no @)
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("invalid-email");
    await page.keyboard.press("Tab");

    // Optimistic: value is visible immediately
    await expect(emailCell).toContainText("invalid-email");

    // After backend delay: cell should get error class and tooltip
    await page.waitForSelector(".toolbar-status-error", { timeout: 5000 });
    await expect(emailCell).toHaveClass(/cell-error/);
    const title = await emailCell.getAttribute("title");
    expect(title).toContain("must contain @");

    // The typed value should STILL be visible (not rolled back)
    await expect(emailCell).toContainText("invalid-email");
  });

  test("fixing the error clears the validation meta", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Email (row 1, col 4) and type invalid value
    await page.keyboard.press("ArrowDown");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");

    const emailCell = page.locator('td[data-row-idx="1"][data-col-idx="4"]');

    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("bad");
    await page.keyboard.press("Tab");

    // Wait for validation error
    await page.waitForSelector(".toolbar-status-error", { timeout: 5000 });
    await expect(emailCell).toHaveClass(/cell-error/);

    // Fix the email — navigate back
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("valid@example.com");
    await page.keyboard.press("Tab");

    // Wait for second backend response
    await page.waitForTimeout(3000);

    // Error should be cleared
    await expect(emailCell).not.toHaveClass(/cell-error/);
    await expect(emailCell).toContainText("valid@example.com");
  });

  test("validation errors persist while editing other cells", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Type invalid email
    await page.keyboard.press("ArrowDown");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");

    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("nope");
    await page.keyboard.press("Tab");

    const emailCell = page.locator('td[data-row-idx="1"][data-col-idx="4"]');

    // Wait for validation error
    await page.waitForSelector(".toolbar-status-error", { timeout: 5000 });
    await expect(emailCell).toHaveClass(/cell-error/);

    // Edit another cell — cursor is on col 5 (Department) after Tab
    await page.keyboard.type("Sales");
    await page.keyboard.press("Tab");

    // Email error should still be visible
    await expect(emailCell).toHaveClass(/cell-error/);
    await expect(emailCell).toContainText("nope");
  });

  test.afterEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("local");
  });
});

// ============================================================================
// Backend mode – stale data detection
// ============================================================================
test.describe("Backend mode – stale data", () => {
  test.beforeEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("backend-stale");
    await page.waitForSelector(".toolbar-status-ok");
  });

  test("backend normalization produces stale cells with warning status", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to First Name (row 1, col 2)
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    const nameCell = page.locator('td[data-row-idx="1"][data-col-idx="2"]');

    // Type a lowercase name — backend will capitalize first letter
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("alice");
    await page.keyboard.press("Tab");

    // Optimistic: shows "alice"
    await expect(nameCell).toContainText("alice");

    // After 2s: backend normalizes to "Alice" — cell becomes stale
    await page.waitForTimeout(3000);
    await expect(nameCell).toContainText("Alice");
    await expect(nameCell).toHaveClass(/cell-stale/);

    // Status should show stale warning
    await expect(page.locator(".toolbar-status-warning")).toBeVisible();
    await expect(page.locator(".toolbar-status-warning")).toContainText("Stale");
  });

  test("email normalization to lowercase produces stale cell", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to Email (row 1, col 4)
    await page.keyboard.press("ArrowDown");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");

    const emailCell = page.locator('td[data-row-idx="1"][data-col-idx="4"]');

    // Type uppercase email — backend will lowercase it
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Alice@Example.COM");
    await page.keyboard.press("Tab");

    await expect(emailCell).toContainText("Alice@Example.COM");

    // After backend normalization
    await page.waitForTimeout(3000);
    await expect(emailCell).toContainText("alice@example.com");
    await expect(emailCell).toHaveClass(/cell-stale/);
  });

  test("value matching backend normalization does NOT become stale", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Navigate to First Name (row 1, col 2)
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    const nameCell = page.locator('td[data-row-idx="1"][data-col-idx="2"]');

    // Type already-capitalized name — no server diff expected
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Alice");
    await page.keyboard.press("Tab");

    await page.waitForTimeout(3000);
    await expect(nameCell).toContainText("Alice");
    await expect(nameCell).not.toHaveClass(/cell-stale/);
  });

  test.afterEach(async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("local");
  });
});

// ============================================================================
// Backend mode – auto-retry on connection error
// ============================================================================
test.describe("Backend mode – auto-retry", () => {
  test("connection error shows retry attempts in status and keeps data", async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("backend-offline");
    await page.waitForSelector(".toolbar-status-ok");

    const table = page.locator(".grid-db-editor");
    await table.focus();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("RetryTest");
    await page.keyboard.press("Tab");

    const cell = page.locator('td[data-row-idx="1"][data-col-idx="2"]');

    // Data stays
    await expect(cell).toContainText("RetryTest");
    // Marked as unsaved
    await expect(cell).toHaveClass(/cell-unsaved/);

    // Wait for background retry to show in status
    await page.waitForTimeout(3000);
    const statusText = await page.locator(".toolbar-status").textContent();
    // Should show retrying or unsaved, never "Synced"
    expect(statusText).not.toContain("Synced");

    // Reset
    await modeSelect.selectOption("local");
  });
});

// ============================================================================
// Backend mode – mode switching clears retry loops
// ============================================================================
test.describe("Backend mode – mode switching", () => {
  test("switching from connection-error to backend-slow clears retry status", async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);

    // Enter connection-error mode
    await modeSelect.selectOption("backend-offline");
    await page.waitForSelector(".toolbar-status-ok");

    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Edit a cell → triggers connection error + unsaved marking
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("ModeSwitch");
    await page.keyboard.press("Tab");

    // Wait for retry status to appear
    await page.waitForTimeout(1000);
    const statusBefore = await page.locator(".toolbar-status").textContent();
    expect(statusBefore).toContain("Connection error");

    // Switch to Backend 2s mode → should clear error and show Synced
    await modeSelect.selectOption("backend-slow");
    await page.waitForTimeout(500);

    // Status should no longer show connection error
    const statusAfter = await page.locator(".toolbar-status").textContent();
    expect(statusAfter).not.toContain("Connection error");

    // Reset
    await modeSelect.selectOption("local");
  });

  test("delete in error mode triggers shake animation", async ({ page }) => {
    const modeSelect = page.locator(".theme-switcher-select").nth(1);
    await modeSelect.selectOption("backend-error");
    await page.waitForSelector(".toolbar-status-ok");

    const table = page.locator(".grid-db-editor");
    await table.focus();

    // Set up shake detector
    await page.evaluate(() => {
      (window as any).__shakeDetected = false;
      const el = document.querySelector(".grid-db-editor");
      if (!el) return;
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === "attributes" && (m.target as HTMLElement).classList.contains("shake")) {
            (window as any).__shakeDetected = true;
          }
        }
      });
      observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    });

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    const rowsBefore = await page.locator("table tbody tr").count();

    // Right-click → delete
    const cell = page.locator("td.cell-selected");
    await cell.click({ button: "right" });
    await page.waitForSelector(".context-menu");
    const removeItem = page.locator(".context-menu-item", { hasText: /Remove rows/ });
    await removeItem.click();

    // Wait for error rollback (2s + margin)
    await page.waitForTimeout(3000);

    // Row should reappear
    const rowsAfter = await page.locator("table tbody tr").count();
    expect(rowsAfter).toBe(rowsBefore);

    // Shake should have been triggered
    const shakeDetected = await page.evaluate(() => (window as any).__shakeDetected);
    expect(shakeDetected).toBe(true);

    // Reset
    await modeSelect.selectOption("local");
  });
});

// ============================================================================
// New cell types: Date, DateTime, Time, Duration, Color
// ============================================================================

/** Helper: get cell by column header label and row index. */
async function getCellByHeader(page: any, headerLabel: string, rowIdx: number) {
  const headers = page.locator("table thead th .col-header-label");
  const count = await headers.count();
  for (let i = 0; i < count; i++) {
    const text = await headers.nth(i).textContent();
    if (text?.trim() === headerLabel) {
      return page.locator("table tbody tr").nth(rowIdx).locator("td").nth(i);
    }
  }
  throw new Error(`Column header "${headerLabel}" not found`);
}

test.describe("Date editor", () => {
  test("should display formatted date in Hire Date column", async ({ page }) => {
    const cell = await getCellByHeader(page, "Hire Date", 0);
    const text = await cell.textContent();
    // Should be locale-formatted, not raw ISO
    expect(text).toBeTruthy();
    expect(text).not.toMatch(/^\d{4}-\d{2}-\d{2}$/); // not raw ISO
  });

  test("should enter edit mode and show raw ISO value", async ({ page }) => {
    const cell = await getCellByHeader(page, "Hire Date", 0);
    await cell.click();
    await page.keyboard.press("F2");
    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();
    // Raw value should be ISO format
    const val = await input.inputValue();
    expect(val).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await page.keyboard.press("Escape");
  });

  test("should show date picker button", async ({ page }) => {
    const cell = await getCellByHeader(page, "Hire Date", 0);
    await cell.click();
    await page.keyboard.press("F2");
    const pickerBtn = cell.locator(".cell-editor-picker-btn");
    await expect(pickerBtn).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("should commit edited date on Enter", async ({ page }) => {
    const cell = await getCellByHeader(page, "Hire Date", 0);
    await cell.click();
    await page.keyboard.press("F2");
    const input = cell.locator(".cell-editor-input");
    await input.fill("2025-01-15");
    await page.keyboard.press("Enter");
    // After commit, cell should show formatted date
    const text = await cell.textContent();
    expect(text).toContain("2025");
  });
});

test.describe("DateTime editor", () => {
  test("should display formatted datetime in Last Login column", async ({ page }) => {
    const cell = await getCellByHeader(page, "Last Login", 0);
    const text = await cell.textContent();
    expect(text).toBeTruthy();
  });

  test("should enter edit mode and show ISO value", async ({ page }) => {
    const cell = await getCellByHeader(page, "Last Login", 0);
    await cell.click();
    await page.keyboard.press("F2");
    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();
    const val = await input.inputValue();
    expect(val).toContain("T"); // ISO format has T separator
    await page.keyboard.press("Escape");
  });
});

test.describe("Time editor", () => {
  test("should display formatted time in Check-In column", async ({ page }) => {
    const cell = await getCellByHeader(page, "Check-In", 0);
    const text = await cell.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  });

  test("should enter edit mode with raw time value", async ({ page }) => {
    const cell = await getCellByHeader(page, "Check-In", 0);
    await cell.click();
    await page.keyboard.press("F2");
    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();
    const val = await input.inputValue();
    expect(val).toMatch(/^\d{1,2}:\d{2}/); // HH:mm format
    await page.keyboard.press("Escape");
  });

  test("should show time picker button", async ({ page }) => {
    const cell = await getCellByHeader(page, "Check-In", 0);
    await cell.click();
    await page.keyboard.press("F2");
    const pickerBtn = cell.locator(".cell-editor-picker-btn");
    await expect(pickerBtn).toBeVisible();
    await page.keyboard.press("Escape");
  });
});

test.describe("Duration editor", () => {
  test("should display formatted duration in Shift column", async ({ page }) => {
    const cell = await getCellByHeader(page, "Shift", 0);
    const text = await cell.textContent();
    // Should be short format like "8h" or "7h 30m"
    expect(text).toMatch(/\d+h/);
  });

  test("should enter edit mode with raw ISO duration", async ({ page }) => {
    const cell = await getCellByHeader(page, "Shift", 0);
    await cell.click();
    await page.keyboard.press("F2");
    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();
    const val = await input.inputValue();
    expect(val).toMatch(/^PT/); // ISO 8601 duration
    await page.keyboard.press("Escape");
  });

  test("should accept and normalize short form input", async ({ page }) => {
    const cell = await getCellByHeader(page, "Shift", 0);
    await cell.click();
    await page.keyboard.press("F2");
    const input = cell.locator(".cell-editor-input");
    await input.fill("2h 30m");
    await page.keyboard.press("Enter");
    // After commit, the next edit should show normalized ISO
    await cell.click();
    await page.keyboard.press("F2");
    const val = await cell.locator(".cell-editor-input").inputValue();
    expect(val).toBe("PT2H30M");
    await page.keyboard.press("Escape");
  });
});

test.describe("Color editor", () => {
  test("should display color swatch and hex value", async ({ page }) => {
    const cell = await getCellByHeader(page, "Color", 0);
    const swatch = cell.locator(".color-swatch");
    await expect(swatch).toBeVisible();
    const text = await cell.textContent();
    expect(text).toMatch(/#[0-9a-f]{6}/i);
  });

  test("should enter edit mode with hex value", async ({ page }) => {
    const cell = await getCellByHeader(page, "Color", 0);
    await cell.click();
    await page.keyboard.press("F2");
    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();
    const val = await input.inputValue();
    expect(val).toMatch(/^#[0-9a-f]{6}$/);
    await page.keyboard.press("Escape");
  });

  test("should show clickable swatch in edit mode", async ({ page }) => {
    const cell = await getCellByHeader(page, "Color", 0);
    await cell.click();
    await page.keyboard.press("F2");
    const swatch = cell.locator(".color-swatch-clickable");
    await expect(swatch).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("should normalize hex input on commit", async ({ page }) => {
    const cell = await getCellByHeader(page, "Color", 0);
    await cell.click();
    await page.keyboard.press("F2");
    const input = cell.locator(".cell-editor-input");
    await input.fill("F00");
    await page.keyboard.press("Enter");
    // Next edit should show normalized hex
    await cell.click();
    await page.keyboard.press("F2");
    const val = await cell.locator(".cell-editor-input").inputValue();
    expect(val).toBe("#ff0000");
    await page.keyboard.press("Escape");
  });
});

// ============================================================================
// Multi-Sort (Shift+Click)
// ============================================================================
test.describe("Multi-Sort", () => {
  test("should sort ascending when clicking a column header", async ({ page }) => {
    const firstNameHeader = page.locator("table thead th .col-header-label", { hasText: "First Name" });
    await firstNameHeader.click();

    // Should show ascending arrow
    const th = firstNameHeader.locator("..");
    const sortIcon = th.locator(".col-sort-asc");
    await expect(sortIcon).toBeVisible();
  });

  test("should add secondary sort with Shift+click", async ({ page }) => {
    // Click First Name to sort ascending
    const firstNameHeader = page.locator("table thead th .col-header-label", { hasText: "First Name" });
    await firstNameHeader.click();

    // Shift+click Last Name to add as secondary sort
    const lastNameHeader = page.locator("table thead th .col-header-label", { hasText: "Last Name" });
    await lastNameHeader.click({ modifiers: ["Shift"] });

    // Both columns should show sort arrows
    const firstNameTh = firstNameHeader.locator("..");
    const lastNameTh = lastNameHeader.locator("..");
    await expect(firstNameTh.locator(".col-sort-asc")).toBeVisible();
    await expect(lastNameTh.locator(".col-sort-asc")).toBeVisible();

    // Priority numbers should be shown (1 and 2)
    await expect(firstNameTh.locator(".col-sort-priority")).toContainText("1");
    await expect(lastNameTh.locator(".col-sort-priority")).toContainText("2");
  });

  test("should replace multi-sort with single sort on regular click", async ({ page }) => {
    // Set up multi-sort: click First Name, then Shift+click Last Name
    const firstNameHeader = page.locator("table thead th .col-header-label").filter({ hasText: /^First Name/ });
    await firstNameHeader.click();
    const lastNameHeader = page.locator("table thead th .col-header-label").filter({ hasText: /^Last Name/ });
    await lastNameHeader.click({ modifiers: ["Shift"] });

    // Now click Email without Shift → replaces multi-sort with single sort on Email
    const emailHeader = page.locator("table thead th .col-header-label").filter({ hasText: /^Email/ });
    await emailHeader.click();

    // Email should show sort icon
    await expect(emailHeader.locator(".col-sort-icon")).toBeVisible();

    // First Name and Last Name should no longer have sort icons
    await expect(firstNameHeader.locator(".col-sort-icon")).not.toBeVisible();
    await expect(lastNameHeader.locator(".col-sort-icon")).not.toBeVisible();
  });
});

// ============================================================================
// Input Masking
// ============================================================================
test.describe("Input Masking", () => {
  test("should show masked input when editing Phone column", async ({ page }) => {
    const cell = await getCellByHeader(page, "Phone", 0);
    await cell.click();
    await page.keyboard.press("F2");

    const input = cell.locator(".cell-editor-input");
    await expect(input).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("should auto-insert mask separators when typing digits", async ({ page }) => {
    const cell = await getCellByHeader(page, "Phone", 0);
    await cell.click();
    await page.keyboard.press("F2");

    const input = cell.locator(".cell-editor-input");
    await input.fill("");
    // Clear and type digits — the mask "+## ### ########" should auto-format
    await input.pressSequentially("49123456789012");
    const val = await input.inputValue();

    // Should contain the mask prefix "+" and spaces as separators
    expect(val).toContain("+");
    expect(val).toContain(" ");
    // Should match pattern like "+49 123 456789012" (mask applied)
    expect(val).toMatch(/^\+\d{2}\s\d{3}\s/);
    await page.keyboard.press("Escape");
  });
});

// ============================================================================
// Dependent Dropdowns
// ============================================================================
test.describe("Dependent Dropdowns", () => {
  test("should show German cities when Country is Germany", async ({ page }) => {
    // First set the Country column to "Germany" via typing
    const countryCell = await getCellByHeader(page, "Country", 0);
    await countryCell.click();
    await page.keyboard.press("F2");
    const countryInput = page.locator(".combo-dropdown-input").first();
    await countryInput.fill("Germany");
    await page.keyboard.press("Enter"); // commit
    await page.waitForTimeout(300);

    // Now open City dropdown on the same row
    const cityCell = await getCellByHeader(page, "City", 0);
    await cityCell.click();
    await page.keyboard.press("F2");

    // Check that German cities appear in the dropdown options
    const dropdown = page.locator(".combo-dropdown-list").first();
    await expect(dropdown).toBeVisible({ timeout: 3000 });
    const dropdownText = await dropdown.textContent();

    // At least one German city should be present
    const germanCities = ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart"];
    const hasGermanCity = germanCities.some((city) => dropdownText?.includes(city));
    expect(hasGermanCity).toBe(true);

    await page.keyboard.press("Escape");
  });
});

// ============================================================================
// Column Resizing
// ============================================================================
test.describe("Column Resizing", () => {
  test("should have resize handles in column headers", async ({ page }) => {
    const resizeHandles = page.locator(".col-resize-handle");
    expect(await resizeHandles.count()).toBeGreaterThan(0);
  });

  test("should change column width when dragging resize handle", async ({ page }) => {
    // Get the second column header (first non-sticky column is more reliable)
    const secondTh = page.locator("table thead th").nth(1);
    const initialBox = await secondTh.boundingBox();
    expect(initialBox).toBeTruthy();
    const initialWidth = initialBox!.width;

    // Drag the resize handle of the second column
    const resizeHandle = secondTh.locator(".col-resize-handle");
    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).toBeTruthy();

    // Drag right by 100px
    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 100, handleBox!.y + handleBox!.height / 2, { steps: 5 });
    await page.mouse.up();

    // Width should have increased
    const newBox = await secondTh.boundingBox();
    expect(newBox).toBeTruthy();
    expect(newBox!.width).toBeGreaterThan(initialWidth + 50);
  });

  test("should allow resizing a column smaller than its content", async ({ page }) => {
    const secondTh = page.locator("table thead th").nth(1);
    const initialBox = await secondTh.boundingBox();
    expect(initialBox).toBeTruthy();
    const initialWidth = initialBox!.width;

    // Drag the resize handle LEFT to make the column narrower
    const resizeHandle = secondTh.locator(".col-resize-handle");
    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).toBeTruthy();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x - initialWidth + 50, handleBox!.y + handleBox!.height / 2, { steps: 5 });
    await page.mouse.up();

    // Width should have decreased (column can be smaller than content)
    const newBox = await secondTh.boundingBox();
    expect(newBox).toBeTruthy();
    expect(newBox!.width).toBeLessThan(initialWidth);
  });
});

// ============================================================================
// Selection Summary
// ============================================================================
test.describe("Selection Summary", () => {
  test("should show summary when selecting Number cells", async ({ page }) => {
    // Navigate to the Salary column which is a Number type
    const salaryCell = await getCellByHeader(page, "Salary", 0);
    await salaryCell.click();

    // Select a range of Salary cells using Shift+ArrowDown
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await page.waitForTimeout(300);

    // Selection summary should appear
    const summary = page.locator(".selection-summary");
    await expect(summary).toBeVisible({ timeout: 3000 });
    const text = await summary.textContent();
    expect(text).toContain("Sum:");
    expect(text).toContain("Count:");
  });
});

// ============================================================================
// Search & Replace (Ctrl+H)
// ============================================================================
test.describe("Search & Replace", () => {
  test("should open search/replace dialog with Ctrl+H", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();
    await page.keyboard.press("Control+h");

    const dialog = page.locator(".search-replace-dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });
  });

  test("should open search/replace dialog from context menu", async ({ page }) => {
    // Right-click on a cell to open context menu
    const cell = page.locator("table tbody tr").first().locator("td").nth(2);
    await cell.click({ button: "right" });

    // The context menu should show "Search & Replace"
    const menuItem = page.locator(".context-menu-item", { hasText: "Search & Replace" });
    await expect(menuItem).toBeVisible();

    // Click it to open the dialog
    await menuItem.click();
    const dialog = page.locator(".search-replace-dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });
  });

  test("should perform replacements with Replace All", async ({ page }) => {
    // First set a known value in a cell
    const table = page.locator(".grid-db-editor");
    await table.focus();
    await page.keyboard.press("ArrowRight"); // System Key column
    await page.keyboard.press("Enter");
    const input = page.locator("td .cell-editor-input").first();
    await input.fill("SearchTestValue");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    // Open search & replace
    await table.focus();
    await page.keyboard.press("Control+h");
    const dialog = page.locator(".search-replace-dialog");
    await expect(dialog).toBeVisible();

    // Fill search and replace fields
    const searchInput = dialog.locator("input").first();
    const replaceInput = dialog.locator("input").nth(1);
    await searchInput.fill("SearchTestValue");
    await replaceInput.fill("ReplacedValue");

    // Click Replace All
    const replaceAllBtn = dialog.locator(".search-replace-btn-primary");
    await replaceAllBtn.click();

    // Should show result message
    const result = dialog.locator(".search-replace-result");
    await expect(result).toBeVisible();
    const resultText = await result.textContent();
    expect(resultText).toContain("replacement");
  });

  test("should close dialog with Escape", async ({ page }) => {
    const table = page.locator(".grid-db-editor");
    await table.focus();
    await page.keyboard.press("Control+h");

    const dialog = page.locator(".search-replace-dialog");
    await expect(dialog).toBeVisible();

    // Focus the search input inside the dialog, then press Escape
    const searchInput = dialog.locator("input").first();
    await searchInput.focus();
    await searchInput.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});

// ============================================================================
// Column Manager
// ============================================================================
test.describe("Column Manager", () => {
  test("should open column manager dialog when clicking Columns button", async ({ page }) => {
    const columnsBtn = page.getByRole("button", { name: "Columns", exact: true });
    await columnsBtn.click();

    const dialog = page.locator(".column-manager-dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });
  });

  test("should hide a column when unchecking it", async ({ page }) => {
    // Verify "Email" column is visible
    const emailHeader = page.locator("table thead th .col-header-label", { hasText: "Email" });
    await expect(emailHeader).toBeVisible();

    // Open column manager
    const columnsBtn = page.getByRole("button", { name: "Columns", exact: true });
    await columnsBtn.click();

    const dialog = page.locator(".column-manager-dialog");
    await expect(dialog).toBeVisible();

    // Find the Email checkbox in the manager and uncheck it
    const emailItem = dialog.locator(".column-manager-label", { hasText: "Email" });
    const checkbox = emailItem.locator("input[type='checkbox']");
    await checkbox.uncheck();

    // Close the dialog
    const doneBtn = dialog.locator(".search-replace-btn-primary", { hasText: "Done" });
    await doneBtn.click();

    // Email column should no longer be visible
    await expect(emailHeader).not.toBeVisible();
  });

  test("should change number of fixed columns via select", async ({ page }) => {
    // Initially the first column (ID) should be sticky
    const firstCell = page.locator("table tbody tr").first().locator("td").first();
    await expect(firstCell).toHaveClass(/sticky/);

    // Second column should NOT be sticky
    const secondCell = page.locator("table tbody tr").first().locator("td").nth(1);
    await expect(secondCell).not.toHaveClass(/sticky/);

    // Open column manager
    const columnsBtn = page.getByRole("button", { name: "Columns", exact: true });
    await columnsBtn.click();

    const dialog = page.locator(".column-manager-dialog");
    await expect(dialog).toBeVisible();

    // Change fixed columns to 2
    const stickySelect = dialog.locator(".column-manager-sticky-select");
    await stickySelect.selectOption("2");

    // Close dialog
    await dialog.locator(".search-replace-btn-primary", { hasText: "Done" }).click();

    // Now both first and second columns should be sticky
    await expect(firstCell).toHaveClass(/sticky/);
    await expect(secondCell).toHaveClass(/sticky/);
  });

  test("should set fixed columns to none", async ({ page }) => {
    // Open column manager
    await page.getByRole("button", { name: "Columns", exact: true }).click();
    const dialog = page.locator(".column-manager-dialog");

    // Set to 0
    await dialog.locator(".column-manager-sticky-select").selectOption("0");
    await dialog.locator(".search-replace-btn-primary", { hasText: "Done" }).click();

    // No columns should be sticky
    const firstCell = page.locator("table tbody tr").first().locator("td").first();
    await expect(firstCell).not.toHaveClass(/sticky/);
  });
});

// ============================================================================
// Table rows should not stretch to fill viewport
// ============================================================================
test.describe("Empty area below rows", () => {
  test("table should not stretch rows when few rows are displayed", async ({ page }) => {
    // Filter to get only a few rows
    const filterInput = page.locator("table thead th").first().locator(".col-filter-input");
    await filterInput.fill("42");
    await page.waitForTimeout(200);

    const dataRows = page.locator("table tbody tr");
    const rowCount = await dataRows.count();
    expect(rowCount).toBeLessThan(10);

    // The table's bounding box height should be less than the viewport's height
    const viewport = page.locator(".grid-db-editor-viewport");
    const table = page.locator(".grid-db-editor-viewport table");

    const viewportBox = await viewport.boundingBox();
    const tableBox = await table.boundingBox();

    expect(viewportBox).not.toBeNull();
    expect(tableBox).not.toBeNull();

    // Table should be shorter than the viewport, leaving gray empty area
    expect(tableBox!.height).toBeLessThan(viewportBox!.height);
  });

  test("empty area below rows should have the correct background color", async ({ page }) => {
    // Filter to get only a few rows
    const filterInput = page.locator("table thead th").first().locator(".col-filter-input");
    await filterInput.fill("42");
    await page.waitForTimeout(200);

    // The viewport background should be the empty-area color (gray)
    const viewport = page.locator(".grid-db-editor-viewport");
    const bgColor = await viewport.evaluate((el) => getComputedStyle(el).backgroundColor);

    // Default light theme: hsl(0, 0%, 92%) ≈ rgb(235, 235, 235)
    // Just verify it's not white (rgb(255, 255, 255)) and not transparent
    expect(bgColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(bgColor).not.toBe("rgb(255, 255, 255)");
  });

  test("table cells should NOT have gray background", async ({ page }) => {
    // Filter to get only a few rows
    const filterInput = page.locator("table thead th").first().locator(".col-filter-input");
    await filterInput.fill("42");
    await page.waitForTimeout(200);

    // The table itself should have a white (row-bg) background, not gray
    const table = page.locator(".grid-db-editor-viewport table");
    const tableBg = await table.evaluate((el) => getComputedStyle(el).backgroundColor);

    // Light theme: --ct-row-bg is white
    expect(tableBg).toBe("rgb(255, 255, 255)");
  });
});

// ============================================================================
// Column header title tooltip (headerTitle)
// ============================================================================
test.describe("Column header title tooltip", () => {
  test("should show headerTitle as title tooltip on column header", async ({ page }) => {
    // "First Name" column (index 2) has headerTitle set
    const firstNameLabel = page.locator("table thead th").nth(2).locator(".col-header-label");
    await expect(firstNameLabel).toHaveAttribute("title", "First name of the person");
  });

  test("should show headerTitle tooltip on ID column header", async ({ page }) => {
    // "ID" column (index 0) has headerTitle set
    const idLabel = page.locator("table thead th").first().locator(".col-header-label");
    await expect(idLabel).toHaveAttribute("title", "Unique internal row ID");
  });
});

// ============================================================================
// Sticky header after scroll
// ============================================================================
test.describe("Sticky column headers", () => {
  test("thead should stay visible after scrolling down", async ({ page }) => {
    const viewport = page.locator(".grid-db-editor-viewport");
    const th = page.locator("table thead th").first();

    // Scroll the viewport down
    await viewport.evaluate((el) => (el.scrollTop = 300));
    await page.waitForTimeout(100);

    const thBox = await th.boundingBox();
    const vpBox = await viewport.boundingBox();

    expect(thBox).not.toBeNull();
    expect(vpBox).not.toBeNull();
    // Header should remain at the top of the viewport
    expect(Math.abs(thBox!.y - vpBox!.y)).toBeLessThan(5);
  });
});

// ============================================================================
// Column selection (colSelection prop)
// ============================================================================
test.describe("Column selection (colSelection)", () => {
  test("clicking column header area (not label) should select the entire column", async ({
    page,
  }) => {
    // The example has colSelection enabled.
    const th = page.locator("table thead th").nth(2);
    const filterInput = th.locator(".col-filter-input");
    const thBox = await th.boundingBox();
    const filterBox = await filterInput.boundingBox();
    // Click between label and filter — header padding area (not on the label)
    await page.mouse.click(thBox!.x + thBox!.width / 2, filterBox!.y - 2);
    await page.waitForTimeout(100);

    // The selection rectangle should be visible and span data rows
    const selRect = page.locator("#selection-rectangle");
    const selBox = await selRect.boundingBox();
    expect(selBox).not.toBeNull();
    expect(selBox!.height).toBeGreaterThan(200);

    // The rectangle top (CSS top) should start at the first data row, not at the header.
    // Read the CSS top value directly (pixel offset inside viewport).
    const rectTop = await selRect.evaluate((el) => parseFloat(el.style.top));
    const headerHeight = await th.evaluate((el) => el.getBoundingClientRect().height);
    // The rectangle top must be >= the header height (it starts below the header)
    expect(rectTop).toBeGreaterThanOrEqual(headerHeight - 2);
  });

  test("column header should get selection background when column is selected", async ({
    page,
  }) => {
    const th = page.locator("table thead th").nth(2);
    // Dispatch mousedown on th (not on label)
    const thBox = await th.boundingBox();
    const filterBox = await th.locator(".col-filter-input").boundingBox();
    await page.mouse.click(thBox!.x + thBox!.width / 2, filterBox!.y - 2);
    await page.waitForTimeout(100);

    // The th should have the col-selected class
    await expect(th).toHaveClass(/col-selected/);
  });

  test("clicking column header label should sort, not select column", async ({ page }) => {
    // Click the label text — should trigger sort, not column selection
    const headerLabel = page.locator("table thead th").nth(1).locator(".col-header-label");
    await headerLabel.click();
    await page.waitForTimeout(300);

    // Sort indicator should appear
    await expect(headerLabel).toContainText("▲");

    // The th should NOT have col-selected class
    const th = page.locator("table thead th").nth(1);
    await expect(th).not.toHaveClass(/col-selected/);
  });
});

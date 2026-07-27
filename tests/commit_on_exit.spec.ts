import { test, expect, Page, Locator } from "@playwright/test";

// ============================================================================
// Clicking into another cell instead of pressing Enter must commit the edit.
//
// The grid re-renders the source cell without an editor, so the <input> is
// unmounted without any focusout — React does not call onBlur on unmount. Before
// the fix in useInlineEdit the typed value was lost silently, with no write
// request at all.
// ============================================================================

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("table");
  await page.locator(".ct-pagination-select").selectOption("0");
});

/** Collects the example app's onUpdateRows console log — one entry per write. */
function trackUpdates(page: Page): string[] {
  const updates: string[] = [];
  page.on("console", (msg) => {
    if (msg.text().startsWith("onUpdateRows:")) updates.push(msg.text());
  });
  return updates;
}

async function getCellByHeader(page: Page, headerLabel: string, rowIdx: number) {
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

/** Open the inline editor of a cell via F2 (initialEditValue ""). */
async function openEditor(page: Page, cell: Locator) {
  await cell.click();
  await page.keyboard.press("F2");
  const input = cell.locator("input.cell-editor-input");
  await expect(input).toBeVisible();
  return input;
}

/** Type into one cell, then click a different one instead of pressing Enter. */
async function typeThenClickAway(page: Page, cell: Locator, text: string) {
  const input = await openEditor(page, cell);
  await input.fill(text);
  const other = await getCellByHeader(page, "Manager", 0);
  await other.click();
  await expect(cell.locator("input.cell-editor-input")).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// Commit on click-away, per editor type
// ---------------------------------------------------------------------------

test("String: typing then clicking another cell commits the value", async ({ page }) => {
  const updates = trackUpdates(page);
  const cell = await getCellByHeader(page, "First Name", 0);
  await typeThenClickAway(page, cell, "Zaphod");
  await expect(cell).toContainText("Zaphod");
  expect(updates).toHaveLength(1);
});

test("Number: typing then clicking another cell commits the value", async ({ page }) => {
  const updates = trackUpdates(page);
  const cell = await getCellByHeader(page, "Salary", 0);
  await typeThenClickAway(page, cell, "54321");
  await expect(cell).toContainText("54,321");
  expect(updates).toHaveLength(1);
});

test("Date: typing then clicking another cell commits the value", async ({ page }) => {
  const updates = trackUpdates(page);
  const cell = await getCellByHeader(page, "Hire Date", 0);
  await typeThenClickAway(page, cell, "2026-03-05");
  await expect(cell).toContainText("2026");
  await expect(cell).not.toContainText("2026-03-05"); // displayed formatted
  expect(updates).toHaveLength(1);
});

test("Time: typing then clicking another cell commits the value", async ({ page }) => {
  const updates = trackUpdates(page);
  const cell = await getCellByHeader(page, "Check-In", 0);
  await typeThenClickAway(page, cell, "14:35");
  await expect(cell).toContainText("35");
  expect(updates).toHaveLength(1);
});

test("Duration: typing then clicking another cell commits the value", async ({ page }) => {
  const updates = trackUpdates(page);
  const cell = await getCellByHeader(page, "Shift", 0);
  await typeThenClickAway(page, cell, "2h 30m");
  await expect(cell).toContainText("2h 30m");
  expect(updates).toHaveLength(1);
});

test("Color: typing then clicking another cell commits the normalized value", async ({
  page,
}) => {
  const updates = trackUpdates(page);
  const cell = await getCellByHeader(page, "Color", 0);
  await typeThenClickAway(page, cell, "#f00");
  await expect(cell).toContainText("#ff0000");
  expect(updates).toHaveLength(1);
});

test("Url: typing then clicking another cell commits the value", async ({ page }) => {
  const updates = trackUpdates(page);
  const cell = await getCellByHeader(page, "LinkedIn", 0);
  await typeThenClickAway(page, cell, "linkedin.com/in/zaphod");
  await expect(cell).toContainText("linkedin.com/in/zaphod");
  expect(updates).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// Escape still discards, per editor type
// ---------------------------------------------------------------------------

for (const [label, typed] of [
  ["First Name", "Zaphod"],
  ["Salary", "54321"],
  ["Hire Date", "2026-03-05"],
  ["Check-In", "14:35"],
  ["Shift", "2h 30m"],
  ["Color", "#f00"],
] as const) {
  test(`${label}: Escape discards the edit and writes nothing`, async ({ page }) => {
    const updates = trackUpdates(page);
    const cell = await getCellByHeader(page, label, 0);
    const before = (await cell.innerText()).trim();
    const input = await openEditor(page, cell);
    await input.fill(typed);
    await page.keyboard.press("Escape");
    const other = await getCellByHeader(page, "Manager", 0);
    await other.click();
    await expect(cell.locator("input.cell-editor-input")).toHaveCount(0);
    expect((await cell.innerText()).trim()).toBe(before);
    expect(updates).toHaveLength(0);
  });
}

// ---------------------------------------------------------------------------
// No write without a change: merely visiting a cell must stay silent, even for
// editors whose display format does not round-trip through their parser.
// ---------------------------------------------------------------------------

for (const label of [
  "First Name",
  "Salary",
  "Hire Date",
  "Check-In",
  "Shift",
  "Color",
  "Phone",
] as const) {
  test(`${label}: opening the editor and clicking away writes nothing`, async ({ page }) => {
    const updates = trackUpdates(page);
    const cell = await getCellByHeader(page, label, 0);
    const before = (await cell.innerText()).trim();
    await openEditor(page, cell);
    const other = await getCellByHeader(page, "Manager", 0);
    await other.click();
    await expect(cell.locator("input.cell-editor-input")).toHaveCount(0);
    expect((await cell.innerText()).trim()).toBe(before);
    expect(updates).toHaveLength(0);
  });
}

// ---------------------------------------------------------------------------
// Half-typed input on the implicit path is discarded rather than persisted —
// the parsers fall back to the raw text, which would end up in the backend.
// ---------------------------------------------------------------------------

for (const [label, halfTyped] of [
  ["Hire Date", "27.0"],
  ["Check-In", "14:"],
  ["Shift", "2h 3"],
  ["Color", "#ff00"],
] as const) {
  test(`${label}: half-typed input is discarded on click-away`, async ({ page }) => {
    const updates = trackUpdates(page);
    const cell = await getCellByHeader(page, label, 0);
    const before = (await cell.innerText()).trim();
    const input = await openEditor(page, cell);
    await input.fill(halfTyped);
    const other = await getCellByHeader(page, "Manager", 0);
    await other.click();
    await expect(cell.locator("input.cell-editor-input")).toHaveCount(0);
    expect((await cell.innerText()).trim()).toBe(before);
    expect(updates).toHaveLength(0);
  });
}

// ---------------------------------------------------------------------------
// Enter must still commit exactly once — the exit transition may not add a
// second write on top of it.
// ---------------------------------------------------------------------------

test("Enter commits exactly once, no extra write from leaving edit mode", async ({
  page,
}) => {
  const updates = trackUpdates(page);
  const cell = await getCellByHeader(page, "First Name", 0);
  const input = await openEditor(page, cell);
  await input.fill("Zaphod");
  await page.keyboard.press("Enter");
  await expect(cell).toContainText("Zaphod");
  const other = await getCellByHeader(page, "Manager", 0);
  await other.click();
  expect(updates).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// Clicking inside the editor's own dropdown is not "leaving the cell".
// ---------------------------------------------------------------------------

test("Combobox: clicking an option commits the option, not the filter text", async ({
  page,
}) => {
  const updates = trackUpdates(page);
  const cell = await getCellByHeader(page, "Department", 0);
  await cell.click();
  await page.keyboard.press("F2");
  const input = cell.locator(".combo-dropdown-input");
  await expect(input).toBeVisible();
  await input.fill("Fin");
  await cell.locator(".combo-dropdown-option", { hasText: "Finance" }).first().click();
  await expect(cell).toContainText("Finance");
  expect(updates).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// The dialog owns the value while it is open — the inline buffer must not be
// committed on top of it when the dialog closes.
// ---------------------------------------------------------------------------

test("TextareaDialog: inline edit, open dialog, Save keeps the dialog value", async ({
  page,
}) => {
  const cell = await getCellByHeader(page, "Description", 0);
  const input = await openEditor(page, cell);
  await input.fill("inline text");
  await cell.locator(".cell-popup-indicator").click();
  const dialogInput = page.locator(".editor-dialog-input");
  await expect(dialogInput).toBeVisible();
  await dialogInput.fill("dialog text");
  await page.locator(".editor-dialog-btn-save").click();
  await expect(page.locator(".editor-dialog")).toHaveCount(0);
  await expect(cell).toContainText("dialog text");
});

test("TextareaDialog: inline edit, open dialog, Cancel discards the edit", async ({
  page,
}) => {
  const cell = await getCellByHeader(page, "Description", 0);
  const before = (await cell.innerText()).trim();
  const input = await openEditor(page, cell);
  await input.fill("inline text");
  await cell.locator(".cell-popup-indicator").click();
  const dialogInput = page.locator(".editor-dialog-input");
  await expect(dialogInput).toBeVisible();
  await dialogInput.fill("dialog text");
  await page.locator(".editor-dialog-btn-cancel").click();
  await expect(page.locator(".editor-dialog")).toHaveCount(0);
  expect((await cell.innerText()).trim()).toBe(before);
});

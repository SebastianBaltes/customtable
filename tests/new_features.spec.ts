import { test, expect } from "@playwright/test";

test.describe("New Features and Bug Fixes", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto("http://localhost:5173/");
  });

  test("Phone column should apply mask in display mode", async ({ page }) => {
    // Phone is col-idx 13
    const phoneCell = page.locator('td[data-col-idx="13"]').first();
    const text = await phoneCell.innerText();
    // Mask: +## ### ########
    expect(text).toMatch(/\+\d{2} \d{3} \d+/);
  });

  test("Duration should use friendly format for editing", async ({ page }) => {
    const durationCell = page.locator('td.col-type-Duration').first();
    const initialText = (await durationCell.innerText()).trim();
    expect(initialText).toMatch(/\d+h \d+m/);

    // Check edit mode
    await durationCell.click();
    await page.keyboard.press("F2");
    const input = page.locator('.cell-editor-input');
    // It should NOT be ISO PT... but friendly 7h 30m
    expect(await input.inputValue()).toBe(initialText);
  });

  test("Url type should show link icon", async ({ page }) => {
    const urlCell = page.locator('td.col-type-Url').filter({ hasText: 'http' }).first();
    await expect(urlCell.locator('.cell-editor-picker-btn')).toBeVisible();
  });

  test("Picker icons should be visible in display mode", async ({ page }) => {
    const dateCell = page.locator('td.col-type-Date').first();
    await expect(dateCell.locator('.cell-editor-picker-btn')).toBeVisible();

    const timeCell = page.locator('td.col-type-Time').first();
    await expect(timeCell.locator('.cell-editor-picker-btn')).toBeVisible();
  });
});

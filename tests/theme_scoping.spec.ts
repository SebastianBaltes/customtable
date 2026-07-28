import { test, expect, Page } from "@playwright/test";

/**
 * Runs against src/examples/scoped-theme.html, which loads themes/light.css
 * globally on :root (the pre-1.4 consumer setup) plus a few scoped theme files,
 * and switches by writing `data-ct-theme` on <html>.
 *
 * Two things are proven here:
 *
 *  - the scoped theme reaches elements rendered through createPortal into
 *    document.body (dialogs, context menu) — a class on the grid root could
 *    not do that, which is why the shipped mechanism is an attribute on the
 *    document root;
 *  - the six custom properties that no theme used to declare
 *    (--ct-hover-bg, --ct-resize-handle, --ct-status-*) no longer fall back to
 *    their light literals in a dark theme.
 */

const PAGE = "/scoped-theme.html";

/** The light literals base.css used to fall back to. */
const LIGHT_FALLBACK = {
  hoverBg: "rgb(240, 240, 240)", // #f0f0f0
  resizeHandle: "rgb(66, 133, 244)", // #4285f4
  statusInfo: "rgb(21, 101, 192)", // #1565c0
};

function srgbLuminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

async function open(page: Page, theme: string) {
  await page.goto(PAGE);
  await page.locator(".grid-db-editor td.cell").first().waitFor();
  if (theme) {
    await page.selectOption('[data-testid="scoped-theme-select"]', theme);
    await expect(page.locator("html")).toHaveAttribute("data-ct-theme", theme);
  }
  await page.addStyleTag({
    content: `*, *::before, *::after { transition: none !important; animation: none !important; }`,
  });
}

async function bgOf(page: Page, selector: string): Promise<string> {
  return page.evaluate(
    (s) => getComputedStyle(document.querySelector(s)!).backgroundColor,
    selector,
  );
}

async function openSearchReplace(page: Page) {
  await page.locator(".grid-db-editor td.cell").first().click();
  await page.keyboard.press("Control+h");
  await page.locator(".search-replace-dialog").waitFor();
}

test.describe("Scoped themes", () => {
  test("no attribute → the globally imported light theme still applies", async ({ page }) => {
    await open(page, "");
    // Regression bar for consumers that only ever import style.css + light.css:
    // linking the scoped files must not change anything until the attribute is
    // set. (The full per-theme pin lives in theme_regression.spec.ts.)
    expect(await bgOf(page, ".grid-db-editor")).toBe("rgb(255, 255, 255)");
    expect(srgbLuminance(await bgOf(page, ".grid-db-editor .col-header"))).toBeGreaterThan(0.7);

    await openSearchReplace(page);
    const btn = page.locator(".search-replace-btn").last();
    await btn.hover();
    // The value base.css used to hard-code as a fallback is now a real
    // declaration in light.css, and it resolves to exactly the same colour.
    expect(await bgOf(page, ".search-replace-btn:not(.search-replace-btn-primary)")).toBe(
      LIGHT_FALLBACK.hoverBg,
    );
  });

  test("data-ct-theme=dark reaches portalled dialogs", async ({ page }) => {
    await open(page, "dark");

    // The grid itself.
    const gridBg = await bgOf(page, ".grid-db-editor");
    expect(srgbLuminance(gridBg)).toBeLessThan(0.05);

    // The search & replace dialog is a portal into document.body — outside the
    // grid element entirely.
    await openSearchReplace(page);
    const dialogBg = await bgOf(page, ".search-replace-dialog");
    expect(srgbLuminance(dialogBg), `dialog background ${dialogBg} should be dark`).toBeLessThan(
      0.1,
    );
  });

  test("--ct-hover-bg no longer falls back to #f0f0f0 in a dark theme", async ({ page }) => {
    await open(page, "dark");
    await openSearchReplace(page);

    const btn = page.locator(".search-replace-btn").last();
    await btn.hover();
    const hovered = await bgOf(page, ".search-replace-btn:not(.search-replace-btn-primary)");

    expect(hovered).not.toBe(LIGHT_FALLBACK.hoverBg);
    expect(
      srgbLuminance(hovered),
      `search-replace-btn:hover background ${hovered} should be dark`,
    ).toBeLessThan(0.1);
  });

  test("--ct-hover-bg applies to the column manager rows too", async ({ page }) => {
    await open(page, "dark");
    await page.locator('[data-testid="open-column-manager"]').click();
    await page.locator(".column-manager-item").first().waitFor();

    const item = page.locator(".column-manager-item").first();
    await item.hover();
    const hovered = await bgOf(page, ".column-manager-item");

    expect(hovered).not.toBe(LIGHT_FALLBACK.hoverBg);
    expect(
      srgbLuminance(hovered),
      `column-manager-item:hover background ${hovered} should be dark`,
    ).toBeLessThan(0.1);
  });

  test("--ct-status-info and --ct-resize-handle are theme-provided, not literals", async ({
    page,
  }) => {
    await open(page, "dark");

    const resolved = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return {
        resizeHandle: cs.getPropertyValue("--ct-resize-handle").trim(),
        statusInfo: cs.getPropertyValue("--ct-status-info").trim(),
        statusOk: cs.getPropertyValue("--ct-status-ok").trim(),
        statusWarning: cs.getPropertyValue("--ct-status-warning").trim(),
        statusError: cs.getPropertyValue("--ct-status-error").trim(),
        hoverBg: cs.getPropertyValue("--ct-hover-bg").trim(),
      };
    });
    for (const [name, value] of Object.entries(resolved)) {
      expect(value, `--ct-${name} must be declared by the dark theme`).not.toBe("");
    }

    // The primary dialog button paints --ct-status-info directly, and it lives
    // in a portal.
    await openSearchReplace(page);
    const primaryBg = await bgOf(page, ".search-replace-btn-primary");
    expect(primaryBg).not.toBe(LIGHT_FALLBACK.statusInfo);
  });

  test("switching themes is a single attribute write", async ({ page }) => {
    // A fingerprint rather than one colour: "numbers" is a light theme too, so
    // the page background alone does not distinguish it from the default.
    const fingerprint = () =>
      page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        return [
          "--ct-bg",
          "--ct-header-bg",
          "--ct-selected-outline",
          "--ct-hover-bg",
          "--ct-status-info",
        ]
          .map((v) => cs.getPropertyValue(v).trim())
          .join(" | ");
      });

    await open(page, "");
    const light = await fingerprint();

    await page.selectOption('[data-testid="scoped-theme-select"]', "dark");
    const dark = await fingerprint();

    await page.selectOption('[data-testid="scoped-theme-select"]', "numbers");
    const numbers = await fingerprint();

    await page.selectOption('[data-testid="scoped-theme-select"]', "");
    const backToLight = await fingerprint();

    expect(new Set([light, dark, numbers]).size).toBe(3);
    expect(backToLight).toBe(light);
  });
});

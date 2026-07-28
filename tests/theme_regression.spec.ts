import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Computed-style regression bar for the theme layer.
 *
 * The demo loads `core/base.css` + `themes/light.css` (see examples/styles.css)
 * and then injects the selected theme as a global `<style>` override — i.e.
 * exactly the setup a consumer gets from `style.css` + `themes/<x>.css`.
 *
 * This spec pins the rendered result of that setup for all eight shipped
 * themes. Refactors of where a rule lives (base.css vs. light.css) must not
 * move a single computed value. Regenerate deliberately with:
 *
 *   UPDATE_THEME_BASELINE=1 npx playwright test theme_regression --project=chromium
 */

const THEMES = [
  "light",
  "dark",
  "excel",
  "sheets",
  "material",
  "material3",
  "numbers",
  "high-contrast",
];

type Probe = { name: string; selector: string; props: string[] };

const BOX = ["background-color", "color", "border-top-color", "border-bottom-color", "outline-color"];

const PROBES: Probe[] = [
  { name: "grid-root", selector: ".grid-db-editor", props: [...BOX, "font-family"] },
  { name: "toolbar", selector: ".grid-db-editor-toolbar", props: BOX },
  { name: "toolbar-button", selector: ".grid-db-editor .toolbar-button", props: BOX },
  { name: "toolbar-input", selector: ".grid-db-editor .toolbar-input", props: BOX },
  { name: "viewport", selector: ".grid-db-editor-viewport", props: [...BOX, "scrollbar-color"] },
  { name: "col-header", selector: ".grid-db-editor .col-header", props: BOX },
  { name: "col-header-label", selector: ".grid-db-editor .col-header-label", props: ["color"] },
  { name: "cell", selector: ".grid-db-editor td.cell", props: BOX },
  { name: "cell-sticky", selector: ".grid-db-editor tbody td.sticky", props: BOX },
  { name: "pagination", selector: ".ct-pagination", props: ["font-family"] },
  { name: "pagination-page", selector: ".ct-pagination-page", props: [...BOX, "border-left-color"] },
  { name: "pagination-label", selector: ".ct-pagination-label", props: ["color"] },
  { name: "pagination-select", selector: ".ct-pagination-select", props: BOX },
];

const BASELINE_FILE = path.join(__dirname, "theme-baseline.json");
const UPDATE = process.env.UPDATE_THEME_BASELINE === "1";

type Snapshot = Record<string, Record<string, string | null>>;

const collected: Record<string, Snapshot> = {};

test.describe("Theme computed-style regression", () => {
  // The baseline is captured in one browser on purpose: it pins CSS cascade
  // behaviour, not per-engine colour serialisation.
  test.skip(({ browserName }) => browserName !== "chromium", "baseline is chromium-pinned");

  for (const theme of THEMES) {
    test(`theme "${theme}" renders the pinned computed styles`, async ({ page }) => {
      await page.addInitScript((t) => {
        localStorage.setItem("ct-theme", JSON.stringify(t));
      }, theme);
      await page.goto("/");
      await page.locator(".grid-db-editor td.cell").first().waitFor();

      // The demo animates background/colour changes when a theme is applied.
      // Sampling mid-transition yields interpolated values and makes this spec
      // flaky, so snap every animation to its end state first.
      await page.addStyleTag({
        content: `*, *::before, *::after {
          transition: none !important;
          animation: none !important;
        }`,
      });
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );

      const snapshot: Snapshot = await page.evaluate((probes) => {
        const out: Record<string, Record<string, string | null>> = {};
        for (const probe of probes) {
          const el = document.querySelector(probe.selector);
          const entry: Record<string, string | null> = {};
          if (!el) {
            entry["__missing__"] = "true";
          } else {
            const cs = getComputedStyle(el);
            for (const prop of probe.props) entry[prop] = cs.getPropertyValue(prop).trim();
          }
          out[probe.name] = entry;
        }
        return out;
      }, PROBES);

      // Every probe must resolve — a silently missing element would make the
      // baseline pass vacuously.
      const missing = Object.entries(snapshot)
        .filter(([, entry]) => entry["__missing__"])
        .map(([name]) => name);
      expect(missing, `probes matched no element: ${missing.join(", ")}`).toEqual([]);

      collected[theme] = snapshot;

      if (!UPDATE) {
        const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"));
        expect(baseline[theme], `no baseline for theme "${theme}"`).toBeDefined();
        expect(snapshot).toEqual(baseline[theme]);
      }
    });
  }

  test.afterAll(() => {
    if (!UPDATE) return;
    const merged = fs.existsSync(BASELINE_FILE)
      ? JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"))
      : {};
    Object.assign(merged, collected);
    const ordered: Record<string, Snapshot> = {};
    for (const t of THEMES) if (merged[t]) ordered[t] = merged[t];
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(ordered, null, 2) + "\n");
  });
});

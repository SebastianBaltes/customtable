/**
 * Invariants of the theme layer. These are the three gaps this contract exists
 * to prevent from reopening:
 *
 *  1. base.css must not reference a custom property that no stylesheet
 *     declares — those silently resolved to a hard-coded light literal and
 *     showed up as bright patches in dark themes.
 *  2. Every shipped theme must be usable on its own (style.css + theme.css).
 *     That holds because base.css carries the full default set and the apply
 *     layer; this test pins the default set against themes/light.css.
 *  3. themes/scoped/* must stay in sync with their sources.
 */

const fs = require("fs");
const path = require("path");

const { scopeThemeCss, THEMES_DIR, SCOPED_DIR } = require("../../scripts/generate-scoped-themes.cjs");

const BASE_CSS_PATH = path.join(__dirname, "base.css");
const baseCss = fs.readFileSync(BASE_CSS_PATH, "utf8");

const themeFiles = fs
  .readdirSync(THEMES_DIR)
  .filter((f) => f.endsWith(".css"))
  .sort();

/** Declarations of the first `:root { ... }` block, as a name -> value map. */
function rootDeclarations(css) {
  const block = css.match(/^:root \{\n([\s\S]*?)\n\}\n/m);
  if (!block) return null;
  const out = {};
  for (const m of block[1].matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]*);/gm)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

/** Every custom property read via var() in a stylesheet. */
function referencedVars(css) {
  return new Set([...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]));
}

/**
 * Declared by a theme but read by nothing. Keep empty: a property that nothing
 * reads is either a typo or dead weight, and the orphan assertion below is the
 * place where that gets caught. The one historical entry,
 * --ct-selection-blend (dark.css set it to `screen` with a comment claiming
 * base/light read it — they never did), was removed instead of allowlisted.
 */
const KNOWN_DEAD = [];

describe("theme contract", () => {
  const baseDefaults = rootDeclarations(baseCss);

  it("base.css declares a default for every custom property it reads", () => {
    expect(baseDefaults).not.toBeNull();
    const undeclared = [...referencedVars(baseCss)]
      .filter((v) => !(v in baseDefaults))
      .sort();
    expect(undeclared).toEqual([]);
  });

  it("base.css defaults and themes/light.css agree exactly", () => {
    const light = rootDeclarations(fs.readFileSync(path.join(THEMES_DIR, "light.css"), "utf8"));
    expect(light).toEqual(baseDefaults);
  });

  /**
   * The whole point of --ct-status-info-solid is that a theme which predates it
   * — or any third-party theme that only ever heard of --ct-status-info — keeps
   * painting the filled primary button in its own accent. That only holds while
   * the default is a var() reference; replacing it with a literal would make
   * base.css win over such a theme and silently repaint the button.
   */
  it("--ct-status-info-solid falls back to --ct-status-info", () => {
    expect(baseDefaults["--ct-status-info-solid"]).toBe("var(--ct-status-info, #1565c0)");
  });

  /**
   * dark.css is the only shipped theme with dark surfaces, so it is the only one
   * that has to override base.css's light-tuned cell-meta colours. Each pair
   * missing here is a light patch on a dark grid: --ct-cell-stale-* was absent
   * and stale cells stayed light yellow until this assertion was added.
   */
  it("dark.css overrides every light-tuned cell-meta colour", () => {
    const dark = rootDeclarations(fs.readFileSync(path.join(THEMES_DIR, "dark.css"), "utf8"));
    expect(dark).not.toBeNull();
    for (const v of [
      "--ct-cell-error-bg",
      "--ct-cell-error-text",
      "--ct-cell-stale-bg",
      "--ct-cell-stale-text",
      "--ct-row-readonly-bg",
      "--ct-row-readonly-text",
    ]) {
      expect(Object.keys(dark)).toContain(v);
    }
  });

  it("ships eight themes", () => {
    expect(themeFiles.length).toBe(8);
  });

  describe.each(themeFiles)("%s", (file) => {
    const id = path.basename(file, ".css");
    const css = fs.readFileSync(path.join(THEMES_DIR, file), "utf8");

    it("declares the status and interaction accents", () => {
      const decls = rootDeclarations(css);
      expect(decls).not.toBeNull();
      for (const v of [
        "--ct-hover-bg",
        "--ct-resize-handle",
        "--ct-status-ok",
        "--ct-status-info",
        "--ct-status-warning",
        "--ct-status-error",
      ]) {
        expect(Object.keys(decls)).toContain(v);
      }
    });

    it("only declares properties base.css knows about", () => {
      // Guards against a theme setting a property that nothing reads (typo) —
      // --ct-* names used solely by a theme's own rules are allowed.
      const decls = Object.keys(rootDeclarations(css));
      const known = new Set(Object.keys(baseDefaults));
      const themeOwn = referencedVars(css);
      const orphans = decls
        .filter((d) => !known.has(d) && !themeOwn.has(d) && !KNOWN_DEAD.includes(d))
        .sort();
      expect(orphans).toEqual([]);
    });

    it("has an up-to-date scoped variant", () => {
      const scopedPath = path.join(SCOPED_DIR, file);
      expect(fs.existsSync(scopedPath)).toBe(true);
      const actual = fs.readFileSync(scopedPath, "utf8");
      expect(actual).toBe(scopeThemeCss(css, id, file));
    });

    it("scoped variant does not leak a bare :root selector", () => {
      const scoped = fs.readFileSync(path.join(SCOPED_DIR, file), "utf8");
      expect(scoped).not.toMatch(/^\s*:root\s*[,{]/m);
      expect(scoped).toContain(`:root[data-ct-theme="${id}"]`);
    });
  });

  it("has no scoped file without a source theme", () => {
    const scoped = fs
      .readdirSync(SCOPED_DIR)
      .filter((f) => f.endsWith(".css"))
      .sort();
    expect(scoped).toEqual(themeFiles);
  });
});

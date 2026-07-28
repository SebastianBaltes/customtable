/**
 * Generates the attribute-scoped variants of the shipped themes.
 *
 * A plain theme file declares its custom properties on `:root`, which makes it
 * a page-wide switch: you cannot load two of them and pick one at runtime
 * without stringifying and re-injecting CSS by hand. The scoped variant moves
 * the exact same declarations behind `[data-ct-theme="<id>"]`, so a consumer
 * can link every theme it needs and switch by flipping one attribute.
 *
 * Why an attribute on the document root rather than a class on the grid:
 * SearchReplaceDialog, ColumnManagerDialog, TextareaDialogEditor and
 * ContextMenu all render through `createPortal(..., document.body)`. A class on
 * the grid element cannot reach them, and those portals are exactly where the
 * themable dialog/menu styling lives.
 *
 * Run:  node scripts/generate-scoped-themes.cjs
 * The result is committed; src/core/themeContract.test.js fails on drift.
 */

const fs = require("fs");
const path = require("path");

const THEMES_DIR = path.join(__dirname, "..", "src", "examples", "themes");
const SCOPED_DIR = path.join(THEMES_DIR, "scoped");

const BANNER =
  "/*\n" +
  " * GENERATED FILE — do not edit.\n" +
  " * Source: ../%SOURCE%\n" +
  " * Regenerate: node scripts/generate-scoped-themes.cjs\n" +
  " *\n" +
  " * Same declarations as the source theme, scoped to [data-ct-theme=\"%ID%\"]\n" +
  " * instead of :root. Put the attribute on <html> (or <body>) to activate:\n" +
  " *\n" +
  " *   document.documentElement.dataset.ctTheme = \"%ID%\";\n" +
  " *\n" +
  " * The selector is more specific than :root, so this wins over a globally\n" +
  " * imported theme regardless of stylesheet order.\n" +
  " */\n\n";

function indent(block) {
  return block
    .split("\n")
    .map((line) => (line.trim() === "" ? "" : "  " + line))
    .join("\n");
}

/**
 * @param {string} css   contents of a theme file
 * @param {string} id    theme id, e.g. "dark"
 * @param {string} name  source file name, for the banner
 */
function scopeThemeCss(css, id, name = `${id}.css`) {
  const rootMatches = css.match(/:root/g) || [];
  if (rootMatches.length !== 1) {
    throw new Error(
      `${name}: expected exactly one ":root" selector, found ${rootMatches.length}. ` +
        `The scoping transform cannot be applied safely.`,
    );
  }

  const block = css.match(/^:root \{\n([\s\S]*?)\n\}\n/m);
  if (!block) throw new Error(`${name}: could not locate the ":root { ... }" block`);

  const decls = block[1];
  const before = css.slice(0, block.index).trim();
  const after = css.slice(block.index + block[0].length).trim();

  // A theme's own rule blocks (scrollbars, Material elevation, ...) become
  // descendants of the scope, which is what we want: they must only apply
  // while the theme is active.
  const rest = [before, after].filter(Boolean).join("\n\n");

  const banner = BANNER.replace(/%ID%/g, id).replace("%SOURCE%", name);
  const selector = `:root[data-ct-theme="${id}"],\nbody[data-ct-theme="${id}"]`;

  let body = indent(decls);
  if (rest) body += "\n\n" + indent(rest);

  return `${banner}${selector} {\n${body}\n}\n`;
}

function main() {
  fs.mkdirSync(SCOPED_DIR, { recursive: true });

  const sources = fs
    .readdirSync(THEMES_DIR)
    .filter((f) => f.endsWith(".css"))
    .sort();

  // Drop scoped files whose source theme disappeared.
  for (const stale of fs.readdirSync(SCOPED_DIR).filter((f) => f.endsWith(".css"))) {
    if (!sources.includes(stale)) fs.unlinkSync(path.join(SCOPED_DIR, stale));
  }

  for (const file of sources) {
    const id = path.basename(file, ".css");
    const css = fs.readFileSync(path.join(THEMES_DIR, file), "utf8");
    fs.writeFileSync(path.join(SCOPED_DIR, file), scopeThemeCss(css, id, file));
    console.log(`  themes/scoped/${file}`);
  }
  console.log(`${sources.length} scoped theme(s) generated`);
}

module.exports = { scopeThemeCss, THEMES_DIR, SCOPED_DIR };

if (require.main === module) main();

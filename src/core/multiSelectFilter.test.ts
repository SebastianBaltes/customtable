/**
 * Unit tests for the filter matching logic in GridDbEditor.
 *
 * Filter value encoding:
 * - "\x00val1\nval2" → multi-select exact match (prefix \x00)
 * - "searchText"     → plain substring match
 * - "\x01empty\x01"  → sentinel for the empty-string value (inside multi-select)
 */

const MULTI_SELECT_PREFIX = "\x00";
const EMPTY_SENTINEL = "\x01empty\x01";

/** Reproduce the filter predicate from GridDbEditor */
function matchesFilter(filterVal: string, cellVal: unknown): boolean {
  // Multi-select filter: \x00 prefix + newline-separated exact match
  if (filterVal.startsWith(MULTI_SELECT_PREFIX)) {
    const selectedVals = filterVal
      .slice(1)
      .split("\n")
      .filter(Boolean)
      .map((v) => (v === EMPTY_SENTINEL ? "" : v));

    if (cellVal == null || cellVal === "") {
      return selectedVals.includes("");
    }
    if (Array.isArray(cellVal)) {
      return (cellVal as unknown[]).some((v) => selectedVals.includes(String(v)));
    }
    return selectedVals.includes(String(cellVal));
  }

  // Substring match (text filter)
  if (cellVal == null) return false;
  if (Array.isArray(cellVal)) {
    return (cellVal as unknown[]).some((v) =>
      String(v).toLowerCase().includes(filterVal.toLowerCase()),
    );
  }
  return String(cellVal).toLowerCase().includes(filterVal.toLowerCase());
}

// ---------------------------------------------------------------------------

describe("multiSelectFilter – checkbox mode (prefixed)", () => {
  test("matches selected value", () => {
    expect(matchesFilter("\x00HR", "HR")).toBe(true);
  });

  test("does not match unselected value", () => {
    expect(matchesFilter("\x00HR", "IT")).toBe(false);
  });

  test("match is exact, not substring", () => {
    expect(matchesFilter("\x00HR", "HR Manager")).toBe(false);
  });

  test("null cell value does not match non-empty selection", () => {
    expect(matchesFilter("\x00HR", null)).toBe(false);
  });

  test("matches any of multiple selected values", () => {
    expect(matchesFilter("\x00HR\nIT", "HR")).toBe(true);
    expect(matchesFilter("\x00HR\nIT", "IT")).toBe(true);
    expect(matchesFilter("\x00HR\nIT", "Sales")).toBe(false);
  });
});

describe("multiSelectFilter – empty-string sentinel", () => {
  test("sentinel matches null cell value", () => {
    expect(matchesFilter(`\x00${EMPTY_SENTINEL}`, null)).toBe(true);
  });

  test("sentinel matches empty-string cell value", () => {
    expect(matchesFilter(`\x00${EMPTY_SENTINEL}`, "")).toBe(true);
  });

  test("sentinel combined with other values", () => {
    const filter = `\x00HR\n${EMPTY_SENTINEL}`;
    expect(matchesFilter(filter, "HR")).toBe(true);
    expect(matchesFilter(filter, null)).toBe(true);
    expect(matchesFilter(filter, "")).toBe(true);
    expect(matchesFilter(filter, "IT")).toBe(false);
  });
});

describe("multiSelectFilter – array cell values (MultiCombobox)", () => {
  test("matches when any array element is in selected set", () => {
    expect(matchesFilter("\x00HR\nIT", ["IT", "Sales"])).toBe(true);
  });

  test("does not match when no element matches", () => {
    expect(matchesFilter("\x00HR", ["IT", "Sales"])).toBe(false);
  });
});

describe("text filter – substring match (no prefix)", () => {
  test("substring match", () => {
    expect(matchesFilter("HR", "HR Manager")).toBe(true);
    expect(matchesFilter("manager", "HR Manager")).toBe(true);
  });

  test("case-insensitive", () => {
    expect(matchesFilter("hr", "HR")).toBe(true);
  });

  test("null returns false", () => {
    expect(matchesFilter("HR", null)).toBe(false);
  });

  test("array: substring on any element", () => {
    expect(matchesFilter("HR", ["IT", "HR Manager"])).toBe(true);
    expect(matchesFilter("Sales", ["IT", "HR"])).toBe(false);
  });

  test("typing 'Sa' matches 'Sales'", () => {
    expect(matchesFilter("Sa", "Sales")).toBe(true);
  });
});

/**
 * Unit tests for the ComboboxFilter's encoding and filter logic.
 *
 * Encoding:
 * - Checkbox selections: "\x00val1\nval2" (multi-select prefix + newline-separated)
 * - Text search: "searchText" (plain string, no prefix)
 * - Empty strings use the sentinel "\x01empty\x01"
 */

const MULTI_SELECT_PREFIX = "\x00";
const EMPTY_SENTINEL = "\x01empty\x01";

const encodeOption = (opt: string) => (opt === "" ? EMPTY_SENTINEL : opt);

const encodeSelected = (sel: string[]): string =>
  sel.length > 0 ? MULTI_SELECT_PREFIX + sel.join("\n") : "";

/** Parse a filter value back into { selected[], isMulti }. */
function parseFilterValue(value: string): { selected: string[]; isMulti: boolean } {
  if (!value) return { selected: [], isMulti: false };
  if (value.startsWith(MULTI_SELECT_PREFIX)) {
    return {
      selected: value
        .slice(MULTI_SELECT_PREFIX.length)
        .split("\n")
        .filter(Boolean),
      isMulti: true,
    };
  }
  return { selected: [], isMulti: false };
}

/** Reproduce the toggle logic from ComboboxFilter */
function toggle(currentValue: string, opt: string): string {
  const { selected } = parseFilterValue(currentValue);
  const encoded = encodeOption(opt);
  const next = selected.includes(encoded)
    ? selected.filter((s) => s !== encoded)
    : [...selected, encoded];
  return encodeSelected(next);
}

/** Reproduce the option search filter */
function searchFilter(options: string[], text: string): string[] {
  if (!text) return options;
  const lower = text.toLowerCase();
  return options.filter((o) => {
    const display = o === "" ? "(leer)" : o;
    return display.toLowerCase().includes(lower);
  });
}

// ---------------------------------------------------------------------------

describe("ComboboxFilter – encoding", () => {
  test("single checkbox produces prefixed value", () => {
    expect(encodeSelected(["HR"])).toBe("\x00HR");
  });

  test("multiple checkboxes produce prefixed newline-separated value", () => {
    expect(encodeSelected(["HR", "IT"])).toBe("\x00HR\nIT");
  });

  test("empty selection produces empty string", () => {
    expect(encodeSelected([])).toBe("");
  });

  test("empty-string option uses sentinel", () => {
    expect(encodeSelected([EMPTY_SENTINEL])).toBe("\x00\x01empty\x01");
  });

  test("plain text (no prefix) is text-mode filter", () => {
    const parsed = parseFilterValue("HR");
    expect(parsed.isMulti).toBe(false);
    expect(parsed.selected).toEqual([]);
  });

  test("prefixed value is multi-select filter", () => {
    const parsed = parseFilterValue("\x00HR\nIT");
    expect(parsed.isMulti).toBe(true);
    expect(parsed.selected).toEqual(["HR", "IT"]);
  });

  test("empty string parses as no filter", () => {
    const parsed = parseFilterValue("");
    expect(parsed.isMulti).toBe(false);
    expect(parsed.selected).toEqual([]);
  });
});

describe("ComboboxFilter – toggle behaviour", () => {
  test("selecting first option switches from text to multi-select mode", () => {
    const result = toggle("", "HR");
    expect(result).toBe("\x00HR");
    expect(parseFilterValue(result).isMulti).toBe(true);
  });

  test("selecting a second option appends it", () => {
    const result = toggle("\x00HR", "IT");
    const { selected } = parseFilterValue(result);
    expect(selected).toContain("HR");
    expect(selected).toContain("IT");
  });

  test("deselecting an option removes it", () => {
    const result = toggle("\x00HR\nIT", "HR");
    const { selected } = parseFilterValue(result);
    expect(selected).toEqual(["IT"]);
  });

  test("deselecting the last option produces empty string", () => {
    const result = toggle("\x00HR", "HR");
    expect(result).toBe("");
  });

  test("selecting empty-string value uses sentinel", () => {
    const result = toggle("", "");
    expect(result).toBe("\x00\x01empty\x01");
  });

  test("deselecting empty-string value removes sentinel", () => {
    const result = toggle("\x00\x01empty\x01", "");
    expect(result).toBe("");
  });
});

describe("ComboboxFilter – search filter", () => {
  const options = ["HR", "IT", "Sales", "Marketing", ""];

  test("empty search returns all options", () => {
    expect(searchFilter(options, "")).toEqual(options);
  });

  test("case-insensitive match", () => {
    expect(searchFilter(options, "hr")).toEqual(["HR"]);
  });

  test("partial match", () => {
    expect(searchFilter(options, "ar")).toEqual(["Marketing"]);
  });

  test("empty-string option matches '(leer)' label", () => {
    expect(searchFilter(options, "leer")).toContain("");
  });

  test("no match returns empty array", () => {
    expect(searchFilter(options, "zzz")).toHaveLength(0);
  });
});

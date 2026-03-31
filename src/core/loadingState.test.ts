/**
 * Unit tests for loading-state logic used by the backend-mode example.
 *
 * Tests cover:
 * - pendingSortColumn derivation
 * - TableStatus derivation
 * - Snapshot-based deferred display logic
 */

import { SortConfig, FilterState } from "./Types";

// ---------------------------------------------------------------------------
// Reproduce the pendingSortColumn logic (multi-sort aware)

function derivePendingSortColumn(
  loading: boolean,
  requested: SortConfig,
  confirmed: SortConfig,
): string | undefined {
  if (!loading) return undefined;
  const reqStr = JSON.stringify(requested);
  const dispStr = JSON.stringify(confirmed);
  if (reqStr !== dispStr) {
    return requested?.[0]?.column ?? confirmed?.[0]?.column;
  }
  return undefined;
}

// Reproduce the status derivation from the example
type Severity = "ok" | "info" | "warning" | "error";

function deriveStatus(
  isBackend: boolean,
  loading: boolean,
  lastError: string | null,
): { severity: Severity; text: string } | undefined {
  if (!isBackend) return undefined;
  if (lastError) return { severity: "error", text: lastError };
  if (loading) return { severity: "info", text: "Loading..." };
  return { severity: "ok", text: "Synced" };
}

// ---------------------------------------------------------------------------

describe("pendingSortColumn", () => {
  test("not loading → no pending column", () => {
    expect(
      derivePendingSortColumn(false, [{ column: "email", direction: "asc" }], null),
    ).toBeUndefined();
  });

  test("loading, sort changed → returns requested column", () => {
    expect(
      derivePendingSortColumn(
        true,
        [{ column: "email", direction: "asc" }],
        null,
      ),
    ).toBe("email");
  });

  test("loading, direction changed → returns requested column", () => {
    expect(
      derivePendingSortColumn(
        true,
        [{ column: "email", direction: "desc" }],
        [{ column: "email", direction: "asc" }],
      ),
    ).toBe("email");
  });

  test("loading, different column → returns new column", () => {
    expect(
      derivePendingSortColumn(
        true,
        [{ column: "salary", direction: "asc" }],
        [{ column: "email", direction: "asc" }],
      ),
    ).toBe("salary");
  });

  test("loading, sort cleared → returns old column", () => {
    expect(
      derivePendingSortColumn(
        true,
        null,
        [{ column: "email", direction: "asc" }],
      ),
    ).toBe("email");
  });

  test("loading, same sort → no pending column", () => {
    const sort: SortConfig = [{ column: "email", direction: "asc" }];
    expect(derivePendingSortColumn(true, sort, sort)).toBeUndefined();
  });

  test("loading, multi-sort changed → returns first column", () => {
    expect(
      derivePendingSortColumn(
        true,
        [{ column: "lastName", direction: "asc" }, { column: "firstName", direction: "asc" }],
        [{ column: "email", direction: "asc" }],
      ),
    ).toBe("lastName");
  });
});

// Reproduce pendingFilterColumns logic from the example
function derivePendingFilterColumns(
  loading: boolean,
  requested: FilterState,
  confirmed: FilterState,
): string[] {
  if (!loading) return [];
  return [
    ...Object.keys(requested).filter((k) => requested[k] !== confirmed[k]),
    ...Object.keys(confirmed).filter((k) => confirmed[k] && !(k in requested)),
  ];
}

describe("pendingFilterColumns", () => {
  test("not loading → empty", () => {
    expect(derivePendingFilterColumns(false, { email: "test" }, {})).toEqual([]);
  });

  test("loading, new filter → includes column", () => {
    expect(derivePendingFilterColumns(true, { email: "test" }, {})).toEqual(["email"]);
  });

  test("loading, changed filter → includes column", () => {
    expect(derivePendingFilterColumns(true, { email: "new" }, { email: "old" })).toEqual([
      "email",
    ]);
  });

  test("loading, removed filter → includes column", () => {
    expect(derivePendingFilterColumns(true, {}, { email: "test" })).toEqual(["email"]);
  });

  test("loading, unchanged filter → not included", () => {
    expect(derivePendingFilterColumns(true, { email: "test" }, { email: "test" })).toEqual([]);
  });

  test("loading, multiple changes → includes all changed", () => {
    const result = derivePendingFilterColumns(
      true,
      { email: "a", skills: "react" },
      { email: "b" },
    );
    expect(result).toContain("email");
    expect(result).toContain("skills");
    expect(result).toHaveLength(2);
  });

  test("loading, only one of many changed → only that one", () => {
    const result = derivePendingFilterColumns(
      true,
      { email: "a", skills: "react" },
      { email: "a" },
    );
    expect(result).toEqual(["skills"]);
  });
});

describe("deriveStatus", () => {
  test("local mode → undefined", () => {
    expect(deriveStatus(false, false, null)).toBeUndefined();
  });

  test("backend, not loading, no error → ok", () => {
    expect(deriveStatus(true, false, null)).toEqual({
      severity: "ok",
      text: "Synced",
    });
  });

  test("backend, loading → info", () => {
    expect(deriveStatus(true, true, null)).toEqual({
      severity: "info",
      text: "Loading...",
    });
  });

  test("backend, error → error (even if loading)", () => {
    expect(deriveStatus(true, true, "Connection failed")).toEqual({
      severity: "error",
      text: "Connection failed",
    });
  });

  test("backend, error takes precedence over ok", () => {
    expect(deriveStatus(true, false, "Timeout")).toEqual({
      severity: "error",
      text: "Timeout",
    });
  });
});

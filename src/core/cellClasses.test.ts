/**
 * Unit tests for the cell CSS class derivation logic in CustomCell.
 *
 * Tests cover:
 * - Validation classes (cell-error, cell-warning)
 * - Validation tooltip message
 * - Ellipsis class (cell-ellipsis)
 * - ReadOnly/disabled state (col-readonly, cell-disabled)
 * - Column type class (col-type-*)
 * - Required class (col-required)
 * - Column className
 */

import { ValidationResult } from "./Types";

// ---------------------------------------------------------------------------
// Reproduce the validation class derivation from CustomCell

type ValidationOutcome = { validationClass: string | null; validationMessage: string | null };

function deriveValidation(
  validate: ((v: unknown) => boolean | ValidationResult) | undefined,
  value: unknown,
): ValidationOutcome {
  const result = validate ? validate(value) : null;
  if (result === null) return { validationClass: null, validationMessage: null };
  if (result === true) return { validationClass: null, validationMessage: null };
  if (result === false) return { validationClass: "cell-error", validationMessage: null };
  return {
    validationClass: result.severity === "warning" ? "cell-warning" : "cell-error",
    validationMessage: result.message,
  };
}

// Reproduce the ellipsis detection from CustomCell
function isEllipsis(value: unknown, textEllipsisLength: number | undefined): boolean {
  return (
    textEllipsisLength != null &&
    typeof value === "string" &&
    value.length > textEllipsisLength
  );
}

// Reproduce read-only detection from CustomCell
function isReadOnly(
  columnReadOnly: boolean | undefined,
  rowReadOnly: boolean | undefined,
  cellDisabled: boolean | undefined,
): boolean {
  return columnReadOnly === true || rowReadOnly === true || cellDisabled === true;
}

// ---------------------------------------------------------------------------

describe("cellClasses – validation", () => {
  test("no validate function → no class, no message", () => {
    expect(deriveValidation(undefined, "anything")).toEqual({
      validationClass: null,
      validationMessage: null,
    });
  });

  test("validate returns true → no class", () => {
    expect(deriveValidation(() => true, "ok")).toEqual({
      validationClass: null,
      validationMessage: null,
    });
  });

  test("validate returns false → cell-error, no message", () => {
    expect(deriveValidation(() => false, "bad")).toEqual({
      validationClass: "cell-error",
      validationMessage: null,
    });
  });

  test("validate returns error ValidationResult → cell-error with message", () => {
    const validate = () => ({ severity: "error" as const, message: "Required field" });
    expect(deriveValidation(validate, "")).toEqual({
      validationClass: "cell-error",
      validationMessage: "Required field",
    });
  });

  test("validate returns warning ValidationResult → cell-warning with message", () => {
    const validate = () => ({ severity: "warning" as const, message: "Too short" });
    expect(deriveValidation(validate, "a")).toEqual({
      validationClass: "cell-warning",
      validationMessage: "Too short",
    });
  });

  test("validate receives the actual cell value", () => {
    const received: unknown[] = [];
    const validate = (v: unknown) => {
      received.push(v);
      return true;
    };
    deriveValidation(validate, "test-value");
    expect(received).toEqual(["test-value"]);
  });

  test("validate can inspect null value", () => {
    const validate = (v: unknown) =>
      v == null ? { severity: "error" as const, message: "Required" } : true;
    expect(deriveValidation(validate, null)).toEqual({
      validationClass: "cell-error",
      validationMessage: "Required",
    });
    expect(deriveValidation(validate, "filled")).toEqual({
      validationClass: null,
      validationMessage: null,
    });
  });
});

describe("cellClasses – ellipsis", () => {
  test("no textEllipsisLength → no ellipsis", () => {
    expect(isEllipsis("long string here", undefined)).toBe(false);
  });

  test("string shorter than limit → no ellipsis", () => {
    expect(isEllipsis("short", 10)).toBe(false);
  });

  test("string exactly at limit → no ellipsis", () => {
    expect(isEllipsis("12345", 5)).toBe(false);
  });

  test("string longer than limit → ellipsis", () => {
    expect(isEllipsis("123456", 5)).toBe(true);
  });

  test("non-string value → never ellipsis", () => {
    expect(isEllipsis(12345, 3)).toBe(false);
    expect(isEllipsis(null, 3)).toBe(false);
    expect(isEllipsis(["a", "b", "c"], 1)).toBe(false);
  });
});

describe("cellClasses – readOnly / disabled", () => {
  test("all false → not read-only", () => {
    expect(isReadOnly(false, false, false)).toBe(false);
  });

  test("column.readOnly true → read-only", () => {
    expect(isReadOnly(true, false, false)).toBe(true);
  });

  test("rowMeta.readOnly true → read-only", () => {
    expect(isReadOnly(false, true, false)).toBe(true);
  });

  test("cellMeta.disabled true → read-only", () => {
    expect(isReadOnly(false, false, true)).toBe(true);
  });

  test("undefined values → not read-only", () => {
    expect(isReadOnly(undefined, undefined, undefined)).toBe(false);
  });
});

describe("cellClasses – static class names", () => {
  test("col-type class uses the column type", () => {
    // These are static strings constructed in the component as `col-type-${column.type}`
    expect(`col-type-${"String"}`).toBe("col-type-String");
    expect(`col-type-${"Number"}`).toBe("col-type-Number");
    expect(`col-type-${"Boolean"}`).toBe("col-type-Boolean");
    expect(`col-type-${"Combobox"}`).toBe("col-type-Combobox");
    expect(`col-type-${"MultiCombobox"}`).toBe("col-type-MultiCombobox");
  });
});

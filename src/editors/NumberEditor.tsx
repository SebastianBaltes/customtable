import React from "react";
import { Editor, NumberFormat } from "../core/Types";
import { useInlineEdit } from "./useInlineEdit";

/**
 * Format a raw number for display including prefix/suffix.
 * Returns empty string for null/undefined.
 */
export function formatNumber(
  value: number | null | undefined,
  fmt: NumberFormat | undefined,
): string {
  if (value == null) return "";
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return (fmt?.prefix ?? "") + formatNumberPart(num, fmt) + (fmt?.suffix ?? "");
}

/**
 * Format just the numeric part -- no prefix/suffix.
 * Used for the edit-mode text input.
 */
function formatNumberPart(value: number, fmt: NumberFormat | undefined): string {
  const opts: Intl.NumberFormatOptions = {
    useGrouping: fmt?.thousandsSeparator !== false,
  };
  if (fmt?.decimalPlaces !== undefined) {
    opts.minimumFractionDigits = fmt.decimalPlaces;
    opts.maximumFractionDigits = fmt.decimalPlaces;
  }
  return new Intl.NumberFormat(fmt?.locale, opts).format(value);
}

/**
 * Parse a locale-formatted number string (e.g. "1.234,56" in de-DE) back to a JS number.
 * Falls back to plain parseFloat for undecorated strings like "1234.56".
 */
export function parseLocaleNumber(str: string, locale?: string): number {
  if (!str.trim()) return NaN;
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.89);
  const decimalSep = parts.find((p) => p.type === "decimal")?.value ?? ".";
  const groupSep = parts.find((p) => p.type === "group")?.value ?? ",";

  const normalized = str
    .split(groupSep)
    .join("")
    .replace(decimalSep, ".");

  const result = parseFloat(normalized);
  return isNaN(result) ? parseFloat(str) : result;
}

export const NumberEditor: Editor<number> = ({
  value,
  editing,
  columnConfig,
  onChange,
  initialEditValue,
}) => {
  const fmt = columnConfig.numberFormat;

  const editDefault = (v: number | null | undefined) =>
    v == null ? "" : formatNumberPart(Number(v), fmt);

  const commitNumber = (localVal: string) => {
    if (localVal === "") {
      onChange(0);
      return;
    }
    const num = parseLocaleNumber(localVal, fmt?.locale);
    onChange(isNaN(num) ? 0 : num);
  };

  // For NumberEditor, initialEditValue filtering happens at the transform level:
  // only accept digit-like chars as typing entry, otherwise use formatted value.
  const resolvedInitial =
    initialEditValue !== null &&
    initialEditValue !== "" &&
    /^[0-9.,-]$/.test(initialEditValue)
      ? initialEditValue
      : initialEditValue === null
        ? null
        : "";

  const { localValue, setLocalValue, inputRef, handleKeyDown, handleBlur } =
    useInlineEdit({
      value: editDefault(value),
      editing,
      initialEditValue: resolvedInitial,
      onCommit: commitNumber,
    });

  if (!editing) {
    return <span>{formatNumber(value, fmt)}</span>;
  }

  return (
    <span
      className="number-editor-wrapper"
      data-prefix={fmt?.prefix ?? ""}
      data-suffix={fmt?.suffix ?? ""}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className="cell-editor-input"
        autoComplete="off"
        data-lpignore="true"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onMouseDown={(e) => e.stopPropagation()}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </span>
  );
};

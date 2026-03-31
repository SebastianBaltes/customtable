import React, { useState, useRef, useEffect } from "react";
import { Editor, NumberFormat } from "../core/Types";


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
 * Format just the numeric part — no prefix/suffix.
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
    .join("") // strip all thousands separators
    .replace(decimalSep, "."); // normalise decimal to "."

  const result = parseFloat(normalized);
  // Fallback: let JS try the raw string (handles "1234.56" typed in any locale)
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

  const [localValue, setLocalValue] = useState(editDefault(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const isEscapingRef = useRef(false);
  // Track whether edit was started by typing a character (ArrowRight at end navigates)
  const navigateOnArrowRightRef = useRef(false);
  const prevEditingRef = useRef(false);

  useEffect(() => {
    if (editing && !prevEditingRef.current) {
      // Just entered edit mode
      if (initialEditValue !== null && initialEditValue !== "" && /^[0-9.,-]$/.test(initialEditValue)) {
        setLocalValue(initialEditValue);
        navigateOnArrowRightRef.current = true;
      } else {
        setLocalValue(editDefault(value));
        navigateOnArrowRightRef.current = false;
      }
    } else if (!editing) {
      setLocalValue(editDefault(value));
    }
    prevEditingRef.current = editing;
  }, [value, editing, initialEditValue]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (initialEditValue === null) {
        // Triple-click: select all
        inputRef.current.select();
      } else {
        // F2/dblclick (initialEditValue="") or typing: cursor at end
        const len = String(inputRef.current.value).length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [editing, initialEditValue]);

  const commit = () => {
    if (isEscapingRef.current) return;
    if (localValue === "") {
      onChange(0);
      return;
    }
    const num = parseLocaleNumber(localValue, fmt?.locale);
    onChange(isNaN(num) ? 0 : num);
  };

  if (!editing) {
    return <span>{formatNumber(value, fmt)}</span>;
  }

  // Edit mode: text input with formatted number (no affix).
  // Prefix/suffix are rendered as CSS ::before / ::after on the wrapper so
  // they are purely visual and never part of the editable value.
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
        onMouseDown={(e) => e.stopPropagation()} // keep edit mode; let browser position cursor
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            isEscapingRef.current = true;
            setLocalValue(editDefault(value));
            return;
          }
          if (e.key === "Enter" || e.key === "Tab") {
            commit();
            return; // bubble up
          }
          // ArrowRight at end of input: navigate to next cell (only if entered via typing)
          if (e.key === "ArrowRight" && navigateOnArrowRightRef.current) {
            const input = inputRef.current!;
            if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
              commit();
              return; // bubble up to useCursorKeys
            }
          }
          e.stopPropagation();
        }}
      />
    </span>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { Editor, NumberFormat } from "../core/Types";

// ---------------------------------------------------------------------------
// Module-level click-position hint
// Set by CustomCell before entering edit mode via mouse click so the editor
// can position the text cursor at the exact click location.
// ---------------------------------------------------------------------------
interface PendingClick {
  x: number;
  ts: number;
}
let _pendingClick: PendingClick | null = null;

export function setPendingNumberEditorClick(clientX: number): void {
  _pendingClick = { x: clientX, ts: Date.now() };
}

/** Consume (read + clear) the pending click if it is fresh (< 400 ms old). */
function consumePendingClick(): number | null {
  const p = _pendingClick;
  _pendingClick = null;
  if (p && Date.now() - p.ts < 400) return p.x;
  return null;
}

/**
 * Map a clientX coordinate to a character offset inside a text input using
 * canvas text-measurement. Works for both left- and right-aligned inputs.
 */
function charOffsetAtClientX(input: HTMLInputElement, clientX: number): number {
  const rect = input.getBoundingClientRect();
  const style = window.getComputedStyle(input);
  const text = input.value;
  if (!text) return 0;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = style.font;

  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  const innerWidth = rect.width - paddingLeft - paddingRight;
  const textWidth = ctx.measureText(text).width;
  const isRight = style.textAlign === "right";

  // X-coordinate of the first character relative to viewport
  const textStartX = isRight
    ? rect.left + paddingLeft + Math.max(0, innerWidth - textWidth)
    : rect.left + paddingLeft;

  const relX = clientX - textStartX;
  if (relX <= 0) return 0;
  if (relX >= textWidth) return text.length;

  // Binary search for the character boundary closest to relX
  let lo = 0,
    hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid)).width <= relX) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

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

  useEffect(() => {
    if (editing && initialEditValue !== null && /^[0-9.,-]$/.test(initialEditValue)) {
      setLocalValue(initialEditValue);
    } else {
      setLocalValue(editDefault(value));
    }
  }, [value, editing, initialEditValue]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (initialEditValue !== null && /^[0-9.,-]$/.test(initialEditValue)) {
        // Started by typing a character — cursor at end
        const len = localValue.length;
        inputRef.current.setSelectionRange(len, len);
      } else {
        const clickX = consumePendingClick();
        if (clickX !== null) {
          // Entered via mouse click — position cursor at the click location
          const offset = charOffsetAtClientX(inputRef.current, clickX);
          inputRef.current.setSelectionRange(offset, offset);
        } else {
          // Entered via Enter / F2 / double-click — select all for quick replacement
          inputRef.current.select();
        }
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
          e.stopPropagation();
        }}
      />
    </span>
  );
};

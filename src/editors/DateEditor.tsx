import React, { useRef } from "react";
import { DateFormat, Editor } from "../core/Types";
import { useInlineEdit } from "./useInlineEdit";

// ---------------------------------------------------------------------------
// Formatting / Parsing helpers
// ---------------------------------------------------------------------------

export function formatDate(isoString: string | null | undefined, fmt?: DateFormat): string {
  if (!isoString) return "";
  const d = new Date(isoString + "T00:00:00"); // force local timezone
  if (isNaN(d.getTime())) return String(isoString);
  const locale = fmt?.locale;
  const options: Intl.DateTimeFormatOptions = fmt?.options ?? (fmt?.dateStyle
    ? { dateStyle: fmt.dateStyle } as any
    : { year: "numeric", month: "2-digit", day: "2-digit" });
  try {
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return String(isoString);
  }
}

/** Try to parse a user-typed string into YYYY-MM-DD. Returns raw input on failure. */
export function parseDateInput(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return toISODate(d);
  }
  const euMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    const candidate = new Date(+year, +month - 1, +day);
    if (!isNaN(candidate.getTime())) return toISODate(candidate);
  }
  return trimmed;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// Editor component
// ---------------------------------------------------------------------------

export const DateEditor: Editor<string> = ({
  value,
  editing,
  columnConfig,
  onChange,
  initialEditValue,
}) => {
  const fmt = columnConfig.dateFormat;
  const pickerRef = useRef<HTMLInputElement>(null);

  const { localValue, setLocalValue, inputRef, handleKeyDown, handleBlur } =
    useInlineEdit({
      value: value ?? "",
      editing,
      initialEditValue,
      onCommit: (val) => onChange(parseDateInput(val)),
    });

  if (!editing) {
    return <span>{formatDate(value, fmt)}</span>;
  }

  return (
    <span className="date-editor-wrapper">
      <input
        ref={inputRef}
        type="text"
        className="cell-editor-input"
        autoComplete="off"
        data-lpignore="true"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      <input
        ref={pickerRef}
        type="date"
        className="cell-editor-picker-hidden"
        tabIndex={-1}
        value={/^\d{4}-\d{2}-\d{2}$/.test(localValue) ? localValue : ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v) {
            setLocalValue(v);
            onChange(v);
          }
        }}
      />
      <button
        type="button"
        className="cell-editor-picker-btn"
        tabIndex={-1}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          try { pickerRef.current?.showPicker(); } catch { pickerRef.current?.click(); }
        }}
        aria-label="Open date picker"
      >
        &#x1F4C5;
      </button>
    </span>
  );
};

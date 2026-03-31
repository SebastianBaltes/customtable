import React, { useState, useRef, useEffect } from "react";
import { DateFormat, Editor } from "../core/Types";

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
  // Already ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // Try Date constructor
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return toISODate(d);
  }
  // Try common EU formats: DD.MM.YYYY, DD/MM/YYYY
  const euMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    const candidate = new Date(+year, +month - 1, +day);
    if (!isNaN(candidate.getTime())) return toISODate(candidate);
  }
  return trimmed; // free-text fallback
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
  const [localValue, setLocalValue] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const isEscapingRef = useRef(false);
  const prevEditingRef = useRef(false);
  const navigateOnArrowRightRef = useRef(false);

  useEffect(() => {
    if (editing && !prevEditingRef.current) {
      if (initialEditValue !== null && initialEditValue !== "") {
        setLocalValue(initialEditValue);
        navigateOnArrowRightRef.current = true;
      } else {
        setLocalValue(value ?? "");
        navigateOnArrowRightRef.current = false;
      }
    } else if (!editing) {
      setLocalValue(value ?? "");
    }
    prevEditingRef.current = editing;
  }, [value, editing, initialEditValue]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (initialEditValue === null) {
        inputRef.current.select();
      } else {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [editing, initialEditValue]);

  const commit = () => {
    if (isEscapingRef.current) return;
    onChange(parseDateInput(localValue));
  };

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
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            isEscapingRef.current = true;
            setLocalValue(value ?? "");
            return;
          }
          if (e.key === "Enter" || e.key === "Tab") {
            commit();
            return;
          }
          if (e.key === "ArrowRight" && navigateOnArrowRightRef.current) {
            const input = inputRef.current!;
            if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
              commit();
              return;
            }
          }
          e.stopPropagation();
        }}
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

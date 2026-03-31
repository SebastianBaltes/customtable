import React, { useState, useRef, useEffect } from "react";
import { DateTimeFormat, Editor } from "../core/Types";

// ---------------------------------------------------------------------------
// Formatting / Parsing helpers
// ---------------------------------------------------------------------------

export function formatDateTime(isoString: string | null | undefined, fmt?: DateTimeFormat): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return String(isoString);
  const locale = fmt?.locale;
  const options: Intl.DateTimeFormatOptions = fmt?.options ?? {
    ...(fmt?.dateStyle ? { dateStyle: fmt.dateStyle } : { year: "numeric", month: "2-digit", day: "2-digit" }),
    ...(fmt?.timeStyle ? { timeStyle: fmt.timeStyle } : { hour: "2-digit", minute: "2-digit" }),
  } as any;
  try {
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return String(isoString);
  }
}

/** Parse user input into an ISO datetime string. */
export function parseDateTimeInput(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  // Already valid ISO?
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString();
  return trimmed; // free-text fallback
}

/** Convert ISO string to datetime-local input value (YYYY-MM-DDTHH:mm). */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${da}T${h}:${mi}`;
}

// ---------------------------------------------------------------------------
// Editor component
// ---------------------------------------------------------------------------

export const DateTimeEditor: Editor<string> = ({
  value,
  editing,
  columnConfig,
  onChange,
  initialEditValue,
}) => {
  const fmt = columnConfig.dateTimeFormat;
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
    onChange(parseDateTimeInput(localValue));
  };

  if (!editing) {
    return <span>{formatDateTime(value, fmt)}</span>;
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
        type="datetime-local"
        className="cell-editor-picker-hidden"
        tabIndex={-1}
        value={toDatetimeLocal(localValue)}
        onChange={(e) => {
          const v = e.target.value;
          if (v) {
            const iso = new Date(v).toISOString();
            setLocalValue(iso);
            onChange(iso);
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
        aria-label="Open date/time picker"
      >
        &#x1F4C5;
      </button>
    </span>
  );
};

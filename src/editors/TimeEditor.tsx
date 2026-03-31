import React, { useState, useRef, useEffect } from "react";
import { Editor, TimeFormat } from "../core/Types";

// ---------------------------------------------------------------------------
// Formatting / Parsing helpers
// ---------------------------------------------------------------------------

export function formatTime(timeStr: string | null | undefined, fmt?: TimeFormat): string {
  if (!timeStr) return "";
  // Parse HH:mm or HH:mm:ss
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return String(timeStr);
  const [, h, m, s] = match;
  // Use a dummy date for Intl formatting
  const d = new Date(2000, 0, 1, +h, +m, +(s ?? 0));
  if (isNaN(d.getTime())) return String(timeStr);
  const locale = fmt?.locale;
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    ...(fmt?.showSeconds ? { second: "2-digit" } : {}),
    ...(fmt?.hourCycle ? { hourCycle: fmt.hourCycle } : {}),
  };
  try {
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return String(timeStr);
  }
}

/** Parse user input into HH:mm or HH:mm:ss. Returns raw input on failure. */
export function parseTimeInput(text: string, showSeconds?: boolean): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  // Already HH:mm or HH:mm:ss?
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) return trimmed;
  // Try 12h format: "2:30 PM", "2:30pm"
  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampm) {
    let h = +ampm[1];
    const m = ampm[2];
    const s = ampm[3];
    const isPM = ampm[4].toLowerCase() === "pm";
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    const hh = String(h).padStart(2, "0");
    return showSeconds && s ? `${hh}:${m}:${s}` : `${hh}:${m}`;
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// Editor component
// ---------------------------------------------------------------------------

export const TimeEditor: Editor<string> = ({
  value,
  editing,
  columnConfig,
  onChange,
  initialEditValue,
}) => {
  const fmt = columnConfig.timeFormat;
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
    onChange(parseTimeInput(localValue, fmt?.showSeconds));
  };

  if (!editing) {
    return <span>{formatTime(value, fmt)}</span>;
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
        type="time"
        className="cell-editor-picker-hidden"
        tabIndex={-1}
        step={fmt?.showSeconds ? 1 : 60}
        value={/^\d{1,2}:\d{2}/.test(localValue) ? localValue : ""}
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
        aria-label="Open time picker"
      >
        &#x1F552;
      </button>
    </span>
  );
};

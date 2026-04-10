import React, { useRef } from "react";
import { Editor, TimeFormat } from "../core/Types";
import { useInlineEdit } from "./useInlineEdit";

// ---------------------------------------------------------------------------
// Formatting / Parsing helpers
// ---------------------------------------------------------------------------

export function formatTime(timeStr: string | null | undefined, fmt?: TimeFormat): string {
  if (!timeStr) return "";
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return String(timeStr);
  const [, h, m, s] = match;
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
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) return trimmed;
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
  readOnly,
  onEnterEditMode,
}) => {
  const fmt = columnConfig.timeFormat;
  const pickerRef = useRef<HTMLInputElement>(null);

  const { localValue, setLocalValue, inputRef, handleKeyDown, handleBlur } =
    useInlineEdit({
      value: value ?? "",
      editing,
      initialEditValue,
      onCommit: (val) => onChange(parseTimeInput(val, fmt?.showSeconds)),
      transformValue: (val) => val === initialEditValue ? val : formatTime(val, fmt),
    });

  return (
    <span className="date-editor-wrapper">
      {editing ? (
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
      ) : (
        <span className="cell-editor-display-text">{formatTime(value, fmt)}</span>
      )}
      <input
        ref={pickerRef}
        type="time"
        className="cell-editor-picker-hidden"
        tabIndex={-1}
        step={fmt?.showSeconds ? 1 : 60}
        value={
          (() => {
            const parsed = parseTimeInput(localValue, fmt?.showSeconds);
            return /^\d{1,2}:\d{2}/.test(parsed) ? parsed : "";
          })()
        }
        onChange={(e) => {
          const v = e.target.value;
          if (v) {
            setLocalValue(formatTime(v, fmt));
            onChange(v);
          }
        }}
      />
      <button
        type="button"
        className="cell-editor-picker-btn"
        tabIndex={-1}
        onMouseDown={(e) => {
          if (!readOnly) {
            e.preventDefault();
            e.stopPropagation();
            if (!editing && onEnterEditMode) onEnterEditMode();
            try { pickerRef.current?.showPicker(); } catch { pickerRef.current?.click(); }
          }
        }}
        aria-label="Open time picker"
      >
        &#x1F552;
      </button>
    </span>
  );
};

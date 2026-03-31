import React from "react";
import { DurationFormat, Editor } from "../core/Types";
import { useInlineEdit } from "./useInlineEdit";

// ---------------------------------------------------------------------------
// Parsing / Formatting helpers
// ---------------------------------------------------------------------------

export interface DurationParts {
  hours: number;
  minutes: number;
  seconds: number;
}

/** Parse various duration formats into parts. Returns null on failure. */
export function parseDuration(input: string): DurationParts | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // ISO 8601: PT2H30M, PT45M, PT1H, PT0S, PT1H30M15S
  const iso = trimmed.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (iso && (iso[1] || iso[2] || iso[3])) {
    return { hours: +(iso[1] ?? 0), minutes: +(iso[2] ?? 0), seconds: +(iso[3] ?? 0) };
  }

  // Short form: "2h 30m 15s", "2h30m", "45m", "2h", "30s"
  const short = trimmed.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?\s*(?:(\d+)\s*s(?:ec)?)?$/i);
  if (short && (short[1] || short[2] || short[3])) {
    return { hours: +(short[1] ?? 0), minutes: +(short[2] ?? 0), seconds: +(short[3] ?? 0) };
  }

  // Colon form: "2:30", "2:30:15", "0:45"
  const colon = trimmed.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colon) {
    return { hours: +colon[1], minutes: +colon[2], seconds: +(colon[3] ?? 0) };
  }

  // Pure minutes: "150m" or "150 min"
  const mins = trimmed.match(/^(\d+)\s*(?:m(?:in(?:utes?)?)?)?$/i);
  if (mins && /m/i.test(trimmed)) {
    const total = +mins[1];
    return { hours: Math.floor(total / 60), minutes: total % 60, seconds: 0 };
  }

  return null;
}

/** Format duration parts into a display string. */
export function formatDuration(
  value: string | null | undefined,
  fmt?: DurationFormat,
): string {
  if (!value) return "";
  const parts = parseDuration(value);
  if (!parts) return String(value);
  const style = fmt?.style ?? "short";
  const { hours, minutes, seconds } = parts;

  if (style === "iso") {
    let s = "PT";
    if (hours) s += `${hours}H`;
    if (minutes) s += `${minutes}M`;
    if (seconds) s += `${seconds}S`;
    if (s === "PT") s = "PT0M";
    return s;
  }

  if (style === "long") {
    const p: string[] = [];
    if (hours) p.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
    if (minutes) p.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
    if (seconds) p.push(`${seconds} second${seconds !== 1 ? "s" : ""}`);
    return p.length ? p.join(" ") : "0 minutes";
  }

  // short
  const p: string[] = [];
  if (hours) p.push(`${hours}h`);
  if (minutes || (!hours && !seconds)) p.push(`${minutes}m`);
  if (seconds) p.push(`${seconds}s`);
  return p.join(" ");
}

/** Normalize input to ISO 8601 duration string. Returns raw input on failure. */
export function normalizeDuration(input: string): string {
  const parts = parseDuration(input);
  if (!parts) return input.trim();
  return formatDuration(input, { style: "iso" });
}

// ---------------------------------------------------------------------------
// Editor component
// ---------------------------------------------------------------------------

export const DurationEditor: Editor<string> = ({
  value,
  editing,
  columnConfig,
  onChange,
  initialEditValue,
}) => {
  const fmt = columnConfig.durationFormat;

  const { localValue, setLocalValue, inputRef, handleKeyDown, handleBlur } =
    useInlineEdit({
      value: value ?? "",
      editing,
      initialEditValue,
      onCommit: (val) => onChange(normalizeDuration(val)),
    });

  if (!editing) {
    return <span>{formatDuration(value, fmt)}</span>;
  }

  return (
    <input
      ref={inputRef}
      type="text"
      className="cell-editor-input"
      autoComplete="off"
      data-lpignore="true"
      placeholder="e.g. 2h 30m"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
};

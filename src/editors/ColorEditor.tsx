import React, { useRef } from "react";
import { Editor } from "../core/Types";
import { useInlineEdit } from "./useInlineEdit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a hex color string to lowercase #rrggbb. Returns raw input on failure. */
export function normalizeHex(input: string): string {
  let s = input.trim();
  if (!s) return "";
  if (!s.startsWith("#")) s = "#" + s;
  // Expand 3-digit shorthand: #f00 → #ff0000
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    s = "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  }
  if (/^#[0-9a-f]{6}$/i.test(s)) {
    return s.toLowerCase();
  }
  return input.trim(); // free-text fallback
}

/** Check if a string is a valid hex color (#rrggbb or #rgb). */
function isValidHex(s: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(s) || /^#[0-9a-f]{3}$/i.test(s);
}

// ---------------------------------------------------------------------------
// Editor component
// ---------------------------------------------------------------------------

export const ColorEditor: Editor<string> = ({
  value,
  editing,
  columnConfig,
  onChange,
  initialEditValue,
  readOnly,
  onEnterEditMode,
}) => {
  const pickerRef = useRef<HTMLInputElement>(null);

  const { localValue, setLocalValue, inputRef, handleKeyDown, handleBlur } =
    useInlineEdit({
      value: value ?? "",
      editing,
      initialEditValue,
      onCommit: (val) => onChange(normalizeHex(val)),
    });

  const displayHex = value ?? "";
  const swatchColor = isValidHex(localValue) ? localValue : (isValidHex(displayHex) ? displayHex : undefined);

  return (
    <span className="color-editor-wrapper">
      <span
        className="color-swatch color-swatch-clickable"
        style={{ backgroundColor: swatchColor ?? "#ffffff" }}
        onMouseDown={(e) => {
          if (!readOnly) {
            e.preventDefault();
            e.stopPropagation();
            if (!editing && onEnterEditMode) onEnterEditMode();
            try { pickerRef.current?.showPicker(); } catch { pickerRef.current?.click(); }
          }
        }}
      />
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
        <span className="color-editor-text-display">{displayHex}</span>
      )}
      <input
        ref={pickerRef}
        type="color"
        className="cell-editor-picker-hidden"
        tabIndex={-1}
        value={swatchColor ?? "#000000"}
        onChange={(e) => {
          const v = e.target.value;
          setLocalValue(v);
          onChange(v);
        }}
      />
    </span>
  );
};

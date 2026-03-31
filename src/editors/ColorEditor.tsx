import React, { useState, useRef, useEffect } from "react";
import { Editor } from "../core/Types";

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
}) => {
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
    onChange(normalizeHex(localValue));
  };

  const swatchColor = isValidHex(localValue) ? localValue : (isValidHex(value ?? "") ? value! : undefined);

  if (!editing) {
    const displayHex = value ?? "";
    return (
      <span className="color-editor-display">
        {isValidHex(displayHex) && (
          <span className="color-swatch" style={{ backgroundColor: displayHex }} />
        )}
        <span>{displayHex}</span>
      </span>
    );
  }

  return (
    <span className="color-editor-wrapper">
      <span
        className="color-swatch color-swatch-clickable"
        style={{ backgroundColor: swatchColor ?? "#ffffff" }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          try { pickerRef.current?.showPicker(); } catch { pickerRef.current?.click(); }
        }}
      />
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

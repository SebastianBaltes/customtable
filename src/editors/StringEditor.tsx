import React, { useState, useRef, useEffect } from "react";
import { Editor } from "../core/Types";

/**
 * Apply an input mask to raw user input.
 * Mask characters: # = digit, A = letter, * = any char.
 * All other characters are literals inserted automatically.
 */
export function applyMask(rawInput: string, mask: string): string {
  // Collect literal characters from the mask
  const literals = new Set<string>();
  for (const ch of mask) {
    if (ch !== '#' && ch !== 'A' && ch !== '*') literals.add(ch);
  }
  // Strip literals from raw input to get only user-meaningful chars
  const stripped = rawInput.split('').filter(ch => !literals.has(ch)).join('');

  let result = '';
  let inputIdx = 0;

  for (let maskIdx = 0; maskIdx < mask.length && inputIdx < stripped.length; maskIdx++) {
    const m = mask[maskIdx];
    if (m === '#') {
      // Consume next digit
      while (inputIdx < stripped.length && !/\d/.test(stripped[inputIdx])) inputIdx++;
      if (inputIdx < stripped.length) result += stripped[inputIdx++];
      else break;
    } else if (m === 'A') {
      // Consume next letter
      while (inputIdx < stripped.length && !/[a-zA-Z]/.test(stripped[inputIdx])) inputIdx++;
      if (inputIdx < stripped.length) result += stripped[inputIdx++];
      else break;
    } else if (m === '*') {
      result += stripped[inputIdx++];
    } else {
      // Literal character — insert it
      result += m;
    }
  }
  return result;
}

/**
 * Convert a mask pattern to a placeholder string.
 * # → _, A → _, * → _, literals stay as-is.
 */
export function maskToPlaceholder(mask: string): string {
  return mask.replace(/[#A*]/g, '_');
}

export const StringEditor: Editor<string> = ({
  value,
  row,
  editing,
  columnConfig,
  onChange,
  textEllipsisLength,
  initialEditValue,
}) => {
  const mask = columnConfig.inputMask;

  const applyMaskIfNeeded = (val: string): string =>
    mask ? applyMask(val, mask) : val;

  const [localValue, setLocalValue] = useState(applyMaskIfNeeded(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);
  const isEscapingRef = useRef(false);
  const prevEditingRef = useRef(false);
  // Track whether edit was started by typing a character (ArrowRight at end navigates)
  const navigateOnArrowRightRef = useRef(false);

  useEffect(() => {
    if (editing && !prevEditingRef.current) {
      // Just entered edit mode
      if (initialEditValue !== null && initialEditValue !== "") {
        // Typing entry: replace content with typed character
        setLocalValue(applyMaskIfNeeded(initialEditValue));
        navigateOnArrowRightRef.current = true;
      } else {
        // F2/dblclick/tripleclick: keep existing value
        setLocalValue(applyMaskIfNeeded(value ?? ""));
        navigateOnArrowRightRef.current = false;
      }
    } else if (!editing) {
      // Exited edit mode — sync with prop
      setLocalValue(applyMaskIfNeeded(value ?? ""));
    }
    // While already editing: never overwrite user's in-progress typing
    prevEditingRef.current = editing;
  }, [value, editing, initialEditValue]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (initialEditValue === null) {
        // Triple-click: select all text
        inputRef.current.select();
      } else {
        // F2/dblclick (initialEditValue="") or typing: cursor at end
        const len = String(inputRef.current.value).length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [editing, initialEditValue]);

  if (!editing) {
    const stringVal = value ?? "";
    const displayValue =
      textEllipsisLength && stringVal.length > textEllipsisLength
        ? stringVal.substring(0, textEllipsisLength) + " [...]"
        : stringVal;
    return <span title={stringVal}>{displayValue}</span>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mask) {
      const masked = applyMask(e.target.value, mask);
      setLocalValue(masked);
      // Position cursor after the last character of the masked value
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const pos = masked.length;
          inputRef.current.setSelectionRange(pos, pos);
        }
      });
    } else {
      setLocalValue(e.target.value);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className="cell-editor-input"
      autoComplete="off"
      data-lpignore="true"
      value={localValue}
      placeholder={mask ? maskToPlaceholder(mask) : undefined}
      onChange={handleChange}
      onBlur={() => {
        if (!isEscapingRef.current) onChange(localValue);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          isEscapingRef.current = true;
          setLocalValue(applyMaskIfNeeded(value ?? ""));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          // Commit now; useCursorKeys handles cursor movement via bubble.
          onChange(localValue);
          return; // bubble up — do NOT stopPropagation
        }
        // ArrowRight at end of input: navigate to next cell (only if entered via typing)
        if (e.key === "ArrowRight" && navigateOnArrowRightRef.current) {
          const input = inputRef.current!;
          if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
            onChange(localValue);
            return; // bubble up to useCursorKeys
          }
        }
        e.stopPropagation(); // all other keys stay inside the editor
      }}
    />
  );
};

import React from "react";
import { Editor } from "../core/Types";
import { useInlineEdit } from "./useInlineEdit";

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
      while (inputIdx < stripped.length && !/\d/.test(stripped[inputIdx])) inputIdx++;
      if (inputIdx < stripped.length) result += stripped[inputIdx++];
      else break;
    } else if (m === 'A') {
      while (inputIdx < stripped.length && !/[a-zA-Z]/.test(stripped[inputIdx])) inputIdx++;
      if (inputIdx < stripped.length) result += stripped[inputIdx++];
      else break;
    } else if (m === '*') {
      result += stripped[inputIdx++];
    } else {
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
  editing,
  columnConfig,
  onChange,
  textEllipsisLength,
  initialEditValue,
}) => {
  const mask = columnConfig.inputMask;
  const transformValue = mask ? (val: string) => applyMask(val, mask) : undefined;

  const { localValue, setLocalValue, inputRef, handleKeyDown, handleBlur } =
    useInlineEdit({
      value: value ?? "",
      editing,
      initialEditValue,
      onCommit: onChange,
      transformValue,
    });

  if (!editing) {
    let stringVal = value ?? "";
    if (mask) stringVal = applyMask(stringVal, mask);
    const displayValue =
      textEllipsisLength && stringVal.length > textEllipsisLength
        ? stringVal.substring(0, textEllipsisLength) + " [...]"
        : stringVal;
    return <span title={stringVal}>{displayValue}</span>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mask) {
      const input = e.target;
      const rawValue = input.value;
      const selectionStart = input.selectionStart || 0;
      
      // literals in mask for cursor tracking
      const literalChars = new Set<string>();
      for (const ch of mask) {
        if (ch !== '#' && ch !== 'A' && ch !== '*') literalChars.add(ch);
      }
      
      // Count data chars before cursor to keep logical position
      let dataCharsBefore = 0;
      for (let i = 0; i < selectionStart; i++) {
        if (!literalChars.has(rawValue[i])) dataCharsBefore++;
      }
      
      const masked = applyMask(rawValue, mask);
      setLocalValue(masked);
      
      requestAnimationFrame(() => {
        if (inputRef.current) {
          let newPos = 0;
          let foundDataChars = 0;
          while (newPos < masked.length && foundDataChars < dataCharsBefore) {
            if (!literalChars.has(masked[newPos])) {
              foundDataChars++;
            }
            newPos++;
          }
          // If we are at a literal, skip forward to the next data slot or end
          while (newPos < masked.length && literalChars.has(masked[newPos])) {
            newPos++;
          }
          inputRef.current.setSelectionRange(newPos, newPos);
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
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
};

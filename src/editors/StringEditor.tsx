import React, { useState, useRef, useEffect } from "react";
import { Editor } from "../core/Types";

export const StringEditor: Editor<string> = ({
  value,
  row,
  editing,
  columnConfig,
  onChange,
  textEllipsisLength,
  initialEditValue,
}) => {
  const [localValue, setLocalValue] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const isEscapingRef = useRef(false);

  useEffect(() => {
    if (editing && initialEditValue !== null) {
      setLocalValue(initialEditValue);
    } else {
      setLocalValue(value ?? "");
    }
  }, [value, editing, initialEditValue]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (initialEditValue !== null) {
        // Position cursor at end of the initial text
        const len = String(localValue).length;
        inputRef.current.setSelectionRange(len, len);
      } else {
        inputRef.current.select();
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

  return (
    <input
      ref={inputRef}
      type="text"
      className="cell-editor-input"
      autoComplete="off"
      data-lpignore="true"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (!isEscapingRef.current) onChange(localValue);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          isEscapingRef.current = true;
          setLocalValue(value ?? "");
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          // Commit now; useCursorKeys handles cursor movement via bubble.
          onChange(localValue);
          return; // bubble up — do NOT stopPropagation
        }
        e.stopPropagation(); // all other keys stay inside the editor
      }}
    />
  );
};

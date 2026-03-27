import React, { useState, useRef, useEffect } from "react";
import { Editor } from "../core/Types";

export const StringEditor: Editor<string> = ({ value, row, editing, columnConfig, onChange }) => {
  const [localValue, setLocalValue] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (!editing) {
    return <span>{value}</span>;
  }

  return (
    <input
      ref={inputRef}
      type="text"
      className="cell-editor-input"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onChange(localValue)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          onChange(localValue);
        } else if (e.key === "Escape") {
          setLocalValue(value ?? "");
        } else if (e.key === "Tab") {
          onChange(localValue);
        }
      }}
    />
  );
};

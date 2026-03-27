import React, { useState, useRef, useEffect } from "react";
import { Editor } from "../core/Types";

export const NumberEditor: Editor<number> = ({ value, row, editing, columnConfig, onChange }) => {
  const [localValue, setLocalValue] = useState(value == null ? "" : String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value == null ? "" : String(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const num = localValue === "" ? 0 : Number(localValue);
    onChange(isNaN(num) ? 0 : num);
  };

  if (!editing) {
    return <span>{value}</span>;
  }

  return (
    <input
      ref={inputRef}
      type="number"
      className="cell-editor-input"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          commit();
        } else if (e.key === "Escape") {
          setLocalValue(value == null ? "" : String(value));
        } else if (e.key === "Tab") {
          commit();
        }
      }}
    />
  );
};

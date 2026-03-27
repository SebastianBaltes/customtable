import React, { useRef, useEffect } from "react";
import { Editor } from "../core/Types";

export const ComboboxEditor: Editor<string> = ({ value, row, editing, columnConfig, onChange }) => {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [editing]);

  if (!editing) {
    return <span>{value}</span>;
  }

  const options = columnConfig.selectOptions ?? [];

  return (
    <select
      ref={selectRef}
      className="cell-editor-select"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {}}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          // do nothing, cursor handles escape
        }
      }}
    >
      <option value="">-- select --</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
};


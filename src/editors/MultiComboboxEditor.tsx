import React, { useRef } from "react";
import { Editor } from "../core/Types";

export const MultiComboboxEditor: Editor<string[]> = ({
  value,
  row,
  editing,
  columnConfig,
  onChange,
}) => {
  const options = columnConfig.selectOptions ?? [];
  const selected: string[] = Array.isArray(value) ? value : [];
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayText = selected.length > 0 ? selected.join(", ") : "";

  if (!editing) {
    return <span>{displayText}</span>;
  }

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div ref={dropdownRef} className="multi-combobox" onKeyDown={(e) => e.stopPropagation()}>
      <div className="multi-combobox-display">{displayText || "-- select --"}</div>
      <div className="multi-combobox-dropdown">
        {options.map((opt) => (
          <label key={opt} className="multi-combobox-option">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggleOption(opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
};



import React, { useEffect, useRef, useState } from "react";
import { Editor } from "../core/Types";
import { DropdownEditor } from "./DropdownEditor";

export const MultiComboboxEditor: Editor<string[]> = ({
  value,
  row,
  editing,
  columnConfig,
  onChange,
  textEllipsisLength,
  initialEditValue,
}) => {
  const options = columnConfig.selectOptions ?? [];
  const selected: string[] = Array.isArray(value) ? value : [];
  const displayText = selected.join(", ");

  // --- Display mode ---
  if (!editing) {
    const finalDisplay =
      textEllipsisLength && displayText.length > textEllipsisLength
        ? displayText.substring(0, textEllipsisLength) + " [...]"
        : displayText;
    return <span title={displayText}>{finalDisplay}</span>;
  }

  // --- CSV edit mode (triggered by typing) ---
  // initialEditValue !== null means the user started typing directly on the cell.
  // In this mode, the current selection is edited as a comma-separated string.
  if (initialEditValue !== null) {
    return (
      <MultiComboboxCsvInput
        initialChar={initialEditValue}
        selected={selected}
        onChange={onChange}
      />
    );
  }

  // --- Dropdown mode (zone-click, Enter, F2, dblclick) ---
  return (
    <DropdownEditor
      options={options}
      selected={selected}
      multiselect={true}
      freeText={columnConfig.freeText ?? true}
      displayText={displayText}
      textEllipsisLength={textEllipsisLength}
      onChange={onChange}
    />
  );
};

// ---------------------------------------------------------------------------
// CSV sub-editor
// ---------------------------------------------------------------------------
interface CsvInputProps {
  initialChar: string;
  selected: string[];
  onChange: (newSelected: string[]) => void;
}

const MultiComboboxCsvInput: React.FC<CsvInputProps> = ({ initialChar, selected, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // Start with the first typed character; user can continue to type a full CSV
  const [localValue, setLocalValue] = useState(initialChar);
  const isEscapingRef = useRef(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      const len = localValue.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, []);

  const commitCsv = (raw: string) => {
    if (isEscapingRef.current) return;
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");
    onChange(parts);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className="cell-editor-input"
      autoComplete="off"
      data-lpignore="true"
      value={localValue}
      placeholder="Wert1, Wert2, …"
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => commitCsv(localValue)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          isEscapingRef.current = true;
          setLocalValue(selected.join(", "));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          commitCsv(localValue);
          return; // bubble up to useCursorKeys — do NOT stopPropagation
        }
        e.stopPropagation();
      }}
    />
  );
};

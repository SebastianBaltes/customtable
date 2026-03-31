import React from "react";
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
  const rawOpts = columnConfig.selectOptions;
  const options = typeof rawOpts === "function" ? rawOpts(row) : rawOpts ?? [];
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

  // --- Always use dropdown mode (dropdown is always visible in edit mode) ---
  return (
    <DropdownEditor
      options={options}
      selected={selected}
      multiselect={true}
      freeText={columnConfig.freeText ?? true}
      displayText={displayText}
      textEllipsisLength={textEllipsisLength}
      initialEditValue={initialEditValue}
      onChange={onChange}
    />
  );
};

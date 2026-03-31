import React from "react";
import { Editor } from "../core/Types";
import { DropdownEditor } from "./DropdownEditor";

export const ComboboxEditor: Editor<string> = ({
  value,
  row,
  editing,
  columnConfig,
  onChange,
  onRequestClose,
  textEllipsisLength,
  initialEditValue,
}) => {
  const rawOpts = columnConfig.selectOptions;
  const options = typeof rawOpts === "function" ? rawOpts(row) : rawOpts ?? [];
  const selected = value != null && value !== "" ? [value] : [];
  const displayText = value ?? "";

  if (!editing) {
    const finalDisplay =
      textEllipsisLength && displayText.length > textEllipsisLength
        ? displayText.substring(0, textEllipsisLength) + " [...]"
        : displayText;
    return <span title={displayText}>{finalDisplay}</span>;
  }

  return (
    <DropdownEditor
      options={options}
      selected={selected}
      multiselect={false}
      freeText={columnConfig.freeText ?? true}
      displayText={displayText}
      textEllipsisLength={textEllipsisLength}
      initialEditValue={initialEditValue}
      onChange={(newSelected) => {
        onChange(newSelected[0] ?? "");
      }}
      onRequestClose={onRequestClose}
    />
  );
};

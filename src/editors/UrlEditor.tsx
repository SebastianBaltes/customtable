import React from "react";
import { Editor } from "../core/Types";
import { useInlineEdit } from "./useInlineEdit";

export const UrlEditor: Editor<string> = ({
  value,
  editing,
  onChange,
  initialEditValue,
}) => {
  const { localValue, setLocalValue, inputRef, handleKeyDown, handleBlur } =
    useInlineEdit({
      value: value || "",
      editing,
      initialEditValue,
      onCommit: onChange,
    });

  const openLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value) {
      const url = value.startsWith("http") ? value : `https://${value}`;
      window.open(url, "_blank");
    }
  };

  const showIcon = !!value;

  if (!editing) {
    return (
      <div className="url-editor-display">
        <span className="truncate">{value}</span>
        {showIcon && (
          <button className="cell-editor-picker-btn" onClick={openLink} title="Open link">
            🔗
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="url-editor-wrapper">
      <input
        ref={inputRef}
        type="text"
        className="cell-editor-input"
        autoComplete="off"
        data-lpignore="true"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {showIcon && (
        <button className="cell-editor-picker-btn" onClick={openLink} title="Open link">
          🔗
        </button>
      )}
    </div>
  );
};

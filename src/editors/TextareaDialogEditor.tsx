import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { Editor } from "../core/Types";
import { useInlineEdit } from "./useInlineEdit";

export const TextareaDialogEditor: Editor<string> = ({
  value,
  row,
  editing,
  columnConfig,
  onChange,
  onRequestClose,
  textEllipsisLength,
  initialEditValue,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogValue, setDialogValue] = useState(value ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { localValue, setLocalValue, inputRef, handleKeyDown, handleBlur } = useInlineEdit({
    value: value ?? "",
    editing,
    initialEditValue,
    onCommit: onChange,
  });

  // --- Dialog state ---
  useEffect(() => {
    if (dialogOpen && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(dialogValue.length, dialogValue.length);
    }
  }, [dialogOpen]);

  // Native capture-phase listener to stop mousedown from reaching
  // the document-level capture handler in useCursor.tsx.
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const stop = (e: MouseEvent) => e.stopPropagation();
    el.addEventListener("mousedown", stop, { capture: true });
    return () => el.removeEventListener("mousedown", stop, { capture: true });
  }, [dialogOpen]);

  useEffect(() => {
    setDialogValue(value ?? "");
  }, [value]);

  const dialogTitle = columnConfig.dialogTitle
    ? columnConfig.dialogTitle.replace(/\$\{(\w+)\}/g, (_, key) => (row[key] ?? "") as string)
    : columnConfig.label ?? columnConfig.name;

  const handleSave = () => {
    onChange(dialogValue);
    setDialogOpen(false);
    onRequestClose?.();
  };

  const handleCancel = () => {
    setDialogValue(value ?? "");
    setDialogOpen(false);
    onRequestClose?.();
  };

  const displayText = value ?? "";
  const finalDisplay =
    textEllipsisLength && displayText.length > textEllipsisLength
      ? displayText.substring(0, textEllipsisLength) + " [...]"
      : displayText;

  // --- Inline editing mode (double-click / Enter / typing) ---
  if (editing && !dialogOpen) {
    return (
      <>
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
        <span
          className="cell-popup-indicator"
          aria-hidden="true"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDialogValue(localValue);
            setDialogOpen(true);
          }}
        >
        </span>
      </>
    );
  }

  // --- Display mode ---
  return (
    <>
      <span title={displayText}>{finalDisplay}</span>
      <span
        className="cell-popup-indicator"
        aria-hidden="true"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDialogValue(value ?? "");
          setDialogOpen(true);
        }}
      >
      </span>
      {dialogOpen &&
        ReactDOM.createPortal(
          <div
            ref={overlayRef}
            className="editor-dialog-overlay"
            onMouseDown={(e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget) {
                e.preventDefault();
              }
            }}
          >
            <div className="editor-dialog">
              <div className="editor-dialog-header">
                <span className="editor-dialog-title">{dialogTitle}</span>
                <button className="editor-dialog-close" onClick={handleCancel} title="Close">
                  ×
                </button>
              </div>
              <textarea
                ref={textareaRef}
                className="editor-dialog-input"
                value={dialogValue}
                onChange={(e) => setDialogValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    handleCancel();
                  }
                  e.stopPropagation();
                }}
              />
              <div className="editor-dialog-footer">
                <button className="editor-dialog-btn editor-dialog-btn-save" onClick={handleSave}>
                  Save
                </button>
                <button
                  className="editor-dialog-btn editor-dialog-btn-cancel"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { Editor } from "../core/Types";

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

  // --- Inline editor state (same as StringEditor) ---
  const [inlineValue, setInlineValue] = useState(value ?? "");
  const inlineRef = useRef<HTMLInputElement>(null);
  const isEscapingRef = useRef(false);

  useEffect(() => {
    if (editing && initialEditValue !== null) {
      setInlineValue(initialEditValue);
    } else {
      setInlineValue(value ?? "");
    }
  }, [value, editing, initialEditValue]);

  useEffect(() => {
    if (editing && inlineRef.current) {
      inlineRef.current.focus();
      if (initialEditValue !== null) {
        const len = String(inlineValue).length;
        inlineRef.current.setSelectionRange(len, len);
      } else {
        inlineRef.current.select();
      }
    }
  }, [editing, initialEditValue]);

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
          ref={inlineRef}
          type="text"
          className="cell-editor-input"
          autoComplete="off"
          data-lpignore="true"
          value={inlineValue}
          onChange={(e) => setInlineValue(e.target.value)}
          onBlur={() => {
            if (!isEscapingRef.current) onChange(inlineValue);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              isEscapingRef.current = true;
              setInlineValue(value ?? "");
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              onChange(inlineValue);
              return;
            }
            e.stopPropagation();
          }}
        />
        <span
          className="cell-popup-indicator"
          aria-hidden="true"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDialogValue(inlineValue);
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

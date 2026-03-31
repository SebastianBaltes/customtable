import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { ColumnConfig } from "./Types";

export interface ColumnManagerProps {
  open: boolean;
  onClose: () => void;
  columns: ColumnConfig<any>[];
  /** Current column order (array of column names). */
  columnOrder: string[];
  /** Called when the user reorders or toggles columns. */
  onColumnOrderChange: (order: string[]) => void;
  /** Set of hidden column names. */
  hiddenColumns: Set<string>;
  /** Called when column visibility changes. */
  onHiddenColumnsChange: (hidden: Set<string>) => void;
  /** Called to reset order and visibility. */
  onReset: () => void;
}

export const ColumnManagerDialog: React.FC<ColumnManagerProps> = ({
  open,
  onClose,
  columns,
  columnOrder,
  onColumnOrderChange,
  hiddenColumns,
  onHiddenColumnsChange,
  onReset,
}) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const stop = (e: MouseEvent) => e.stopPropagation();
    el.addEventListener("mousedown", stop, { capture: true });
    return () => el.removeEventListener("mousedown", stop, { capture: true });
  }, [open]);

  if (!open) return null;

  const colMap = new Map(columns.map((c) => [c.name, c]));
  const orderedNames = columnOrder.length > 0 ? columnOrder : columns.map((c) => c.name);

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDropIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDropIdx(null);
      return;
    }
    const newOrder = [...orderedNames];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, moved);
    onColumnOrderChange(newOrder);
    setDragIdx(null);
    setDropIdx(null);
  };

  const toggleVisibility = (colName: string) => {
    const next = new Set(hiddenColumns);
    if (next.has(colName)) {
      next.delete(colName);
    } else {
      next.add(colName);
    }
    onHiddenColumnsChange(next);
  };

  return ReactDOM.createPortal(
    <div
      ref={overlayRef}
      className="search-replace-overlay"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="search-replace-dialog column-manager-dialog">
        <div className="search-replace-header">
          <span className="search-replace-title">Manage Columns</span>
          <button className="search-replace-close" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <div className="column-manager-list">
          {orderedNames.map((colName, idx) => {
            const col = colMap.get(colName);
            if (!col) return null;
            const label = col.label ?? col.name;
            const isHidden = hiddenColumns.has(colName);
            const isDragOver = dropIdx === idx && dragIdx !== idx;

            return (
              <div
                key={colName}
                className={`column-manager-item${isDragOver ? " drag-over" : ""}${dragIdx === idx ? " dragging" : ""}`}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
              >
                <span className="column-manager-grip" aria-hidden="true">⠿</span>
                <label className="column-manager-label">
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={() => toggleVisibility(colName)}
                  />
                  {label}
                </label>
                {col.type && (
                  <span className="column-manager-type">{col.type}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="search-replace-footer">
          <button
            className="search-replace-btn"
            onClick={() => {
              onReset();
              onClose();
            }}
          >
            Reset
          </button>
          <span style={{ flex: 1 }} />
          <button className="search-replace-btn search-replace-btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

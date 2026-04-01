import React, { useState, useRef } from "react";
import ReactDOM from "react-dom";
import { ColumnConfig } from "./Types";
import { classNames } from "./classNames";
import { useStopMousedownPropagation } from "./useStopMousedownPropagation";

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
  /** Current number of sticky (fixed) columns. */
  numberOfStickyColumns?: number;
  /** Called when the user changes the number of sticky columns. */
  onStickyColumnsChange?: (count: number) => void;
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
  numberOfStickyColumns,
  onStickyColumnsChange,
}) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useStopMousedownPropagation(overlayRef, open);

  if (!open) return null;

  const colMap = new Map(columns.map((c) => [c.name, c]));
  const orderedNames = columnOrder.length > 0 ? columnOrder : columns.map((c) => c.name);

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
                className={classNames("column-manager-item", { "drag-over": isDragOver, "dragging": dragIdx === idx })}
                draggable
                onDragStart={() => setDragIdx(idx)}
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
          {onStickyColumnsChange && (
            <label className="column-manager-sticky-label">
              Fixed columns
              <select
                className="column-manager-sticky-select"
                value={numberOfStickyColumns ?? 0}
                onChange={(e) => onStickyColumnsChange(Number(e.target.value))}
              >
                {Array.from({ length: Math.min(orderedNames.length, 6) + 1 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? "None" : String(i)}</option>
                ))}
              </select>
            </label>
          )}
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

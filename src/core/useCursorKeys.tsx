import { CellAddr, Row, ColumnConfig, Cursor } from "./Types";
import React from "react";

export function useCursorKeys(
  cursorRef: React.MutableRefObject<Cursor>,
  setCursorRef: (value: Partial<Cursor>) => void,
  rows: Row[],
  columns: ColumnConfig<any>[],
) {
  const setColRow = (col: number, row: number, editing: boolean, shift: boolean, ctrl: boolean) => {
    if (row >= 0 && row < rows.length && col >= 0 && col < columns.length) {
      const newCursorState = ctrl
        ? {
            editing,
            filling: true,
            fillEnd: { colIdx: col, rowIdx: row },
          }
        : shift
        ? {
            editing,
            filling: false,
            selectionEnd: { colIdx: col, rowIdx: row },
            fillEnd: { colIdx: col, rowIdx: row },
          }
        : {
            editing,
            filling: false,
            cursor: { colIdx: col, rowIdx: row },
            selectionEnd: { colIdx: col, rowIdx: row },
            fillEnd: { colIdx: col, rowIdx: row },
          };
      setCursorRef(newCursorState);
    } else {
      setCursorRef({ editing });
    }
  };
  const jumpTab = (direction: number, editing: boolean) => {
    // wegen direktem DOM-Access muß in Listenern cursorRef.current verwendet werden
    const { colIdx, rowIdx } = cursorRef.current.selectionStart;
    if (direction > 0) {
      if (colIdx < columns.length - 1) {
        setColRow(colIdx + 1, rowIdx, editing, false, false);
      } else if (rowIdx < rows.length - 1) {
        setColRow(0, rowIdx + 1, editing, false, false);
      }
    } else {
      if (colIdx > 0) {
        setColRow(colIdx - 1, rowIdx, editing, false, false);
      } else if (rowIdx >= 0) {
        setColRow(columns.length - 1, rowIdx - 1, editing, false, false);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<any>) => {
    event.stopPropagation();
    event.preventDefault();
    const key = event.key;
    const cursor = cursorRef.current;
    const shift = event.shiftKey;
    const ctrl = event.ctrlKey;
    const { editing } = cursor;

    const { colIdx, rowIdx } = ctrl
      ? cursor.fillEnd
      : shift
      ? cursor.selectionEnd
      : cursor.selectionStart;
    if (key === "ArrowUp") {
      setColRow(colIdx, rowIdx - 1, false, shift, ctrl);
    } else if (key === "ArrowDown") {
      setColRow(colIdx, rowIdx + 1, false, shift, ctrl);
    } else if (key === "ArrowLeft") {
      setColRow(colIdx - 1, rowIdx, false, shift, ctrl);
    } else if (key === "ArrowRight") {
      setColRow(colIdx + 1, rowIdx, false, shift, ctrl);
    } else if (key === "Home" && colIdx >= 0 && !editing) {
      setColRow(0, rowIdx, editing, shift, ctrl);
    } else if (key === "End" && colIdx < columns.length - 1 && !editing) {
      setColRow(columns.length - 1, rowIdx, false, shift, ctrl);
    } else if (key === "PageUp" && rowIdx >= 0) {
      setColRow(colIdx, 0, false, shift, ctrl);
    } else if (key === "PageDown" && rowIdx < rows.length - 1) {
      setColRow(colIdx, rows.length - 1, false, shift, ctrl);
    } else {
      const { colIdx, rowIdx } = cursor.selectionStart;
      if (key === "Tab") {
        jumpTab(shift ? -1 : +1, false);
      } else if (key === "Enter") {
        if (editing) {
          setColRow(colIdx, rowIdx + 1, false, shift, ctrl);
        } else {
          setColRow(colIdx, rowIdx, true, shift, ctrl);
        }
      } else if (key === "F2") {
        setColRow(colIdx, rowIdx, true, shift, ctrl);
      } else if (key === "Escape") {
        setColRow(colIdx, rowIdx, false, shift, ctrl);
      }
    }
  };

  return handleKeyDown;
}

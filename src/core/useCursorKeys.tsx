import { CellAddr, Row, ColumnConfig, Cursor } from "./Types";
import React from "react";

export function useCursorKeys(
  cursorRef: React.MutableRefObject<Cursor>,
  setCursorRef: (value: Partial<Cursor>) => void,
  rows: Row[],
  columns: ColumnConfig<any>[],
  tableRef: React.RefObject<HTMLTableElement>,
) {
  const setColRow = (
    col: number,
    row: number,
    editing: boolean,
    shift: boolean,
    ctrl: boolean,
    initialEditValue: string | null = null,
  ) => {
    if (row >= 0 && row < rows.length && col >= 0 && col < columns.length) {
      const newCursorState = ctrl
        ? {
            editing,
            initialEditValue,
            filling: true,
            fillEnd: { colIdx: col, rowIdx: row },
          }
        : shift
        ? {
            editing,
            initialEditValue,
            filling: false,
            selectionEnd: { colIdx: col, rowIdx: row },
            fillEnd: { colIdx: col, rowIdx: row },
          }
        : {
            editing,
            initialEditValue,
            filling: false,
            selectionStart: { colIdx: col, rowIdx: row },
            selectionEnd: { colIdx: col, rowIdx: row },
            fillEnd: { colIdx: col, rowIdx: row },
          };
      setCursorRef(newCursorState);
    } else {
      setCursorRef({ editing });
    }
  };
  const jumpTab = (direction: number, editing: boolean) => {
    // Due to direct DOM access, cursorRef.current must be used in listeners
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
    const key = event.key;
    const shift = event.shiftKey;
    const ctrl = event.ctrlKey;
    const cursor = cursorRef.current;
    const { editing } = cursor;

    // We handle Escape explicitly even if it bubbles from an editor
    if (key === "Escape") {
      setColRow(
        cursor.selectionStart.colIdx,
        cursor.selectionStart.rowIdx,
        false,
        shift,
        ctrl,
        null,
      );
      const tableContainer = tableRef.current?.closest(".table-edit") as HTMLElement;
      if (tableContainer) {
        tableContainer.focus();
      }
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    // For other keys, if we are in edit mode, let them bubble (usually captured by editor)
    if (editing) {
      const commitAndFocus = (action: () => void) => {
        event.stopPropagation();
        event.preventDefault();
        action();
        const tableContainer = tableRef.current?.closest(".table-edit") as HTMLElement;
        if (tableContainer) tableContainer.focus();
      };

      if (key === "Enter") {
        commitAndFocus(() =>
          setColRow(cursor.selectionStart.colIdx, cursor.selectionStart.rowIdx + 1, false, shift, ctrl, null),
        );
      } else if (key === "Tab") {
        commitAndFocus(() => jumpTab(shift ? -1 : +1, false));
      } else if (key === "ArrowRight") {
        commitAndFocus(() =>
          setColRow(cursor.selectionStart.colIdx + 1, cursor.selectionStart.rowIdx, false, false, false, null),
        );
      }

      return;
    }

    // --- Navigation Mode ---
    event.stopPropagation();
    event.preventDefault();

    // If no cell is selected yet, treat cursor as (0,0) so the first key press works.
    const rawAddr = ctrl ? cursor.fillEnd : shift ? cursor.selectionEnd : cursor.selectionStart;
    const colIdx = rawAddr.colIdx < 0 ? 0 : rawAddr.colIdx;
    const rowIdx = rawAddr.rowIdx < 0 ? 0 : rawAddr.rowIdx;

    if (key === "ArrowUp") {
      setColRow(colIdx, rowIdx - 1, false, shift, ctrl);
    } else if (key === "ArrowDown") {
      setColRow(colIdx, rowIdx + 1, false, shift, ctrl);
    } else if (key === "ArrowLeft") {
      setColRow(colIdx - 1, rowIdx, false, shift, ctrl);
    } else if (key === "ArrowRight") {
      setColRow(colIdx + 1, rowIdx, false, shift, ctrl);
    } else if (key === "Home" && colIdx >= 0) {
      setColRow(0, rowIdx, false, shift, ctrl);
    } else if (key === "End" && colIdx < columns.length - 1) {
      setColRow(columns.length - 1, rowIdx, false, shift, ctrl);
    } else if (key === "PageUp" && rowIdx >= 0) {
      setColRow(colIdx, 0, false, shift, ctrl);
    } else if (key === "PageDown" && rowIdx < rows.length - 1) {
      setColRow(colIdx, rows.length - 1, false, shift, ctrl);
    } else {
      const isColumnReadOnly = columns[colIdx]?.readOnly === true;
      if (key === "Tab") {
        jumpTab(shift ? -1 : +1, false);
      } else if (key === "Enter" || key === "F2") {
        if (!isColumnReadOnly) {
          setColRow(colIdx, rowIdx, true, shift, ctrl, "");
        }
      } else if (key.length === 1 && !ctrl && !event.altKey && !event.metaKey) {
        if (!isColumnReadOnly) {
          // Start editing on printable character.
          // Use shift=false/ctrl=false: typing should NEVER trigger range selection,
          // even if Shift is held (e.g. for uppercase letters).
          setColRow(colIdx, rowIdx, true, false, false, key);
        }
      }
    }
  };

  return handleKeyDown;
}

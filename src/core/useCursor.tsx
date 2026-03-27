import { CellAddr, ColumnConfig, Cursor, Row } from "./Types";
import { useCallback, useEffect, useRef, useState } from "react";
import { directDomUpdateForCursor } from "./directDomUpdateForCursor";
import { useCursorKeys } from "./useCursorKeys";

export function useCursor(rows: Row[], columns: ColumnConfig<any>[], numberOfStickyColums: number) {
  const cursorRef = useRef<Cursor>({
    editing: false,
    filling: false,
    colSelection: false,
    selectionStart: { colIdx: -1, rowIdx: -1 },
    selectionEnd: { colIdx: -1, rowIdx: -1 },
    fillEnd: { colIdx: -1, rowIdx: -1 },
  });

  // React state to trigger re-renders for the editing cell
  const [editingCell, setEditingCell] = useState<CellAddr | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const selectionRectangleRef = useRef<HTMLDivElement>(null);
  const fillRectangleRef = useRef<HTMLDivElement>(null);
  const selectionRectangleStickyRef = useRef<HTMLDivElement>(null);
  const fillRectangleStickyRef = useRef<HTMLDivElement>(null);

  const setCursorRef = useCallback((partialCursor: Partial<Cursor>) => {
    const oldCursor = cursorRef.current;
    const newCursor: Cursor = (cursorRef.current = {
      ...oldCursor,
      ...partialCursor,
    });
    directDomUpdateForCursor(
      oldCursor,
      newCursor,
      numberOfStickyColums,
      viewportRef,
      tableRef,
      selectionRectangleRef,
      selectionRectangleStickyRef,
      fillRectangleRef,
      fillRectangleStickyRef,
    );

    // Update React state for editing cell to trigger re-renders
    const wasEditing = oldCursor.editing;
    const isEditing = newCursor.editing;
    const cellChanged =
      oldCursor.selectionStart.rowIdx !== newCursor.selectionStart.rowIdx ||
      oldCursor.selectionStart.colIdx !== newCursor.selectionStart.colIdx;
    if (wasEditing !== isEditing || (isEditing && cellChanged)) {
      setEditingCell(
        isEditing
          ? { rowIdx: newCursor.selectionStart.rowIdx, colIdx: newCursor.selectionStart.colIdx }
          : null,
      );
    }
  }, [numberOfStickyColums]);

  useEffect(() => {
    setCursorRef({
      editing: false,
      filling: false,
      colSelection: false,
      selectionStart: { colIdx: 0, rowIdx: 0 },
      selectionEnd: { colIdx: 0, rowIdx: 0 },
      fillEnd: { colIdx: 0, rowIdx: 0 },
    });
  }, [rows]);

  const handleKeyDown = useCursorKeys(cursorRef, setCursorRef, rows, columns);

  const customTableRef = useRef(null);

  useEffect(() => {
    if (customTableRef.current) {
      (customTableRef.current as HTMLDivElement).focus();
    }
  }, []);

  return {
    cursorRef,
    editingCell,
    viewportRef,
    tableRef,
    selectionRectangleRef,
    selectionRectangleStickyRef,
    fillRectangleRef,
    fillRectangleStickyRef,
    setCursorRef,
    handleKeyDown,
    customTableRef,
  };
}

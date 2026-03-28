import { CellAddr, ColumnConfig, Cursor, Row } from "./Types";
import { useCallback, useEffect, useRef, useState } from "react";
import { directDomUpdateForCursor } from "./directDomUpdateForCursor";
import { useCursorKeys } from "./useCursorKeys";

export function useCursor(rows: Row[], columns: ColumnConfig<any>[], numberOfStickyColums: number) {
  const cursorRef = useRef<Cursor>({
    editing: false,
    initialEditValue: null,
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
    const { selectionStart } = cursorRef.current;
    // Only reset to (0,0) if the cursor points past the end of the rows array.
    // rowIdx === -1 means "no selection" (e.g. user clicked outside) — leave it alone.
    // Normal cell edits change `rows` values but must not override the cursor
    // position that e.g. the Enter-commit already moved to the next row.
    const outOfBounds =
      selectionStart.rowIdx >= 0 &&
      selectionStart.rowIdx >= rows.length;

    if (outOfBounds) {
      setCursorRef({
        editing: false,
        initialEditValue: null,
        filling: false,
        colSelection: false,
        selectionStart: { colIdx: 0, rowIdx: 0 },
        selectionEnd: { colIdx: 0, rowIdx: 0 },
        fillEnd: { colIdx: 0, rowIdx: 0 },
      });
    } else {
      // Just close the editor – keep the cursor where it is.
      setCursorRef({ editing: false, initialEditValue: null });
    }
  }, [rows]);


  const handleKeyDown = useCursorKeys(cursorRef, setCursorRef, rows, columns, tableRef);

  const customTableRef = useRef(null);

  useEffect(() => {
    if (customTableRef.current) {
      (customTableRef.current as HTMLDivElement).focus();
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = customTableRef.current as HTMLElement | null;
      const target = e.target as HTMLElement | null;
      // Don't deselect when clicking inside the table or its context menu portal.
      if (el && !el.contains(target) && !target?.closest?.(".context-menu") && !target?.closest?.(".textarea-dialog-overlay")) {
        setCursorRef({
          editing: false,
          filling: false,
          colSelection: false,
          selectionStart: { rowIdx: -1, colIdx: -1 },
          selectionEnd: { rowIdx: -1, colIdx: -1 },
          fillEnd: { rowIdx: -1, colIdx: -1 },
        });
      }
    };
    document.addEventListener("mousedown", handler, { capture: true });
    return () => document.removeEventListener("mousedown", handler, { capture: true });
  }, [setCursorRef]);

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

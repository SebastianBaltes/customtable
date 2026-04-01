import { CellAddr, ColumnConfig, Cursor, Row, SelectionInfo } from "./Types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CursorRefs, directDomUpdateForCursor } from "./directDomUpdateForCursor";
import { useCursorKeys } from "./useCursorKeys";

const addrEqual = (a: CellAddr, b: CellAddr) => a.colIdx === b.colIdx && a.rowIdx === b.rowIdx;

/**
 * RAF-throttled mousemove dispatcher. Shared across all cells so that
 * rapid mousemove events during drag are batched to max once per frame.
 */
let _pendingMove: { setCursorRef: (p: Partial<Cursor>) => void; update: Partial<Cursor> } | null = null;
let _rafId = 0;

export function throttledMouseMove(
  setCursorRef: (partialCursor: Partial<Cursor>) => void,
  update: Partial<Cursor>,
) {
  _pendingMove = { setCursorRef, update };
  if (_rafId === 0) {
    _rafId = requestAnimationFrame(() => {
      _rafId = 0;
      if (_pendingMove) {
        _pendingMove.setCursorRef(_pendingMove.update);
        _pendingMove = null;
      }
    });
  }
}

export function useCursor(
  rows: Row[],
  columns: ColumnConfig<any>[],
  numberOfStickyColums: number,
  onSelectionChange?: (selection: SelectionInfo) => void,
) {
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

  // Keep callback in a ref so setCursorRef doesn't depend on it
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const cursorRefs: CursorRefs = useMemo(
    () => ({
      viewportRef,
      tableRef,
      selectionRectangleRef,
      selectionRectangleStickyRef,
      fillRectangleRef,
      fillRectangleStickyRef,
    }),
    [],
  );

  const setCursorRef = useCallback(
    (partialCursor: Partial<Cursor>) => {
      const oldCursor = cursorRef.current;
      const newCursor: Cursor = (cursorRef.current = {
        ...oldCursor,
        ...partialCursor,
      });
      directDomUpdateForCursor(oldCursor, newCursor, numberOfStickyColums, cursorRefs);

      // Update React state for editing cell to trigger re-renders
      const wasEditing = oldCursor.editing;
      const isEditing = newCursor.editing;
      const startChanged = !addrEqual(oldCursor.selectionStart, newCursor.selectionStart);
      if (wasEditing !== isEditing || (isEditing && startChanged)) {
        setEditingCell(
          isEditing
            ? { rowIdx: newCursor.selectionStart.rowIdx, colIdx: newCursor.selectionStart.colIdx }
            : null,
        );
      }

      // Fire onSelectionChange if the selection range changed
      if (onSelectionChangeRef.current) {
        const endChanged = !addrEqual(oldCursor.selectionEnd, newCursor.selectionEnd);
        if (startChanged || endChanged) {
          const hasSelection =
            newCursor.selectionStart.colIdx >= 0 && newCursor.selectionStart.rowIdx >= 0;
          const range = {
            startRow: Math.min(newCursor.selectionStart.rowIdx, newCursor.selectionEnd.rowIdx),
            endRow: Math.max(newCursor.selectionStart.rowIdx, newCursor.selectionEnd.rowIdx),
            startCol: Math.min(newCursor.selectionStart.colIdx, newCursor.selectionEnd.colIdx),
            endCol: Math.max(newCursor.selectionStart.colIdx, newCursor.selectionEnd.colIdx),
          };
          onSelectionChangeRef.current({ range, hasSelection });
        }
      }
    },
    [numberOfStickyColums, cursorRefs],
  );

  useEffect(() => {
    const { selectionStart } = cursorRef.current;
    // Only reset to (0,0) if the cursor points past the end of the rows array.
    // rowIdx === -1 means "no selection" (e.g. user clicked outside) — leave it alone.
    // Normal cell edits change `rows` values but must not override the cursor
    // position that e.g. the Enter-commit already moved to the next row.
    // Do NOT close the editor on every rows change — this would prevent
    // multi-combobox from committing immediately on each checkbox toggle.
    const outOfBounds = selectionStart.rowIdx >= 0 && selectionStart.rowIdx >= rows.length;

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
    }
  }, [rows]);

  const handleKeyDown = useCursorKeys(cursorRef, setCursorRef, rows, columns, tableRef);

  const gridDbEditorRef = useRef(null);

  useEffect(() => {
    if (gridDbEditorRef.current) {
      (gridDbEditorRef.current as HTMLDivElement).focus();
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = gridDbEditorRef.current as HTMLElement | null;
      const target = e.target as HTMLElement | null;
      // Don't deselect when clicking inside the table or its context menu portal.
      if (
        el &&
        !el.contains(target) &&
        !target?.closest?.(".context-menu") &&
        !target?.closest?.(".editor-dialog-overlay")
      ) {
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
    gridDbEditorRef,
  };
}

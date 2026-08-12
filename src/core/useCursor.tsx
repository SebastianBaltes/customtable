import { CellAddr, ColumnConfig, Cursor, Row, SelectionInfo } from "./Types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CursorRefs, directDomUpdateForCursor } from "./directDomUpdateForCursor";
import { useCursorKeys } from "./useCursorKeys";
import { activeBox, cursorBoxes } from "./selectionRanges";

const addrEqual = (a: CellAddr, b: CellAddr) => a.colIdx === b.colIdx && a.rowIdx === b.rowIdx;

/**
 * RAF-throttled mousemove dispatcher. Shared across all cells so that
 * rapid mousemove events during drag are batched to max once per frame.
 */
let _pendingMove: { setCursorRef: (p: Partial<Cursor>) => void; update: Partial<Cursor> } | null =
  null;
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
    extraRanges: [],
  });

  // React state to trigger re-renders for the editing cell
  const [editingCell, setEditingCell] = useState<CellAddr | null>(null);

  // Inline styles the header cells had before the column widths were frozen, so
  // they can be handed back untouched — an app may be driving them itself via
  // the columnWidths prop.
  const thStylesBeforeFreeze = useRef<(string | null)[] | null>(null);

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

  // Hold the column layout still for the duration of an edit. Entering edit mode
  // disturbs it twice over:
  //
  //   1. The edited cell's text is swapped for an `<input>` whose intrinsic
  //      width is the browser default (~20 characters), not the text width — so
  //      editing the widest cell of a column collapsed that column.
  //   2. Whenever the table is wider than its content (a grid stretched to the
  //      viewport), the browser distributes the surplus across the columns.
  //      Constraining a single column changes its share, so it ends up WIDER
  //      than the value it was pinned to and every other column loses a bit.
  //
  // Pinning one column can therefore not work; every width has to be held. The
  // widths go on the header cells as inline styles, which is how the column
  // resizing feature pins a column too. Doing it with an injected stylesheet of
  // `th:nth-child(n), td:nth-child(n)` rules instead cost ~230ms on a grid of
  // 26.000 cells, because every cell in the table has to be matched against
  // those selectors; the header-only write is ~30 elements.
  //
  // Fractional widths on purpose: offsetWidth rounds to whole pixels, and 28
  // columns rounded down move the table by several pixels — the very jump this
  // is meant to prevent.
  const freezeColumnWidths = useCallback((freeze: boolean) => {
    const table = tableRef.current;
    if (!table) return;
    const ths = Array.from(table.querySelectorAll<HTMLElement>("thead th"));

    if (!freeze) {
      const saved = thStylesBeforeFreeze.current;
      if (!saved) return;
      ths.forEach((th, i) => {
        const before = saved[i];
        if (before == null) th.removeAttribute("style");
        else th.setAttribute("style", before);
      });
      thStylesBeforeFreeze.current = null;
      return;
    }

    if (thStylesBeforeFreeze.current) return; // already frozen
    // Measure everything before writing anything: interleaving reads and writes
    // would force a reflow per column.
    const widths = ths.map((th) => th.getBoundingClientRect().width);
    if (!widths.length || !widths.every((w) => w > 0)) return;
    thStylesBeforeFreeze.current = ths.map((th) => th.getAttribute("style"));
    ths.forEach((th, i) => {
      // box-sizing makes the measured value mean the same thing on both ends:
      // the measurement is a border box, while width would otherwise size the
      // content box and every column would grow by its own padding.
      th.style.boxSizing = "border-box";
      th.style.width = `${widths[i]}px`;
      th.style.minWidth = `${widths[i]}px`;
      th.style.maxWidth = `${widths[i]}px`;
    });
  }, []);

  const setCursorRef = useCallback(
    (partialCursor: Partial<Cursor>) => {
      const oldCursor = cursorRef.current;
      // Moving the anchor means "start a fresh selection here" for every caller
      // that predates the Ctrl+click multi-selection (plain click, arrow keys,
      // Tab, focus, right-click outside the selection …). Those must not leave
      // the previously added areas behind, so the extra areas are dropped unless
      // the caller manages them itself by passing `extraRanges`.
      const resetExtras = "selectionStart" in partialCursor && !("extraRanges" in partialCursor);
      const newCursor: Cursor = (cursorRef.current = {
        ...oldCursor,
        ...partialCursor,
        ...(resetExtras ? { extraRanges: [] } : null),
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
        // Frozen here, still in the event handler, i.e. before React swaps the
        // cell's text for the editor input and the layout can move.
        freezeColumnWidths(isEditing);
      }

      // Fire onSelectionChange if the selection changed
      if (onSelectionChangeRef.current) {
        const endChanged = !addrEqual(oldCursor.selectionEnd, newCursor.selectionEnd);
        const extrasChanged = oldCursor.extraRanges !== newCursor.extraRanges;
        if (startChanged || endChanged || extrasChanged) {
          const hasSelection =
            newCursor.selectionStart.colIdx >= 0 && newCursor.selectionStart.rowIdx >= 0;
          onSelectionChangeRef.current({
            range: activeBox(newCursor),
            ranges: cursorBoxes(newCursor),
            hasSelection,
          });
        }
      }
    },
    [numberOfStickyColums, cursorRefs, freezeColumnWidths],
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
        extraRanges: [],
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

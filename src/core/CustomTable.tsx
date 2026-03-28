import React, { useMemo, useState } from "react";
import { CellMetaMap, ColumnConfig, CustomContextMenuItem, FilterState, Row, SortConfig, TableContextState } from "./Types";
import { forceUpdateCursorRect } from "./directDomUpdateForCursor";
import classNames from "classnames";
import { ContextMenu } from "./ContextMenu";
import { RowTable } from "./RowTable";
import { useStickyColumnsLeftChecker } from "./useStickColumnLeftsChecker";
import { useOnGridResize } from "./useGridResizeChecker";
import { useContextMenu } from "./useContextMenu";
import { useCursor } from "./useCursor";
import { useUndoRedo } from "./useUndoRedo";
import { TableTranslations, TranslationsContext, resolveTranslations } from "./TranslationsContext";

export const getCursorName = (prefix: string, hasCursor: boolean, editing: boolean) =>
  hasCursor ? prefix + (editing ? "edited" : "selected") : "";

export const defaultRowKey = (row: Row, rowIndex: number) => "" + rowIndex;

interface IRequiredProps {
  rows: Row[];
  columns: ColumnConfig<any>[];
}

interface IProps {
  /** Called with the full new rows array after every mutation. */
  onRowsChange: (rows: Row[]) => void;
  /** Called with newly created rows. May return a Promise – reject triggers rollback. */
  onCreateRows: (rows: Row[]) => void | Promise<void>;
  /** Called with the rows that were updated. May return a Promise – reject triggers rollback. */
  onUpdateRows: (rows: Row[]) => void | Promise<void>;
  /** Called with deleted rows. May return a Promise – reject triggers rollback. */
  onDeleteRows: (rows: Row[]) => void | Promise<void>;
  /** Called when undo is performed, with the newly restored full rows array. */
  onUndo: (recoveredRows: Row[]) => void | Promise<void>;
  /** Called when redo is performed, with the newly restored full rows array. */
  onRedo: (recoveredRows: Row[]) => void | Promise<void>;
  rowKey: (row: Row, rowIndex: number) => string;
  numberOfStickyColums: number;

  // --- Controlled filter / sort ---
  /** If provided, sort is controlled externally. */
  sortConfig: SortConfig;
  /** Called when the user changes sort. Required when sortConfig is controlled. */
  onSortChange: (config: SortConfig) => void;
  /** If provided, filters are controlled externally. */
  filters: FilterState;
  /** Called when the user changes a filter. Required when filters is controlled. */
  onFilterChange: (filters: FilterState) => void;

  // --- Cell / Row meta ---
  /** Meta information (style, disabled, title) per cell/row, keyed by rowKey then columnName. */
  cellMeta: CellMetaMap;

  /** Maximum string length before truncating and adding [...] to text cells */
  textEllipsisLength: number;
  /** Override any subset of the built-in UI strings (toolbar, dropdown hints, context menu). */
  translations: Partial<TableTranslations>;
  /**
   * Extra items appended to the built-in context menu.
   * Each item's `onClick` receives a snapshot of the current table state.
   * Use `"---"` to insert a separator between custom items.
   */
  extraContextMenuItems: CustomContextMenuItem[];
}

type CustomTableProps = IRequiredProps & Partial<IProps>;

export const CustomTable: React.FC<CustomTableProps> = React.memo(
  ({
    rows,
    columns,
    onRowsChange,
    onCreateRows,
    onUpdateRows,
    onDeleteRows,
    onUndo,
    onRedo,
    rowKey,
    numberOfStickyColums = 0,
    sortConfig: controlledSortConfig,
    onSortChange: controlledOnSortChange,
    filters: controlledFilters,
    onFilterChange: controlledOnFilterChange,
    cellMeta,
    textEllipsisLength,
    translations: translationsProp,
    extraContextMenuItems,
  }: CustomTableProps) => {
    const t = React.useMemo(() => resolveTranslations(translationsProp), [translationsProp]);
    const [tableId] = React.useState(() => `MkEu3ZWrGK${Math.floor(Math.random() * 1000000)}`);

    // --- Internal sort/filter state (used when not controlled) ---
    const [internalSortConfig, setInternalSortConfig] = React.useState<SortConfig>(null);
    const [internalFilters, setInternalFilters] = React.useState<FilterState>({});

    const isControlledSort = controlledSortConfig !== undefined;
    const isControlledFilter = controlledFilters !== undefined;

    const effectiveSortConfig = isControlledSort ? controlledSortConfig : internalSortConfig;
    const effectiveFilters = isControlledFilter ? controlledFilters! : internalFilters;

    const handleSortChange = React.useCallback(
      (config: SortConfig) => {
        if (isControlledSort) {
          controlledOnSortChange?.(config);
        } else {
          setInternalSortConfig(config);
        }
      },
      [isControlledSort, controlledOnSortChange],
    );

    const handleFilterChange = React.useCallback(
      (colName: string, value: string) => {
        if (isControlledFilter) {
          controlledOnFilterChange?.({ ...effectiveFilters, [colName]: value });
        } else {
          setInternalFilters((prev) => ({ ...prev, [colName]: value }));
        }
      },
      [isControlledFilter, controlledOnFilterChange, effectiveFilters],
    );

    // Row creation input
    const [newRowCount, setNewRowCount] = React.useState(1);

    // Pending state for async operations
    const [pending, setPending] = React.useState(false);

    // Undo/Redo
    const undoRedo = useUndoRedo();

    // --- rowKey helper ---
    const getRowKey = rowKey ?? defaultRowKey;

    // Index mapping for filtered/sorted rows
    const { displayRows, originalIndices } = React.useMemo(() => {
      let indexed = rows.map((row, idx) => ({ row, originalIdx: idx }));

      // Apply filters
      const activeFilters = Object.entries(effectiveFilters).filter(([, v]) => v.trim() !== "");
      if (activeFilters.length > 0) {
        indexed = indexed.filter(({ row }) =>
          activeFilters.every(([colName, filterVal]) => {
            const cellVal = row[colName];
            if (cellVal == null) return false;
            return String(cellVal).toLowerCase().includes(filterVal.toLowerCase());
          }),
        );
      }

      // Apply sorting
      if (effectiveSortConfig) {
        const { column, direction } = effectiveSortConfig;
        indexed.sort((a, b) => {
          const aVal = a.row[column];
          const bVal = b.row[column];
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
          return direction === "asc" ? cmp : -cmp;
        });
      }

      return {
        displayRows: indexed.map((i) => i.row),
        originalIndices: indexed.map((i) => i.originalIdx),
      };
    }, [rows, effectiveSortConfig, effectiveFilters]);

    const {
      cursorRef,
      editingCell,
      viewportRef,
      tableRef,
      selectionRectangleRef,
      selectionRectangleStickyRef,
      fillRectangleRef,
      fillRectangleStickyRef,
      setCursorRef,
      handleKeyDown: baseCursorKeyDown,
      customTableRef,
    } = useCursor(displayRows, columns, numberOfStickyColums);

    const { stickyColumnsLefts } = useStickyColumnsLeftChecker(
      tableRef,
      numberOfStickyColums,
      tableId,
    );

    useOnGridResize(tableRef, displayRows.length, columns.length, () => {
      forceUpdateCursorRect(
        cursorRef.current,
        numberOfStickyColums,
        viewportRef,
        tableRef,
        selectionRectangleRef,
        selectionRectangleStickyRef,
        fillRectangleRef,
        fillRectangleStickyRef,
      );
    });

    // --- Data mutation helpers ---
    const changeRows = React.useCallback(
      (newRows: Row[]) => {
        onRowsChange?.(newRows);
      },
      [onRowsChange],
    );

    /**
     * Wraps an async callback with pending-state and rollback on rejection.
     * `snapshotRows` is the rows state before the mutation (for rollback).
     */
    const withAsyncRollback = React.useCallback(
      (snapshotRows: Row[], callback: (() => void | Promise<void>) | undefined) => {
        if (!callback) return;
        const result = callback();
        if (result && typeof result.then === "function") {
          setPending(true);
          result
            .catch(() => {
              // Rollback: restore old rows
              changeRows(snapshotRows);
              // Also restore undo/redo internal stacks
              // Note: robust rollback of undo/redo stacks might require extra logic,
              // but replacing the array is safe.
            })
            .finally(() => {
              setPending(false);
            });
        }
      },
      [changeRows],
    );

    const detectAndFireChanges = React.useCallback(
      (oldRows: Row[], newRows: Row[]) => {
        let callback: (() => void | Promise<void>) | undefined;
        let diffObj: Row[] = [];
        
        if (newRows.length > oldRows.length) {
          // Rows were created in newRows (e.g. undo a delete)
          const oldSet = new Set(oldRows);
          diffObj = newRows.filter((r) => !oldSet.has(r));
          callback = onCreateRows ? () => onCreateRows(diffObj) : undefined;
        } else if (newRows.length < oldRows.length) {
          // Rows were deleted in newRows (e.g. undo a create)
          const newSet = new Set(newRows);
          diffObj = oldRows.filter((r) => !newSet.has(r));
          callback = onDeleteRows ? () => onDeleteRows(diffObj) : undefined;
        } else {
          // Rows were updated
          diffObj = newRows.filter((r, i) => r !== oldRows[i]);
          if (diffObj.length > 0) {
            callback = onUpdateRows ? () => onUpdateRows(diffObj) : undefined;
          }
        }
        
        return callback;
      },
      [onCreateRows, onDeleteRows, onUpdateRows],
    );

    const onCellChange = React.useCallback(
      (displayRowIdx: number, colName: string, value: any) => {
        const origIdx = originalIndices[displayRowIdx];
        if (origIdx == null) return;
        const oldValue = rows[origIdx][colName];
        if (oldValue === value) return; // Do nothing if unchanged
        
        const snapshot = rows;
        undoRedo.pushState(rows);
        const updatedRow = { ...rows[origIdx], [colName]: value };
        const newRows = rows.map((r, i) => (i === origIdx ? updatedRow : r));
        changeRows(newRows);
        withAsyncRollback(snapshot, onUpdateRows ? () => onUpdateRows([updatedRow]) : undefined);
      },
      [rows, originalIndices, changeRows, undoRedo, onUpdateRows, withAsyncRollback],
    );

    // --- Selection helpers ---
    const getSelectionRange = () => {
      const cursor = cursorRef.current;
      const startRow = Math.min(cursor.selectionStart.rowIdx, cursor.selectionEnd.rowIdx);
      const endRow = Math.max(cursor.selectionStart.rowIdx, cursor.selectionEnd.rowIdx);
      const startCol = Math.min(cursor.selectionStart.colIdx, cursor.selectionEnd.colIdx);
      const endCol = Math.max(cursor.selectionStart.colIdx, cursor.selectionEnd.colIdx);
      return { startRow, endRow, startCol, endCol };
    };

    // --- Copy & Paste ---
    const copySelection = React.useCallback(async () => {
      const { startRow, endRow, startCol, endCol } = getSelectionRange();
      const lines: string[] = [];
      for (let r = startRow; r <= endRow; r++) {
        const cells: string[] = [];
        for (let c = startCol; c <= endCol; c++) {
          const val = displayRows[r]?.[columns[c]?.name];
          cells.push(val == null ? "" : String(val));
        }
        lines.push(cells.join("\t"));
      }
      const text = lines.join("\n");
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // fallback: do nothing
      }
    }, [displayRows, columns]);

    const pasteAtCursor = React.useCallback(async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text) return;
        const cursor = cursorRef.current;
        const startRow = cursor.selectionStart.rowIdx;
        const startCol = cursor.selectionStart.colIdx;
        const pasteLines = text.split(/\r?\n/).filter((line, idx, arr) =>
          idx < arr.length - 1 || line !== "",
        );
        const snapshot = rows;
        undoRedo.pushState(rows);
        const newRows = [...rows];
        const changedOrigIndices = new Set<number>();
        for (let r = 0; r < pasteLines.length; r++) {
          const cells = pasteLines[r].split("\t");
          const displayIdx = startRow + r;
          const origIdx = originalIndices[displayIdx];
          if (origIdx == null || origIdx >= newRows.length) continue;
          const displayRowKey = getRowKey(displayRows[displayIdx], displayIdx);
          if (cellMeta?.[displayRowKey]?.row?.readOnly) continue;
          const newRow = { ...newRows[origIdx] };
          let rowChanged = false;
          for (let c = 0; c < cells.length; c++) {
            const colIdx = startCol + c;
            if (colIdx >= columns.length) break;
            const col = columns[colIdx];
            if (col.readOnly) continue;
            newRow[col.name] = cells[c];
            rowChanged = true;
          }
          if (rowChanged) {
            newRows[origIdx] = newRow;
            changedOrigIndices.add(origIdx);
          }
        }
        changeRows(newRows);
        if (onUpdateRows && changedOrigIndices.size > 0) {
          const updatedRows = [...changedOrigIndices].map((i) => newRows[i]);
          withAsyncRollback(snapshot, () => onUpdateRows(updatedRows));
        }
      } catch {
        // clipboard access denied
      }
    }, [rows, columns, originalIndices, displayRows, getRowKey, cellMeta, changeRows, undoRedo, onUpdateRows, withAsyncRollback]);

    const deleteSelection = React.useCallback(() => {
      const { startRow, endRow, startCol, endCol } = getSelectionRange();
      const snapshot = rows;
      undoRedo.pushState(rows);
      const newRows = [...rows];
      const changedOrigIndices = new Set<number>();
      for (let r = startRow; r <= endRow; r++) {
        const origIdx = originalIndices[r];
        if (origIdx == null) continue;
        const displayRowKey = getRowKey(displayRows[r], r);
        if (cellMeta?.[displayRowKey]?.row?.readOnly) continue;
        const newRow = { ...newRows[origIdx] };
        let rowChanged = false;
        for (let c = startCol; c <= endCol; c++) {
          const col = columns[c];
          if (col && !col.readOnly) {
            newRow[col.name] = "";
            rowChanged = true;
          }
        }
        if (rowChanged) {
          newRows[origIdx] = newRow;
          changedOrigIndices.add(origIdx);
        }
      }
      changeRows(newRows);
      if (onUpdateRows && changedOrigIndices.size > 0) {
        const updatedRows = [...changedOrigIndices].map((i) => newRows[i]);
        withAsyncRollback(snapshot, () => onUpdateRows(updatedRows));
      }
    }, [rows, columns, originalIndices, displayRows, getRowKey, cellMeta, changeRows, undoRedo, onUpdateRows, withAsyncRollback]);

    // --- Row creation ---
    const handleCreateRows = () => {
      const count = Math.max(1, newRowCount);
      const newRows: Row[] = [];
      for (let i = 0; i < count; i++) {
        const row: Row = {};
        columns.forEach((c) => {
          row[c.name] = "";
        });
        newRows.push(row);
      }
      const snapshot = rows;
      undoRedo.pushState(rows);
      changeRows([...rows, ...newRows]);
      if (onCreateRows) {
        withAsyncRollback(snapshot, () => onCreateRows(newRows));
      }
    };

    // --- Insert row above / below ---
    const handleInsertRowAbove = React.useCallback(() => {
      const { startRow } = getSelectionRange();
      const origIdx = originalIndices[startRow] ?? rows.length;
      const newRow: Row = {};
      columns.forEach((c) => { newRow[c.name] = ""; });
      const snapshot = rows;
      undoRedo.pushState(rows);
      const newRows = [...rows.slice(0, origIdx), newRow, ...rows.slice(origIdx)];
      changeRows(newRows);
      if (onCreateRows) withAsyncRollback(snapshot, () => onCreateRows([newRow]));
    }, [rows, columns, originalIndices, changeRows, undoRedo, onCreateRows, withAsyncRollback]);

    const handleInsertRowBelow = React.useCallback(() => {
      const { endRow } = getSelectionRange();
      const origIdx = originalIndices[endRow] ?? rows.length - 1;
      const newRow: Row = {};
      columns.forEach((c) => { newRow[c.name] = ""; });
      const snapshot = rows;
      undoRedo.pushState(rows);
      const newRows = [...rows.slice(0, origIdx + 1), newRow, ...rows.slice(origIdx + 1)];
      changeRows(newRows);
      if (onCreateRows) withAsyncRollback(snapshot, () => onCreateRows([newRow]));
    }, [rows, columns, originalIndices, changeRows, undoRedo, onCreateRows, withAsyncRollback]);

    // --- Row deletion ---
    const handleDeleteRows = React.useCallback(() => {
      const { startRow, endRow } = getSelectionRange();
      const origIndicesToDelete = new Set<number>();
      for (let r = startRow; r <= endRow; r++) {
        const origIdx = originalIndices[r];
        if (origIdx != null) origIndicesToDelete.add(origIdx);
      }
      if (origIndicesToDelete.size === 0) return;
      const snapshot = rows;
      undoRedo.pushState(rows);
      const deletedRows = rows.filter((_, i) => origIndicesToDelete.has(i));
      const newRows = rows.filter((_, i) => !origIndicesToDelete.has(i));
      changeRows(newRows);
      if (onDeleteRows) {
        withAsyncRollback(snapshot, () => onDeleteRows(deletedRows));
      }
      setCursorRef({
        editing: false,
        filling: false,
      });
    }, [rows, originalIndices, changeRows, undoRedo, onDeleteRows, setCursorRef, withAsyncRollback]);

    // --- Undo/Redo ---
    const handleUndo = React.useCallback(() => {
      const state = undoRedo.undo(rows);
      if (state) {
        changeRows(state);
        const normalCb = detectAndFireChanges(rows, state);
        const specificCb = onUndo ? () => onUndo(state) : undefined;
        
        if (normalCb || specificCb) {
          const comboCb = async () => {
            const promises: any[] = [];
            if (normalCb) promises.push(normalCb());
            if (specificCb) promises.push(specificCb());
            await Promise.all(promises);
          };
          withAsyncRollback(rows, comboCb);
        }
      }
    }, [undoRedo, rows, changeRows, detectAndFireChanges, onUndo, withAsyncRollback]);

    const handleRedo = React.useCallback(() => {
      const state = undoRedo.redo(rows);
      if (state) {
        changeRows(state);
        const normalCb = detectAndFireChanges(rows, state);
        const specificCb = onRedo ? () => onRedo(state) : undefined;
        
        if (normalCb || specificCb) {
          const comboCb = async () => {
            const promises: any[] = [];
            if (normalCb) promises.push(normalCb());
            if (specificCb) promises.push(specificCb());
            await Promise.all(promises);
          };
          withAsyncRollback(rows, comboCb);
        }
      }
    }, [undoRedo, rows, changeRows, detectAndFireChanges, onRedo, withAsyncRollback]);

    // --- Fill drag ---
    const handleFillDragComplete = React.useCallback(() => {
      const cursor = cursorRef.current;
      if (!cursor.filling) return;

      const startRow = Math.min(cursor.selectionStart.rowIdx, cursor.selectionEnd.rowIdx);
      const endRow = Math.max(cursor.selectionStart.rowIdx, cursor.selectionEnd.rowIdx);
      const startCol = Math.min(cursor.selectionStart.colIdx, cursor.selectionEnd.colIdx);
      const endCol = Math.max(cursor.selectionStart.colIdx, cursor.selectionEnd.colIdx);
      const { rowIdx: fillRowIdx, colIdx: fillColIdx } = cursor.fillEnd;

      const deltaBottom = fillRowIdx - endRow;
      const deltaTop = startRow - fillRowIdx;
      const deltaRight = fillColIdx - endCol;
      const deltaLeft = startCol - fillColIdx;
      const max = Math.max(1, deltaBottom, deltaRight, deltaLeft, deltaTop);

      if (max <= 0) return;

      const snapshot = rows;
      undoRedo.pushState(rows);
      const newRows = [...rows];
      const changedOrigIndices = new Set<number>();
      const sourceHeight = endRow - startRow + 1;
      const sourceWidth = endCol - startCol + 1;

      if (deltaBottom === max) {
        for (let r = endRow + 1; r <= fillRowIdx; r++) {
          const srcDisplayRow = startRow + ((r - endRow - 1) % sourceHeight);
          for (let c = startCol; c <= endCol; c++) {
            const origDst = originalIndices[r];
            const origSrc = originalIndices[srcDisplayRow];
            if (origDst == null || origSrc == null) continue;
            const col = columns[c];
            if (col && !col.readOnly) {
              if (newRows[origDst] === rows[origDst]) newRows[origDst] = { ...newRows[origDst] };
              newRows[origDst][col.name] = rows[origSrc][col.name];
              changedOrigIndices.add(origDst);
            }
          }
        }
      } else if (deltaTop === max) {
        for (let r = fillRowIdx; r < startRow; r++) {
          const srcDisplayRow = startRow + ((r - fillRowIdx) % sourceHeight);
          for (let c = startCol; c <= endCol; c++) {
            const origDst = originalIndices[r];
            const origSrc = originalIndices[srcDisplayRow];
            if (origDst == null || origSrc == null) continue;
            const col = columns[c];
            if (col && !col.readOnly) {
              if (newRows[origDst] === rows[origDst]) newRows[origDst] = { ...newRows[origDst] };
              newRows[origDst][col.name] = rows[origSrc][col.name];
              changedOrigIndices.add(origDst);
            }
          }
        }
      } else if (deltaRight === max) {
        for (let r = startRow; r <= endRow; r++) {
          for (let c = endCol + 1; c <= fillColIdx; c++) {
            const srcCol = startCol + ((c - endCol - 1) % sourceWidth);
            const origIdx = originalIndices[r];
            if (origIdx == null) continue;
            const col = columns[c];
            const srcColConfig = columns[srcCol];
            if (col && srcColConfig && !col.readOnly) {
              if (newRows[origIdx] === rows[origIdx]) newRows[origIdx] = { ...newRows[origIdx] };
              newRows[origIdx][col.name] = rows[origIdx][srcColConfig.name];
              changedOrigIndices.add(origIdx);
            }
          }
        }
      } else if (deltaLeft === max) {
        for (let r = startRow; r <= endRow; r++) {
          for (let c = fillColIdx; c < startCol; c++) {
            const srcCol = startCol + ((c - fillColIdx) % sourceWidth);
            const origIdx = originalIndices[r];
            if (origIdx == null) continue;
            const col = columns[c];
            const srcColConfig = columns[srcCol];
            if (col && srcColConfig && !col.readOnly) {
              if (newRows[origIdx] === rows[origIdx]) newRows[origIdx] = { ...newRows[origIdx] };
              newRows[origIdx][col.name] = rows[origIdx][srcColConfig.name];
              changedOrigIndices.add(origIdx);
            }
          }
        }
      }

      changeRows(newRows);
      if (onUpdateRows && changedOrigIndices.size > 0) {
        const updatedRows = [...changedOrigIndices].map((i) => newRows[i]);
        withAsyncRollback(snapshot, () => onUpdateRows(updatedRows));
      }
      setCursorRef({ filling: false });
    }, [rows, columns, originalIndices, changeRows, undoRedo, setCursorRef, onUpdateRows, withAsyncRollback]);

    // --- Enhanced key handling ---
    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<any>) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        const ctrl = event.ctrlKey || event.metaKey;

        if (ctrl && event.key === "z") {
          event.preventDefault();
          event.stopPropagation();
          handleUndo();
          return;
        }
        if (ctrl && event.key === "y") {
          event.preventDefault();
          event.stopPropagation();
          handleRedo();
          return;
        }
        if (ctrl && event.key === "c") {
          event.preventDefault();
          event.stopPropagation();
          copySelection();
          return;
        }
        if (ctrl && event.key === "v") {
          event.preventDefault();
          event.stopPropagation();
          pasteAtCursor();
          return;
        }
        if (event.key === "Delete" || event.key === "Backspace") {
          if (!cursorRef.current.editing) {
            event.preventDefault();
            event.stopPropagation();
            deleteSelection();
            return;
          }
        }

        // Enter on a Boolean cell (navigation mode) → toggle value, stay on cell
        if (event.key === "Enter" && !cursorRef.current.editing) {
          const { colIdx, rowIdx } = cursorRef.current.selectionStart;
          const col = columns[colIdx];
          const displayRowKey = getRowKey(displayRows[rowIdx], rowIdx);
          const isRowReadOnly = cellMeta?.[displayRowKey]?.row?.readOnly === true;
          if (col && col.type === "Boolean" && !col.readOnly && !isRowReadOnly) {
            event.preventDefault();
            event.stopPropagation();
            const currentValue = displayRows[rowIdx]?.[col.name];
            onCellChange(rowIdx, col.name, !currentValue);
            return;
          }
        }

        baseCursorKeyDown(event);
      },
      [pending, baseCursorKeyDown, handleUndo, handleRedo, copySelection, pasteAtCursor, deleteSelection, columns, displayRows, getRowKey, cellMeta, onCellChange],
    );

    // --- Mouse up for fill drag ---
    React.useEffect(() => {
      const onMouseUp = () => {
        if (cursorRef.current.filling) {
          handleFillDragComplete();
        }
      };
      document.addEventListener("mouseup", onMouseUp);
      return () => document.removeEventListener("mouseup", onMouseUp);
    }, [handleFillDragComplete]);

    // --- Auto-scroll while dragging (selection or fill) ---
    React.useEffect(() => {
      const SCROLL_ZONE = 40; // px from edge before scrolling starts
      const MAX_SPEED = 16;   // px per animation frame at full speed
      let rafId: number | null = null;
      let lastMouseY = 0;
      let lastMouseX = 0;

      const scroll = () => {
        const vp = viewportRef.current;
        if (!vp) return;
        const cursor = cursorRef.current;
        // Only auto-scroll while a drag (selection or fill) is in progress
        if (!cursor.filling && cursor.selectionStart.rowIdx === cursor.selectionEnd.rowIdx &&
            cursor.selectionStart.colIdx === cursor.selectionEnd.colIdx) {
          // No active drag; stop the loop
          rafId = null;
          return;
        }

        const rect = vp.getBoundingClientRect();
        let scrollY = 0;
        let scrollX = 0;

        // Bottom edge
        if (lastMouseY > rect.bottom - SCROLL_ZONE) {
          const dist = lastMouseY - (rect.bottom - SCROLL_ZONE);
          scrollY = Math.min(MAX_SPEED, Math.round((dist / SCROLL_ZONE) * MAX_SPEED));
        }
        // Top edge
        if (lastMouseY < rect.top + SCROLL_ZONE) {
          const dist = (rect.top + SCROLL_ZONE) - lastMouseY;
          scrollY = -Math.min(MAX_SPEED, Math.round((dist / SCROLL_ZONE) * MAX_SPEED));
        }
        // Right edge
        if (lastMouseX > rect.right - SCROLL_ZONE) {
          const dist = lastMouseX - (rect.right - SCROLL_ZONE);
          scrollX = Math.min(MAX_SPEED, Math.round((dist / SCROLL_ZONE) * MAX_SPEED));
        }
        // Left edge
        if (lastMouseX < rect.left + SCROLL_ZONE) {
          const dist = (rect.left + SCROLL_ZONE) - lastMouseX;
          scrollX = -Math.min(MAX_SPEED, Math.round((dist / SCROLL_ZONE) * MAX_SPEED));
        }

        if (scrollY !== 0 || scrollX !== 0) {
          vp.scrollBy({ top: scrollY, left: scrollX });
        }

        rafId = requestAnimationFrame(scroll);
      };

      const onMouseMove = (e: MouseEvent) => {
        lastMouseY = e.clientY;
        lastMouseX = e.clientX;
        if (e.buttons === 1 && rafId === null) {
          rafId = requestAnimationFrame(scroll);
        }
      };

      const onMouseUp = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      return () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    }, []); // viewportRef and cursorRef are stable refs – no deps needed


    // Stable getter so custom item handlers always see fresh state at click time.
    const contextStateRef = React.useRef<() => TableContextState>(() => ({
      selectionRange: { startRow: 0, endRow: 0, startCol: 0, endCol: 0 },
      selectedRows: [],
      displayRows: [],
      rows: [],
      columns: [],
    }));
    contextStateRef.current = () => {
      const range = getSelectionRange();
      const selectedRows: Row[] = [];
      for (let r = range.startRow; r <= range.endRow; r++) {
        if (displayRows[r]) selectedRows.push(displayRows[r]);
      }
      return { selectionRange: range, selectedRows, displayRows, rows, columns, cellMeta };
    };

    const { contextMenu, openContextMenu, closeContextMenu, contextMenuItems } = useContextMenu(
      cursorRef,
      copySelection,
      pasteAtCursor,
      deleteSelection,
      handleDeleteRows,
      handleInsertRowAbove,
      handleInsertRowBelow,
      extraContextMenuItems ?? [],
      contextStateRef,
      t,
    );

    const selectionRectangleDraggerOnMouseDown = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setCursorRef({
        filling: true,
      });
    };

    return (
      <TranslationsContext.Provider value={t}>
      <div
        ref={customTableRef}
        className={classNames("custom-table", pending && "pending", textEllipsisLength && "has-ellipsis")}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {stickyColumnsLefts.css != null && (
          <style dangerouslySetInnerHTML={{ __html: stickyColumnsLefts.css }} />
        )}
        <div ref={viewportRef} className="custom-table-viewport" onContextMenu={(event) => {
          // If right-clicked on a cell outside the current selection, select it first.
          const td = (event.target as HTMLElement).closest<HTMLElement>("td[data-row-idx]");
          if (td) {
            const rowIdx = parseInt(td.dataset.rowIdx ?? "-1");
            const colIdx = parseInt(td.dataset.colIdx ?? "-1");
            if (rowIdx >= 0 && colIdx >= 0) {
              const { selectionStart, selectionEnd } = cursorRef.current;
              const startRow = Math.min(selectionStart.rowIdx, selectionEnd.rowIdx);
              const endRow = Math.max(selectionStart.rowIdx, selectionEnd.rowIdx);
              const startCol = Math.min(selectionStart.colIdx, selectionEnd.colIdx);
              const endCol = Math.max(selectionStart.colIdx, selectionEnd.colIdx);
              const inSelection = rowIdx >= startRow && rowIdx <= endRow && colIdx >= startCol && colIdx <= endCol;
              if (!inSelection) {
                setCursorRef({
                  editing: false,
                  initialEditValue: null,
                  selectionStart: { rowIdx, colIdx },
                  selectionEnd: { rowIdx, colIdx },
                  fillEnd: { rowIdx, colIdx },
                  filling: false,
                  colSelection: false,
                });
              }
            }
          }
          openContextMenu(event);
        }}>
          <RowTable
            {...{
              tableId,
              tableRef,
              cursorRef,
              setCursorRef,
              rows: displayRows,
              columns,
              rowKey,
              numberOfStickyColums,
              onCellChange,
              editingCell,
              sortConfig: effectiveSortConfig,
              onSortChange: handleSortChange,
              filters: effectiveFilters,
              onFilterChange: handleFilterChange,
              cellMeta,
              getRowKey,
              textEllipsisLength,
            }}
            stickyPortal={
              numberOfStickyColums === 0
                ? undefined
                : () => (
                    <>
                      <div
                        ref={selectionRectangleStickyRef}
                        id="selection-rectangle-sticky"
                        className="selection-rectangle"
                      >
                        <div
                          className="selection-rectangle-dragger"
                          onMouseDown={selectionRectangleDraggerOnMouseDown}
                        ></div>
                      </div>
                      <div
                        ref={fillRectangleStickyRef}
                        id="fill-rectangle-sticky"
                        className="fill-rectangle"
                      ></div>
                    </>
                  )
            }
          />
          <div ref={selectionRectangleRef} id="selection-rectangle" className="selection-rectangle">
            <div
              className="selection-rectangle-dragger"
              onMouseDown={selectionRectangleDraggerOnMouseDown}
            ></div>
          </div>
          <div ref={fillRectangleRef} id="fill-rectangle" className="fill-rectangle"></div>
          {contextMenu.visible && (
            <ContextMenu
              position={contextMenu.position}
              items={contextMenuItems}
              hideMenu={closeContextMenu}
            />
          )}
        </div>
        <div className="custom-table-toolbar">
          <span>+</span>
          <input
            type="number"
            min={1}
            value={newRowCount}
            onChange={(e) => setNewRowCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="toolbar-input"
            onKeyDown={(e) => e.stopPropagation()}
          />
          <button onClick={handleCreateRows} className="toolbar-button" disabled={pending}>
            {t["Create Rows"]}
          </button>
        </div>
      </div>
      </TranslationsContext.Provider>
    );
  },
);

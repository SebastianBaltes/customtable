import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CellMetaMap, ColumnConfig, FilterState, Row, SortConfig, TableStatus } from "./Types";
import { InflightEditTracker } from "./InflightEditTracker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AsyncTableSnapshot {
  items: Array<{ row: Row; origIdx: number }>;
  rows: Row[];
  sortConfig: SortConfig;
  filters: FilterState;
  totalFilteredRows: number;
}

export interface UseAsyncTableStateOptions {
  /** All rows (unfiltered, unsorted source data). */
  allRows: Row[];
  /** Column definitions (used for inflight tracking + merge). */
  columns: ColumnConfig<any>[];
  /** Current sort config (user-requested, updates immediately). */
  sortConfig: SortConfig;
  /** Current filters (user-requested, updates immediately). */
  filters: FilterState;
  /** Row key function. */
  rowKeyFn: (row: Row, idx: number) => string;

  // --- Pagination ---
  /** Current page items with origIdx mapping. */
  pageItems: Array<{ row: Row; origIdx: number }>;
  /** Current page rows (derived from pageItems). */
  pageRows: Row[];
  /** Total number of filtered rows (for pagination display). */
  totalFilteredRows: number;

  // --- Async config ---
  /** Simulated backend delay in ms. 0 = synchronous (no deferral). */
  delayMs: number;
  /** Optional: transform backend rows before merging (e.g. server-side normalization). */
  transformBackendRows?: (rows: Row[]) => Row[];
  /** Optional: validate rows after successful update, returning cellMeta for errors. */
  validateRows?: (
    rows: Row[],
    rowKeyFn: (row: Row, idx: number) => string,
  ) => CellMetaMap;
  /** How to handle connection errors. "rollback" throws (CustomTable rolls back). "keep" resolves (data stays, marked unsaved). Default: "keep". */
  connectionErrorStrategy?: "rollback" | "keep";
  /** Called when stale data is detected after a backend response. Useful for triggering shake animation. */
  onStaleDetected?: () => void;
}

export interface UseAsyncTableStateResult {
  // --- Props to pass to CustomTable ---
  /** Rows to display (from confirmed snapshot). */
  displayRows: Row[];
  /** Sort config to pass to CustomTable (confirmed). */
  displaySortConfig: SortConfig;
  /** Filters to pass to CustomTable (confirmed). */
  displayFilters: FilterState;
  /** Total filtered rows for pagination (confirmed). */
  displayTotalFilteredRows: number;
  /** Status indicator for the toolbar. */
  status: TableStatus | undefined;
  /** Whether a deferred load is in progress. */
  loading: boolean;
  /** Column with pending sort (for spinner). */
  pendingSortColumn: string | undefined;
  /** Columns with pending filter changes (for spinners). */
  pendingFilterColumns: string[] | undefined;
  /** Merged cellMeta (validation + stale + unsaved). Merge with your static cellMeta. */
  asyncCellMeta: CellMetaMap;

  // --- Display items (for rowKey / onRowsChange mapping) ---
  /** Page items from the confirmed snapshot (with origIdx). */
  displayItems: Array<{ row: Row; origIdx: number }>;

  // --- Callbacks to wire into CustomTable ---
  /** Pass as onRowsChange — handles optimistic patch + inflight tracking. */
  handleRowsChange: (newRows: Row[]) => void;
  /** Pass as onUpdateRows — handles batch resolve + retry + validation. */
  handleUpdateRows: (updatedRows: Row[]) => void | Promise<void>;
  /** Pass as onCreateRows / onDeleteRows / onUndo / onRedo. */
  handleAsyncOp: (label: string) => void | Promise<void>;

  // --- State setters for external use ---
  /** Set a custom error message. */
  setError: (msg: string | null) => void;
  /** Mark specific cells as unsaved (connection error scenario). */
  markCellsUnsaved: (cells: Array<{ rowKey: string; colName: string }>) => void;
  /** Get the last tracked batch (for use in custom onUpdateRows). */
  consumeLastBatch: () => Array<{ rowKey: string; colName: string }>;
  /** Resolve a batch of inflight edits (call when backend confirms). */
  resolveBatch: (batch: Array<{ rowKey: string; colName: string }>) => void;
  /** Clear all async meta (validation, stale, unsaved). */
  clearAsyncMeta: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function deepMergeMeta(...sources: CellMetaMap[]): CellMetaMap {
  const merged: CellMetaMap = {};
  for (const source of sources) {
    for (const [rowKey, entry] of Object.entries(source)) {
      if (!merged[rowKey]) {
        merged[rowKey] = entry;
      } else {
        merged[rowKey] = {
          ...merged[rowKey],
          cells: { ...merged[rowKey].cells, ...entry.cells },
        };
      }
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAsyncTableState(opts: UseAsyncTableStateOptions): UseAsyncTableStateResult {
  const {
    allRows,
    columns,
    sortConfig,
    filters,
    rowKeyFn,
    pageItems,
    pageRows,
    totalFilteredRows,
    delayMs,
    transformBackendRows,
    validateRows,
    connectionErrorStrategy = "keep",
    onStaleDetected,
  } = opts;

  const isAsync = delayMs > 0;

  // --- Snapshot ---
  const currentSnapshot = useMemo<AsyncTableSnapshot>(
    () => ({ items: pageItems, rows: pageRows, sortConfig, filters, totalFilteredRows }),
    [pageItems, pageRows, sortConfig, filters, totalFilteredRows],
  );

  const [confirmed, setConfirmed] = useState<AsyncTableSnapshot>(currentSnapshot);
  const [loading, setLoading] = useState(false);

  // --- Inflight tracking ---
  const onStaleDetectedRef = useRef(onStaleDetected);
  onStaleDetectedRef.current = onStaleDetected;

  const trackerRef = useRef(new InflightEditTracker());
  const lastBatchRef = useRef<Array<{ rowKey: string; colName: string }>>([]);
  const lastValidationRowsRef = useRef<Array<{ row: Row; rowKey: string }>>([]);

  // --- Dynamic cellMeta ---
  const [validationMeta, setValidationMeta] = useState<CellMetaMap>({});
  const [staleMeta, setStaleMeta] = useState<CellMetaMap>({});
  const [unsavedMeta, setUnsavedMeta] = useState<CellMetaMap>({});

  const asyncCellMeta = useMemo(
    () => deepMergeMeta(validationMeta, staleMeta, unsavedMeta),
    [validationMeta, staleMeta, unsavedMeta],
  );

  // --- Status ---
  const [lastError, setLastError] = useState<string | null>(null);
  const staleCount = useMemo(() => Object.keys(staleMeta).length, [staleMeta]);
  const unsavedCount = useMemo(() => Object.keys(unsavedMeta).length, [unsavedMeta]);

  const status = useMemo<TableStatus | undefined>(() => {
    if (!isAsync) return undefined;
    if (lastError) return { severity: "error", text: lastError };
    if (loading) return { severity: "info", text: "Loading..." };
    if (unsavedCount > 0)
      return { severity: "warning", text: `Unsaved: ${unsavedCount} row(s) pending` };
    if (staleCount > 0)
      return { severity: "warning", text: `Stale data: ${staleCount} row(s) changed by server` };
    return { severity: "ok", text: "Synced" };
  }, [isAsync, loading, lastError, staleCount, unsavedCount]);

  // Auto-clear error (unless unsaved changes exist)
  useEffect(() => {
    if (!lastError || unsavedCount > 0) return;
    const timer = setTimeout(() => setLastError(null), 8000);
    return () => clearTimeout(timer);
  }, [lastError, unsavedCount]);

  // --- Deferred snapshot effect ---
  useEffect(() => {
    if (!isAsync) {
      setConfirmed(currentSnapshot);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      const backendRows = transformBackendRows
        ? transformBackendRows(currentSnapshot.rows)
        : currentSnapshot.rows;

      const backendSnapshot: AsyncTableSnapshot = {
        ...currentSnapshot,
        rows: backendRows,
        items: currentSnapshot.items.map((item, i) => ({ ...item, row: backendRows[i] })),
      };

      setConfirmed((prev) => {
        const tracker = trackerRef.current;
        const mergedRows = tracker.hasInflight()
          ? tracker.mergeRows(
              prev.rows,
              backendSnapshot.rows,
              columns,
              (_r, i) => "" + (prev.items[i]?.origIdx ?? i),
              (_r, i) => "" + (backendSnapshot.items[i]?.origIdx ?? i),
            )
          : backendSnapshot.rows;

        // Stale detection by row key
        const newStale: CellMetaMap = {};
        const prevByKey = new Map<string, Row>();
        prev.rows.forEach((row, i) => {
          prevByKey.set("" + (prev.items[i]?.origIdx ?? i), row);
        });
        mergedRows.forEach((mergedRow, i) => {
          const rk = "" + (backendSnapshot.items[i]?.origIdx ?? i);
          const prevRow = prevByKey.get(rk);
          if (!prevRow) return;
          for (const col of columns) {
            if (col.serverOwned) continue;
            if (prevRow[col.name] !== mergedRow[col.name] && tracker.getCount(rk, col.name) === 0) {
              if (!newStale[rk]) newStale[rk] = { cells: {} };
              newStale[rk].cells![col.name] = {
                className: "cell-stale",
                title: `Server changed: "${mergedRow[col.name]}"`,
              };
            }
          }
        });
        setStaleMeta(newStale);
        if (Object.keys(newStale).length > 0) {
          onStaleDetectedRef.current?.();
        }

        return {
          ...backendSnapshot,
          rows: mergedRows,
          items: backendSnapshot.items.map((item, i) => ({ ...item, row: mergedRows[i] })),
        };
      });
      setLoading(false);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [currentSnapshot, isAsync, delayMs, columns, transformBackendRows]);

  // --- Display state ---
  const display = isAsync ? confirmed : currentSnapshot;

  // --- Pending indicators ---
  const pendingSortColumn = useMemo(() => {
    if (!loading || !isAsync) return undefined;
    const reqStr = JSON.stringify(sortConfig);
    const dispStr = JSON.stringify(display.sortConfig);
    if (reqStr !== dispStr) {
      // Show spinner on the first differing sort column
      return sortConfig?.[0]?.column ?? display.sortConfig?.[0]?.column;
    }
    return undefined;
  }, [loading, isAsync, sortConfig, display.sortConfig]);

  const pendingFilterColumns = useMemo(() => {
    if (!loading || !isAsync) return undefined;
    return [
      ...Object.keys(filters).filter((k) => filters[k] !== display.filters[k]),
      ...Object.keys(display.filters).filter((k) => display.filters[k] && !(k in filters)),
    ];
  }, [loading, isAsync, filters, display.filters]);

  // --- Callbacks ---

  const handleRowsChange = useCallback(
    (newRows: Row[]) => {
      if (isAsync && newRows.length === display.rows.length) {
        const kf = (_r: Row, i: number) => "" + (display.items[i]?.origIdx ?? i);
        lastBatchRef.current = trackerRef.current.trackChanges(
          display.rows, newRows, columns, kf,
        );
        const changedKeys = new Set(lastBatchRef.current.map((c) => c.rowKey));
        lastValidationRowsRef.current = newRows
          .map((row, i) => ({ row, rowKey: kf(row, i) }))
          .filter((e) => changedKeys.has(e.rowKey));
      }

      // Optimistic patch
      if (isAsync) {
        setConfirmed((prev) => ({
          ...prev,
          rows: newRows,
          items:
            newRows.length === prev.items.length
              ? prev.items.map((item, i) => ({ ...item, row: newRows[i] }))
              : newRows.map((row, i) =>
                  i < prev.items.length
                    ? { ...prev.items[i], row }
                    : { row, origIdx: i },
                ),
          totalFilteredRows:
            newRows.length !== prev.rows.length
              ? prev.totalFilteredRows + (newRows.length - prev.rows.length)
              : prev.totalFilteredRows,
        }));
      }
    },
    [isAsync, display, columns],
  );

  const handleUpdateRows = useCallback(
    (updatedRows: Row[]): void | Promise<void> => {
      if (!isAsync) return;

      const batch = [...lastBatchRef.current];
      const validationSnapshot = [...lastValidationRowsRef.current];
      lastBatchRef.current = [];
      lastValidationRowsRef.current = [];

      if (connectionErrorStrategy === "keep") {
        // For "keep" strategy: don't reject — resolve and mark unsaved
        // (The actual error simulation is done by the consumer passing delayMs/transformBackendRows)
      }

      setLastError(null);
      return delay(delayMs).then(() => {
        trackerRef.current.resolveBatch(batch);

        // Validation
        if (validateRows && validationSnapshot.length > 0) {
          const vMeta = validateRows(
            validationSnapshot.map((e) => e.row),
            (_r, i) => validationSnapshot[i].rowKey,
          );
          setValidationMeta((prev) => {
            const next = { ...prev };
            for (const entry of validationSnapshot) delete next[entry.rowKey];
            return { ...next, ...vMeta };
          });
          const errorCount = Object.keys(vMeta).length;
          if (errorCount > 0) {
            setLastError(`Validation: ${errorCount} row(s) with errors`);
          }
        }
      });
    },
    [isAsync, delayMs, validateRows, connectionErrorStrategy],
  );

  const handleAsyncOp = useCallback(
    (_label: string): void | Promise<void> => {
      if (!isAsync) return;
      setLastError(null);
      return delay(delayMs);
    },
    [isAsync, delayMs],
  );

  const markCellsUnsaved = useCallback(
    (cells: Array<{ rowKey: string; colName: string }>) => {
      setUnsavedMeta((prev) => {
        const next = { ...prev };
        for (const { rowKey, colName } of cells) {
          if (!next[rowKey]) next[rowKey] = { cells: {} };
          else next[rowKey] = { ...next[rowKey], cells: { ...next[rowKey].cells } };
          next[rowKey].cells![colName] = {
            className: "cell-unsaved",
            title: "Unsaved — connection error, retrying...",
          };
        }
        return next;
      });
    },
    [],
  );

  const consumeLastBatch = useCallback(() => {
    const batch = [...lastBatchRef.current];
    lastBatchRef.current = [];
    lastValidationRowsRef.current = [];
    return batch;
  }, []);

  const resolveBatch = useCallback(
    (batch: Array<{ rowKey: string; colName: string }>) => {
      trackerRef.current.resolveBatch(batch);
    },
    [],
  );

  const clearAsyncMeta = useCallback(() => {
    setValidationMeta({});
    setStaleMeta({});
    setUnsavedMeta({});
    setLastError(null);
  }, []);

  return {
    displayRows: display.rows,
    displaySortConfig: display.sortConfig,
    displayFilters: display.filters,
    displayTotalFilteredRows: display.totalFilteredRows,
    displayItems: display.items,
    status,
    loading: loading && isAsync,
    pendingSortColumn,
    pendingFilterColumns,
    asyncCellMeta,
    handleRowsChange,
    handleUpdateRows,
    handleAsyncOp,
    setError: setLastError,
    markCellsUnsaved,
    consumeLastBatch,
    resolveBatch,
    clearAsyncMeta,
  };
}

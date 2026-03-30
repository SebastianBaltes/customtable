import { ColumnConfig, Row } from "./Types";

/**
 * Tracks per-cell inflight edit counts to safely merge backend data
 * with optimistic local edits.
 *
 * Usage:
 * - `trackEdit(rowKey, colName)` — call when a cell edit is committed
 * - `resolveEdit(rowKey, colName)` — call when the backend confirms the edit
 * - `mergeRows(localRows, backendRows, rowKeyFn, columns)` — merge backend
 *   data without overwriting inflight user edits
 *
 * Server-owned columns (`serverOwned: true`) are always taken from the
 * backend, regardless of inflight counters.
 */
export class InflightEditTracker {
  private counters = new Map<string, Map<string, number>>();

  /** Increment the inflight counter for a cell. */
  trackEdit(rowKey: string, colName: string): void {
    if (!this.counters.has(rowKey)) this.counters.set(rowKey, new Map());
    const cellMap = this.counters.get(rowKey)!;
    cellMap.set(colName, (cellMap.get(colName) ?? 0) + 1);
  }

  /** Decrement the inflight counter for a cell (on backend confirmation). */
  resolveEdit(rowKey: string, colName: string): void {
    const cellMap = this.counters.get(rowKey);
    if (!cellMap) return;
    const count = (cellMap.get(colName) ?? 0) - 1;
    if (count <= 0) {
      cellMap.delete(colName);
    } else {
      cellMap.set(colName, count);
    }
    if (cellMap.size === 0) this.counters.delete(rowKey);
  }

  /** Track all changed cells between two row snapshots. Returns the changed cells. */
  trackChanges(
    oldRows: Row[],
    newRows: Row[],
    columns: ColumnConfig<any>[],
    rowKeyFn: (row: Row, idx: number) => string,
  ): Array<{ rowKey: string; colName: string }> {
    const changed: Array<{ rowKey: string; colName: string }> = [];
    const len = Math.min(oldRows.length, newRows.length);
    for (let i = 0; i < len; i++) {
      const rowKey = rowKeyFn(newRows[i], i);
      for (const col of columns) {
        if (newRows[i][col.name] !== oldRows[i][col.name]) {
          this.trackEdit(rowKey, col.name);
          changed.push({ rowKey, colName: col.name });
        }
      }
    }
    return changed;
  }

  /** Resolve a batch of previously tracked changes. */
  resolveBatch(batch: Array<{ rowKey: string; colName: string }>): void {
    for (const { rowKey, colName } of batch) {
      this.resolveEdit(rowKey, colName);
    }
  }

  /** Get the inflight count for a specific cell. */
  getCount(rowKey: string, colName: string): number {
    return this.counters.get(rowKey)?.get(colName) ?? 0;
  }

  /** Check if any cell has inflight edits. */
  hasInflight(): boolean {
    return this.counters.size > 0;
  }

  /**
   * Merge backend rows with local rows, preserving inflight user edits.
   *
   * For each cell:
   * - `serverOwned: true` → always use backend value
   * - inflight counter > 0  → keep local value (user edit not yet confirmed)
   * - inflight counter === 0 → use backend value
   */
  mergeRows(
    localRows: Row[],
    backendRows: Row[],
    columns: ColumnConfig<any>[],
    localRowKeyFn: (row: Row, idx: number) => string,
    backendRowKeyFn: (row: Row, idx: number) => string,
  ): Row[] {
    if (!this.hasInflight()) return backendRows;

    // Build lookup: rowKey → local row
    const localByKey = new Map<string, Row>();
    localRows.forEach((row, i) => localByKey.set(localRowKeyFn(row, i), row));

    return backendRows.map((backendRow, i) => {
      const rowKey = backendRowKeyFn(backendRow, i);
      const localRow = localByKey.get(rowKey);
      const cellMap = this.counters.get(rowKey);

      // No inflight edits for this row → use backend as-is
      if (!cellMap || cellMap.size === 0 || !localRow) return backendRow;

      // Merge cell by cell
      const merged: Row = { ...backendRow };
      for (const col of columns) {
        if (col.serverOwned) continue; // backend always wins
        if ((cellMap.get(col.name) ?? 0) > 0) {
          merged[col.name] = localRow[col.name]; // keep local
        }
      }
      return merged;
    });
  }
}

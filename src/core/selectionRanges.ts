import { CellAddr, Cursor, RangeBox, SelectionRect } from "./Types";

/**
 * Pure helpers around the cursor's selection areas.
 *
 * The cursor keeps the *active* area in `selectionStart`/`selectionEnd` (the one
 * Shift+click, Shift+arrow and the fill handle extend) and every additional,
 * disjoint area added with Ctrl/Cmd+click in `extraRanges`. Everything that acts
 * on "the selection" (copy, paste, clear, delete rows, search&replace, the
 * `onSelectionChange` callback) goes through the helpers below so it sees all
 * areas, not just the active one.
 */

const addrValid = (addr: CellAddr) => addr.rowIdx >= 0 && addr.colIdx >= 0;

/** Normalizes an anchor/focus pair into a box with start <= end. */
export function rangeBox(rect: SelectionRect): RangeBox {
  return {
    startRow: Math.min(rect.start.rowIdx, rect.end.rowIdx),
    endRow: Math.max(rect.start.rowIdx, rect.end.rowIdx),
    startCol: Math.min(rect.start.colIdx, rect.end.colIdx),
    endCol: Math.max(rect.start.colIdx, rect.end.colIdx),
  };
}

/** The cursor's active area, or null while nothing is selected. */
export function activeRange(cursor: Cursor): SelectionRect | null {
  if (!addrValid(cursor.selectionStart) || !addrValid(cursor.selectionEnd)) return null;
  return { start: cursor.selectionStart, end: cursor.selectionEnd };
}

/** All selection areas, the active one last. Empty while nothing is selected. */
export function cursorRanges(cursor: Cursor): SelectionRect[] {
  const active = activeRange(cursor);
  const extras = cursor.extraRanges ?? [];
  return active ? [...extras, active] : [...extras];
}

/** All selection areas as normalized boxes, the active one last. */
export function cursorBoxes(cursor: Cursor): RangeBox[] {
  return cursorRanges(cursor).map(rangeBox);
}

/** Box of the active area alone — the pre-multi-selection notion of "the range". */
export function activeBox(cursor: Cursor): RangeBox {
  return rangeBox({ start: cursor.selectionStart, end: cursor.selectionEnd });
}

/** Smallest box covering all given boxes; null for an empty list. */
export function boundingBox(boxes: RangeBox[]): RangeBox | null {
  if (boxes.length === 0) return null;
  return boxes.reduce((acc, b) => ({
    startRow: Math.min(acc.startRow, b.startRow),
    endRow: Math.max(acc.endRow, b.endRow),
    startCol: Math.min(acc.startCol, b.startCol),
    endCol: Math.max(acc.endCol, b.endCol),
  }));
}

export const boxContains = (box: RangeBox, rowIdx: number, colIdx: number) =>
  rowIdx >= box.startRow && rowIdx <= box.endRow && colIdx >= box.startCol && colIdx <= box.endCol;

export const isCellSelected = (boxes: RangeBox[], rowIdx: number, colIdx: number) =>
  boxes.some((box) => boxContains(box, rowIdx, colIdx));

/** True when the row is touched by any area (used for the row highlight). */
export const isRowSelected = (boxes: RangeBox[], rowIdx: number) =>
  boxes.some((box) => rowIdx >= box.startRow && rowIdx <= box.endRow);

/** True when the column is touched by any area (used for the header highlight). */
export const isColSelected = (boxes: RangeBox[], colIdx: number) =>
  boxes.some((box) => colIdx >= box.startCol && colIdx <= box.endCol);

/** Ascending, de-duplicated display-row indices covered by the given areas. */
export function selectedRowIndices(boxes: RangeBox[]): number[] {
  const rows = new Set<number>();
  boxes.forEach((box) => {
    for (let r = Math.max(0, box.startRow); r <= box.endRow; r++) rows.add(r);
  });
  return [...rows].sort((a, b) => a - b);
}

/** Ascending, de-duplicated column indices covered by the given areas. */
export function selectedColIndices(boxes: RangeBox[]): number[] {
  const cols = new Set<number>();
  boxes.forEach((box) => {
    for (let c = Math.max(0, box.startCol); c <= box.endCol; c++) cols.add(c);
  });
  return [...cols].sort((a, b) => a - b);
}

const boxEqual = (a: RangeBox, b: RangeBox) =>
  a.startRow === b.startRow &&
  a.endRow === b.endRow &&
  a.startCol === b.startCol &&
  a.endCol === b.endCol;

/**
 * Cursor update for a Ctrl/Cmd+click that adds `rect` as a new area: the area
 * that was active is committed to `extraRanges` and `rect` becomes the new active
 * area, so the next drag or Shift+click extends *it* while the older areas stay
 * selected.
 *
 * Ctrl+clicking an area that already exists exactly (the same cell, the same
 * column) removes it again — the "oops, wrong one" undo. Ctrl+clicking *inside* a
 * larger area adds a new area instead: a rectangle cannot have a hole punched
 * into it.
 *
 * @param colSelection marks the new active area as a column selection (used by
 *   the column headers so their highlight and the header context menu behave the
 *   same as for a dragged column range).
 */
export function ctrlAddRange(
  cursor: Cursor,
  rect: SelectionRect,
  colSelection = false,
): Partial<Cursor> {
  const extras = cursor.extraRanges ?? [];
  const box = rangeBox(rect);
  const base = { editing: false, initialEditValue: null, filling: false, colSelection };
  const clickedExtra = extras.findIndex((r) => boxEqual(rangeBox(r), box));

  if (clickedExtra >= 0) {
    return { ...base, extraRanges: extras.filter((_, i) => i !== clickedExtra) };
  }

  const active = activeRange(cursor);

  // Re-clicking the active area drops it and promotes the most recently added
  // area back to active. Without any extra area there would be nothing left to
  // select, so the click only leaves edit mode then.
  if (active && boxEqual(rangeBox(active), box)) {
    if (extras.length === 0) return base;
    const promoted = extras[extras.length - 1];
    return {
      ...base,
      extraRanges: extras.slice(0, -1),
      selectionStart: promoted.start,
      selectionEnd: promoted.end,
      fillEnd: promoted.end,
    };
  }

  return {
    ...base,
    extraRanges: active ? [...extras, active] : extras,
    selectionStart: rect.start,
    selectionEnd: rect.end,
    fillEnd: rect.end,
  };
}

/** Ctrl/Cmd+click on a single cell. */
export const ctrlClickCursor = (cursor: Cursor, addr: CellAddr): Partial<Cursor> =>
  ctrlAddRange(cursor, { start: addr, end: addr });

/**
 * Cursor update for a Shift+click on `addr`: keeps the anchor and moves only the
 * focus, so the active area grows. `extraRanges` is deliberately absent from the
 * partial — areas added earlier with Ctrl+click survive (see `Cursor`).
 */
export function shiftClickCursor(cursor: Cursor, addr: CellAddr): Partial<Cursor> {
  // Nothing selected yet: nothing to extend, so anchor here.
  const anchor = addrValid(cursor.selectionStart) ? cursor.selectionStart : addr;
  return {
    editing: false,
    initialEditValue: null,
    filling: false,
    selectionStart: anchor,
    selectionEnd: addr,
    fillEnd: addr,
    // Shift+click must not drop the Ctrl+click areas, but passing selectionStart
    // above would make setCursorRef() clear them — so keep them explicitly.
    extraRanges: cursor.extraRanges ?? [],
  };
}

/**
 * TSV text for a (possibly disjoint) selection, following the spreadsheet rules:
 * areas that share their row span are joined column-wise, areas that share their
 * column span are joined row-wise. Any other layout falls back to the bounding
 * box, with cells outside the selection left empty.
 */
export function selectionTsvLayout(boxes: RangeBox[]): {
  rows: number[];
  cols: number[];
  /** null → emit every cell of the rows x cols grid, else the selection mask. */
  mask: RangeBox[] | null;
} {
  const sorted = [...boxes];
  if (sorted.length <= 1) {
    const box = sorted[0];
    return box
      ? { rows: selectedRowIndices([box]), cols: selectedColIndices([box]), mask: null }
      : { rows: [], cols: [], mask: null };
  }

  const sameRows = sorted.every(
    (b) => b.startRow === sorted[0].startRow && b.endRow === sorted[0].endRow,
  );
  const sameCols = sorted.every(
    (b) => b.startCol === sorted[0].startCol && b.endCol === sorted[0].endCol,
  );

  if (sameRows || sameCols) {
    // Column blocks side by side / row blocks stacked: every selected row and
    // column appears exactly once, so the plain cross product is the selection.
    return { rows: selectedRowIndices(sorted), cols: selectedColIndices(sorted), mask: null };
  }

  const bounds = boundingBox(sorted)!;
  return {
    rows: selectedRowIndices([bounds]),
    cols: selectedColIndices([bounds]),
    mask: sorted,
  };
}

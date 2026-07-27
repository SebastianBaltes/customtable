import { CellAddr, Cursor } from "./Types";
import React from "react";
import { getCursorName } from "./GridDbEditor";
import { last, range } from "./utils";

export interface CursorRefs {
  viewportRef: React.RefObject<HTMLDivElement>;
  tableRef: React.RefObject<HTMLTableElement>;
  selectionRectangleRef: React.RefObject<HTMLDivElement>;
  selectionRectangleStickyRef: React.RefObject<HTMLDivElement>;
  fillRectangleRef: React.RefObject<HTMLDivElement>;
  fillRectangleStickyRef: React.RefObject<HTMLDivElement>;
}

export function directDomUpdateForCursor(
  oldCursor: Cursor,
  newCursor: Cursor,
  numberOfStickyColums: number,
  refs: CursorRefs,
) {
  const { getRowElement, getColHeaderElement, getCellElement } = getCellAccessors(refs.tableRef);

  const colChange = oldCursor.selectionStart.colIdx !== newCursor.selectionStart.colIdx;
  const rowChange = oldCursor.selectionStart.rowIdx !== newCursor.selectionStart.rowIdx;
  const editChange = oldCursor.editing !== newCursor.editing;
  const selectionChange =
    oldCursor.selectionEnd.rowIdx !== newCursor.selectionEnd.rowIdx ||
    oldCursor.selectionEnd.colIdx !== newCursor.selectionEnd.colIdx;
  const fillChange =
    oldCursor.fillEnd.rowIdx !== newCursor.fillEnd.rowIdx ||
    oldCursor.fillEnd.colIdx !== newCursor.fillEnd.colIdx;

  const anyChange = colChange || rowChange || editChange || selectionChange || fillChange;
  if (!anyChange) return;

  if (!newCursor.colSelection) {
    scrollToCellAddr(newCursor.fillEnd, numberOfStickyColums, refs.viewportRef, getCellElement);
  }

  if (colChange || editChange || selectionChange) {
    range(oldCursor.selectionStart.colIdx, oldCursor.selectionEnd.colIdx).forEach((colIdx) => {
      const oldColHeaderElement = getColHeaderElement(colIdx);
      if (oldColHeaderElement) {
        oldColHeaderElement.classList.remove(getCursorName("col-", true, oldCursor.editing));
      }
    });
    range(newCursor.selectionStart.colIdx, newCursor.selectionEnd.colIdx).forEach((colIdx) => {
      const newColHeaderElement = getColHeaderElement(colIdx);
      if (newColHeaderElement) {
        newColHeaderElement.classList.add(getCursorName("col-", true, newCursor.editing));
      }
    });
  }

  if (rowChange || editChange || selectionChange) {
    range(oldCursor.selectionStart.rowIdx, oldCursor.selectionEnd.rowIdx).forEach((rowIdx) => {
      const oldRowElement = getRowElement(rowIdx);
      if (oldRowElement) {
        oldRowElement.classList.remove(getCursorName("row-", true, oldCursor.editing));
      }
    });
    range(newCursor.selectionStart.rowIdx, newCursor.selectionEnd.rowIdx).forEach((rowIdx) => {
      const newRowElement = getRowElement(rowIdx);
      if (newRowElement) {
        newRowElement.classList.add(getCursorName("row-", true, newCursor.editing));
      }
    });
  }

  if (colChange || rowChange || editChange) {
    const oldCellElement = getCellElement(oldCursor.selectionStart);
    const newCellElement = getCellElement(newCursor.selectionStart);
    if (oldCellElement) {
      oldCellElement.classList.remove(getCursorName("cell-", true, oldCursor.editing));
    }
    if (newCellElement) {
      newCellElement.classList.add(getCursorName("cell-", true, newCursor.editing));
    }
  }

  forceUpdateCursorRect(newCursor, numberOfStickyColums, refs, getCellElement);
}

export function forceUpdateCursorRect(
  newCursor: Cursor,
  numberOfStickyColums: number,
  refs: CursorRefs,
  resolvedGetCell?: (addr: CellAddr | undefined) => HTMLTableCellElement | undefined,
) {
  const getCellElement = resolvedGetCell ?? getCellAccessors(refs.tableRef).getCellElement;
  const viewport = refs.viewportRef.current;

  function updateRectangle(
    offsetParent: HTMLElement | null | undefined,
    rectRef: React.RefObject<HTMLDivElement>,
    selectionStart: CellAddr | undefined,
    selectionEnd: CellAddr | undefined,
    show: boolean,
  ) {
    const rect = rectRef.current;
    if (rect) {
      if (selectionStart && selectionEnd) {
        setRectangleOverCells(
          viewport,
          offsetParent,
          rect,
          getCellElement(selectionStart),
          getCellElement(selectionEnd),
        );
      }
      rect.style.display = selectionStart && selectionEnd && show ? "block" : "none";
    }
  }

  const stickyOffsetParent = last(refs.tableRef.current?.rows)?.cells?.[numberOfStickyColums - 1];
  const [selectionStart, selectionEnd, selectionStartSticky, selectionEndSticky] = splitCursorRange(
    newCursor.selectionStart,
    newCursor.selectionEnd,
    numberOfStickyColums,
  );
  const showSelection = !newCursor.editing;
  updateRectangle(null, refs.selectionRectangleRef, selectionStart, selectionEnd, showSelection);
  updateRectangle(
    stickyOffsetParent as HTMLElement,
    refs.selectionRectangleStickyRef,
    selectionStartSticky,
    selectionEndSticky,
    showSelection,
  );

  const fillArea = calculateFillArea(newCursor);
  const [fillStart, fillEnd, fillStartSticky, fillEndSticky] = splitCursorRange(
    fillArea?.from,
    fillArea?.to,
    numberOfStickyColums,
  );
  const showFill = !newCursor.editing && newCursor.filling && fillArea != null;
  updateRectangle(null, refs.fillRectangleRef, fillStart, fillEnd, showFill);
  updateRectangle(
    stickyOffsetParent as HTMLElement,
    refs.fillRectangleStickyRef,
    fillStartSticky,
    fillEndSticky,
    showFill,
  );
}

function splitCursorRange(
  selectionStart: CellAddr | undefined,
  selectionEnd: CellAddr | undefined,
  numberOfStickyColumns: number,
): [CellAddr | undefined, CellAddr | undefined, CellAddr | undefined, CellAddr | undefined] {
  let selectionStartSticky, selectionEndSticky, selectionStartNonSticky, selectionEndNonSticky;

  if (selectionStart && selectionEnd) {
    if (selectionStart.colIdx < numberOfStickyColumns) {
      selectionStartSticky = selectionStart;

      if (selectionEnd.colIdx < numberOfStickyColumns) {
        selectionEndSticky = selectionEnd;
      } else {
        selectionEndSticky = { rowIdx: selectionEnd.rowIdx, colIdx: numberOfStickyColumns - 1 };
        selectionStartNonSticky = {
          rowIdx: selectionStart.rowIdx,
          colIdx: numberOfStickyColumns,
        };
        selectionEndNonSticky = selectionEnd;
      }
    } else {
      selectionStartNonSticky = selectionStart;
      selectionEndNonSticky = selectionEnd;
    }
  }

  return [
    selectionStartNonSticky,
    selectionEndNonSticky,
    selectionStartSticky,
    selectionEndSticky,
  ];
}

function setRectangleOverCells(
  viewport: HTMLDivElement | null | undefined,
  offsetParent: HTMLElement | null | undefined,
  rectangleDiv: HTMLDivElement | null | undefined,
  startCell: HTMLTableCellElement | null | undefined,
  endCell: HTMLTableCellElement | null | undefined,
) {
  if (!(viewport && rectangleDiv && startCell && endCell)) {
    return;
  }
  const startRect = startCell.getBoundingClientRect();
  const endRect = endCell.getBoundingClientRect();

  // Align the rectangle with the *inner* edges of the grid lines around the
  // selection, so that the themes' `outline-offset: 1px` lands exactly on the
  // grid line instead of one pixel next to it (see `leadingInset`/`trailingInset`).
  const startStyle = getComputedStyle(startCell);
  const endStyle = startCell === endCell ? startStyle : getComputedStyle(endCell);
  const startIsTop = startRect.top <= endRect.top;
  const startIsLeft = startRect.left <= endRect.left;
  const startIsBottom = startRect.bottom >= endRect.bottom;
  const startIsRight = startRect.right >= endRect.right;

  // Viewport (= client) coordinates of the wanted rectangle. Snap all four edges
  // to the device pixel grid with the *same* rule and derive the size from the
  // snapped edges. Rounding the position and the size independently let the
  // right/bottom edge drift by up to a full pixel, which showed up as a
  // selection rectangle that was often one pixel too large.
  const top = snapToDevicePixel(
    Math.min(startRect.top, endRect.top) +
      leadingInset(startIsTop ? startStyle : endStyle, "borderTopWidth"),
  );
  const left = snapToDevicePixel(
    Math.min(startRect.left, endRect.left) +
      leadingInset(startIsLeft ? startStyle : endStyle, "borderLeftWidth"),
  );
  const rightCell = startIsRight ? startCell : endCell;
  const bottomCell = startIsBottom ? startCell : endCell;
  const right = snapToDevicePixel(
    Math.max(startRect.right, endRect.right) -
      trailingInset(
        startIsRight ? startStyle : endStyle,
        "borderRightWidth",
        nextCellInRow(rightCell),
        "borderLeftWidth",
      ),
  );
  const bottom = snapToDevicePixel(
    Math.max(startRect.bottom, endRect.bottom) -
      trailingInset(
        startIsBottom ? startStyle : endStyle,
        "borderBottomWidth",
        cellInNextRow(bottomCell),
        "borderTopWidth",
      ),
  );

  // Translate the snapped client coordinates into the coordinate system of the
  // rectangle's containing block. For the sticky rectangle that is the sticky
  // cell it is rendered in, otherwise the scrolled viewport. Both origins are
  // read as fractional client coordinates on purpose: the rounded `offsetTop` /
  // `offsetLeft` used before threw the snapped edges off by up to half a pixel
  // again.
  const origin = offsetParent ?? viewport;
  const originRect = origin.getBoundingClientRect();
  const originTop = originRect.top + origin.clientTop - (offsetParent ? 0 : viewport.scrollTop);
  const originLeft = originRect.left + origin.clientLeft - (offsetParent ? 0 : viewport.scrollLeft);

  const style = rectangleDiv.style;
  style.top = top - originTop + "px";
  style.left = left - originLeft + "px";
  style.width = Math.max(0, right - left) + "px";
  style.height = Math.max(0, bottom - top) + "px";
}

type BorderSide = "borderTopWidth" | "borderRightWidth" | "borderBottomWidth" | "borderLeftWidth";

const nextCellInRow = (cell: HTMLTableCellElement) =>
  cell.nextElementSibling instanceof HTMLTableCellElement ? cell.nextElementSibling : null;

const cellInNextRow = (cell: HTMLTableCellElement) => {
  const nextRow = cell.parentElement?.nextElementSibling;
  return nextRow instanceof HTMLTableRowElement ? nextRow.cells[cell.cellIndex] ?? null : null;
};

/**
 * Inset of the leading (top/left) edges: the distance between the bounding rect
 * edge of a cell and the *inner* edge of the grid line drawn there.
 *
 * The table uses `border-collapse: collapse`, so a shared grid line is centered
 * on the cell's bounding rect edge and half of it lies inside the cell. Cells
 * without a border draw their separator as an `outline`, which lies completely
 * outside the bounding rect and therefore needs no inset at all.
 */
function leadingInset(style: CSSStyleDeclaration, side: BorderSide): number {
  const border = parseFloat(style[side]);
  return Number.isFinite(border) ? border / 2 : 0;
}

/**
 * Inset of the trailing (bottom/right) edges. For a borderless cell (the sticky
 * cells use an `outline` as separator) the line at the trailing edge is drawn by
 * the neighbouring cell: either as its collapsed border, which straddles the
 * shared edge, or as its leading outline, which covers the last pixel of this
 * cell.
 */
function trailingInset(
  style: CSSStyleDeclaration,
  side: BorderSide,
  neighbour: HTMLTableCellElement | null,
  neighbourSide: BorderSide,
): number {
  const border = parseFloat(style[side]);
  if (Number.isFinite(border) && border > 0) {
    return border / 2;
  }
  const neighbourStyle = neighbour ? getComputedStyle(neighbour) : null;
  if (neighbourStyle) {
    const neighbourBorder = parseFloat(neighbourStyle[neighbourSide]);
    if (Number.isFinite(neighbourBorder) && neighbourBorder > 0) {
      return neighbourBorder / 2;
    }
    const neighbourOutline = parseFloat(neighbourStyle.outlineWidth);
    if (Number.isFinite(neighbourOutline)) {
      return neighbourOutline;
    }
  }
  const outline = parseFloat(style.outlineWidth);
  return Number.isFinite(outline) ? outline : 0;
}

function snapToDevicePixel(value: number): number {
  const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  return Math.round(value * dpr) / dpr;
}

function getCellAccessors(tableRef: React.RefObject<HTMLTableElement>) {
  const getColHeaderElement = (colIdx: number) => getRowElement(-1)?.cells?.[colIdx];
  const getRowElement = (rowIdx: number) => tableRef.current?.rows?.[rowIdx + 1];
  const getCellElement = (addr: CellAddr | undefined) =>
    addr == undefined ? undefined : getRowElement(addr.rowIdx)?.cells?.[addr.colIdx];
  return { getRowElement, getColHeaderElement, getCellElement };
}

function calculateFillArea(cursor: Cursor): { from: CellAddr; to: CellAddr } | null {
  const startRowIdx = Math.min(cursor.selectionStart.rowIdx, cursor.selectionEnd.rowIdx);
  const endRowIdx = Math.max(cursor.selectionStart.rowIdx, cursor.selectionEnd.rowIdx);
  const startColIdx = Math.min(cursor.selectionStart.colIdx, cursor.selectionEnd.colIdx);
  const endColIdx = Math.max(cursor.selectionStart.colIdx, cursor.selectionEnd.colIdx);
  const { rowIdx, colIdx } = cursor.fillEnd;

  const deltaBottom = rowIdx - endRowIdx;
  const deltaTop = startRowIdx - rowIdx;
  const deltaRight = colIdx - endColIdx;
  const deltaLeft = startColIdx - colIdx;
  const max = Math.max(1, deltaBottom, deltaRight, deltaLeft, deltaTop);

  const result = (startRow: number, startCol: number, endRow: number, endCol: number) => ({
    from: cellAddr(startCol, startRow),
    to: cellAddr(endCol, endRow),
  });

  if (deltaBottom == max) {
    return result(endRowIdx + 1, startColIdx, rowIdx, endColIdx);
  }
  if (deltaRight == max) {
    return result(startRowIdx, endColIdx + 1, endRowIdx, colIdx);
  }
  if (deltaLeft == max) {
    return result(startRowIdx, colIdx, endRowIdx, startColIdx - 1);
  }
  if (deltaTop == max) {
    return result(rowIdx, startColIdx, startRowIdx - 1, endColIdx);
  }
  return null;
}

const cellAddr = (colIdx: number, rowIdx: number) => ({
  rowIdx,
  colIdx,
});

function scrollToCellAddr(
  addr: CellAddr,
  numberOfStickyColums: number,
  viewportRef: React.RefObject<HTMLDivElement>,
  getCellElement: (addr: CellAddr | undefined) => HTMLTableCellElement | undefined,
) {
  const newCellElement = getCellElement(addr);
  if (!newCellElement) {
    return;
  }
  const cellRect = newCellElement.getBoundingClientRect();
  const viewport = viewportRef.current;
  const viewportRect = viewport?.getBoundingClientRect();
  const lastStickyColRight =
    (numberOfStickyColums == 0
      ? undefined
      : getCellElement(cellAddr(numberOfStickyColums - 1, 0))?.getBoundingClientRect()?.right) ??
    viewportRect?.left ??
    0;
  const lastStickyRowBottom =
    getCellElement(cellAddr(0, -1))?.getBoundingClientRect()?.bottom ?? viewportRect?.top ?? 0;
  if (viewport) {
    scrollCellIntoView(viewport, lastStickyColRight, lastStickyRowBottom, cellRect);
  }
}

function scrollCellIntoView(
  viewportElement: HTMLDivElement,
  lastStickyColRight: number,
  lastStickyRowBottom: number,
  cellRect: DOMRect,
) {
  const delta = 30;
  const viewportRect = viewportElement.getBoundingClientRect();
  if (cellRect.right > viewportRect.right) {
    viewportElement.scrollLeft += cellRect.right - viewportRect.right + delta;
  }
  if (cellRect.bottom > viewportRect.bottom) {
    viewportElement.scrollTop += cellRect.bottom - viewportRect.bottom + delta;
  }
  if (cellRect.left < lastStickyColRight) {
    viewportElement.scrollLeft -= lastStickyColRight - cellRect.left + delta;
  }
  if (cellRect.top < lastStickyRowBottom) {
    viewportElement.scrollTop -= lastStickyRowBottom - cellRect.top + delta;
  }
}

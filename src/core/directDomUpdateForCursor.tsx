import { CellAddr, Cursor } from "./Types";
import React from "react";
import { getCursorName } from "./CustomTable";
import { last, range } from "./utils";

export function directDomUpdateForCursor(
  oldCursor: Cursor,
  newCursor: Cursor,
  numberOfStickyColums: number,
  viewportRef: React.RefObject<HTMLDivElement>,
  tableRef: React.RefObject<HTMLTableElement>,
  selectionRectangleRef: React.RefObject<HTMLDivElement>,
  selectionRectangleStickyRef: React.RefObject<HTMLDivElement>,
  fillRectangleRef: React.RefObject<HTMLDivElement>,
  fillRectangleStickyRef: React.RefObject<HTMLDivElement>,
) {
  const { getRowElement, getColHeaderElement, getCellElement } = getCellAccessors(tableRef);

  const colChange = oldCursor.selectionStart.colIdx !== newCursor.selectionStart.colIdx;
  const rowChange = oldCursor.selectionStart.rowIdx !== newCursor.selectionStart.rowIdx;
  const editChange = oldCursor.editing !== newCursor.editing;
  const selectionChange =
    oldCursor.selectionEnd.rowIdx !== newCursor.selectionEnd.rowIdx ||
    oldCursor.selectionEnd.colIdx !== newCursor.selectionEnd.colIdx;
  const fillChange =
    oldCursor.fillEnd.rowIdx !== newCursor.fillEnd.rowIdx ||
    oldCursor.fillEnd.colIdx !== newCursor.fillEnd.colIdx;

  if (colChange || rowChange || editChange || selectionChange || fillChange) {
    scrollToCellAddr(newCursor.fillEnd, numberOfStickyColums, viewportRef, getCellElement);
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

  if (rowChange || editChange) {
    const oldRowElement = getRowElement(oldCursor.selectionStart.rowIdx);
    const newRowElement = getRowElement(newCursor.selectionStart.rowIdx);
    if (oldRowElement) {
      oldRowElement.classList.remove(getCursorName("row-", true, oldCursor.editing));
    }
    if (newRowElement) {
      newRowElement.classList.add(getCursorName("row-", true, newCursor.editing));
    }
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

  if (fillChange || selectionChange || colChange || rowChange || editChange) {
    forceUpdateCursorRect(
      newCursor,
      numberOfStickyColums,
      viewportRef,
      tableRef,
      selectionRectangleRef,
      selectionRectangleStickyRef,
      fillRectangleRef,
      fillRectangleStickyRef,
    );
  }
}

export function forceUpdateCursorRect(
  newCursor: Cursor,
  numberOfStickyColums: number,
  viewportRef: React.RefObject<HTMLDivElement>,
  tableRef: React.RefObject<HTMLTableElement>,
  selectionRectangleRef: React.RefObject<HTMLDivElement>,
  selectionRectangleStickyRef: React.RefObject<HTMLDivElement>,
  fillRectangleRef: React.RefObject<HTMLDivElement>,
  fillRectangleStickyRef: React.RefObject<HTMLDivElement>,
) {
  const { getCellElement } = getCellAccessors(tableRef);
  const viewport = viewportRef.current;

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
    const viewportRect = viewport.getBoundingClientRect();
    const startRect = startCell.getBoundingClientRect();
    const endRect = endCell.getBoundingClientRect();
    const dtop = offsetParent ? -offsetParent.offsetTop : 0;
    const dleft = offsetParent ? -offsetParent.offsetLeft : 0;
    const topDelta = viewportRect.top;
    const leftDelta = viewportRect.left;
    const top = Math.min(startRect.top, endRect.top) - leftDelta;
    const left = Math.min(startRect.left, endRect.left) - leftDelta;
    const right = Math.max(startRect.right, endRect.right) - topDelta;
    const bottom = Math.max(startRect.bottom, endRect.bottom) - topDelta;
    const width = right - left;
    const height = bottom - top;
    const style = rectangleDiv.style;
    style.top = top + viewport.scrollTop + dtop + "px";
    style.left = left + viewport.scrollLeft + dleft + "px";
    style.width = width + "px";
    style.height = height + "px";
  }

  function updateRectangle(
    offsetParent: HTMLElement | null | undefined,
    selectionRectangleRef: React.RefObject<HTMLDivElement>,
    selectionStart: CellAddr | undefined,
    selectionEnd: CellAddr | undefined,
    show: boolean,
  ) {
    const selectionRectangle = selectionRectangleRef.current;
    if (selectionRectangle) {
      if (selectionStart && selectionEnd) {
        setRectangleOverCells(
          viewport,
          offsetParent,
          selectionRectangle,
          getCellElement(selectionStart),
          getCellElement(selectionEnd),
        );
      }
      selectionRectangle.style.display = selectionStart && selectionEnd && show ? "block" : "none";
    }
  }

  const stickyOffsetParent = last(tableRef.current?.rows)?.cells?.[numberOfStickyColums - 1];
  const [selectionStart, selectionEnd, selectionStartSticky, selectionEndSticky] = splitCursorRange(
    newCursor.selectionStart,
    newCursor.selectionEnd,
    numberOfStickyColums,
  );
  const showSelection = !newCursor.editing;
  updateRectangle(null, selectionRectangleRef, selectionStart, selectionEnd, showSelection);
  updateRectangle(
    stickyOffsetParent as HTMLElement,
    selectionRectangleStickyRef,
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
  updateRectangle(null, fillRectangleRef, fillStart, fillEnd, showFill);
  updateRectangle(
    stickyOffsetParent as HTMLElement,
    fillRectangleStickyRef,
    fillStartSticky,
    fillEndSticky,
    showFill,
  );
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

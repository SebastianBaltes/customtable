/**
 * Geometry of the selection rectangle (`forceUpdateCursorRect`).
 *
 * The grid draws the selection frame as an `outline` with `outline-offset: 1px`
 * on an absolutely positioned div, so the div has to end exactly where the grid
 * lines of the selected cells end. Cell bounding rects are fractional (columns
 * are sized in percent) and, because of `border-collapse: collapse`, they end in
 * the middle of the shared grid line.
 *
 * Both used to be ignored: the position and the size were rounded independently,
 * which let the right/bottom edge drift by up to a full pixel — the selection
 * rectangle looked one pixel too large on some edges, depending on the cell
 * position.
 *
 * The numbers below are the ones measured in Chrome (dpr 1) for a 3x1 selection.
 */

import React from "react";
import { Cursor } from "./Types";
import { CursorRefs, forceUpdateCursorRect } from "./directDomUpdateForCursor";

const rect = (left: number, top: number, right: number, bottom: number) =>
  ({
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
  }) as DOMRect;

const ROW_TOP = [184.594, 219.391, 254.188, 288.984, 323.781, 358.578];
const COL_LEFT = [106.203, 424.422, 525.656, 889.406];

function buildGrid(borderWidth: string) {
  const viewport = document.createElement("div");
  Object.defineProperty(viewport, "getBoundingClientRect", {
    value: () => rect(90, 150, 1290, 750),
  });
  viewport.scrollTop = 0;
  viewport.scrollLeft = 0;

  const table = document.createElement("table");
  // getCellAccessors() treats rows[0] as the header row
  for (let rowIdx = -1; rowIdx < ROW_TOP.length - 2; rowIdx++) {
    const row = table.insertRow();
    for (let colIdx = 0; colIdx < COL_LEFT.length - 1; colIdx++) {
      const cell = row.insertCell();
      cell.style.borderWidth = borderWidth;
      cell.style.borderStyle = "solid";
      const top = ROW_TOP[rowIdx + 1];
      const bottom = ROW_TOP[rowIdx + 2];
      const left = COL_LEFT[colIdx];
      const right = COL_LEFT[colIdx + 1];
      Object.defineProperty(cell, "getBoundingClientRect", {
        value: () => rect(left, top, right, bottom),
      });
    }
  }
  viewport.appendChild(table);
  document.body.appendChild(viewport);

  const rectangle = document.createElement("div");
  viewport.appendChild(rectangle);
  const refs: CursorRefs = {
    viewportRef: { current: viewport } as React.RefObject<HTMLDivElement>,
    tableRef: { current: table } as React.RefObject<HTMLTableElement>,
    selectionRectangleRef: { current: rectangle } as React.RefObject<HTMLDivElement>,
    selectionRectangleStickyRef: { current: null } as unknown as React.RefObject<HTMLDivElement>,
    fillRectangleRef: { current: null } as unknown as React.RefObject<HTMLDivElement>,
    fillRectangleStickyRef: { current: null } as unknown as React.RefObject<HTMLDivElement>,
  };
  return { refs, rectangle };
}

const cursor = (fromRow: number, fromCol: number, toRow: number, toCol: number): Cursor => ({
  editing: false,
  initialEditValue: null,
  selectionStart: { rowIdx: fromRow, colIdx: fromCol },
  selectionEnd: { rowIdx: toRow, colIdx: toCol },
  fillEnd: { rowIdx: toRow, colIdx: toCol },
  filling: false,
  colSelection: false,
});

describe("selection rectangle geometry", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("puts every edge on the grid line of the selected cells", () => {
    const { refs, rectangle } = buildGrid("1px");
    forceUpdateCursorRect(cursor(0, 1, 2, 1), 0, refs);
    // cells span 219.391..323.781 x 424.422..525.656, viewport starts at 150/90
    // edges inset by half of the collapsed 1px grid line, then snapped:
    // top 220, bottom 323, left 425, right 525 (client) => local 70/335
    expect(rectangle.style.top).toBe("70px");
    expect(rectangle.style.left).toBe("335px");
    expect(rectangle.style.width).toBe("100px");
    expect(rectangle.style.height).toBe("103px");
  });

  it("keeps the size consistent with the snapped edges", () => {
    const { refs, rectangle } = buildGrid("1px");
    for (const [fromRow, fromCol, toRow, toCol] of [
      [0, 0, 0, 0],
      [0, 1, 2, 1],
      [1, 0, 3, 2],
      [0, 1, 3, 2],
    ]) {
      forceUpdateCursorRect(cursor(fromRow, fromCol, toRow, toCol), 0, refs);
      const top = parseFloat(rectangle.style.top);
      const left = parseFloat(rectangle.style.left);
      const width = parseFloat(rectangle.style.width);
      const height = parseFloat(rectangle.style.height);
      // client coordinates of the cell block, inset by the half grid line
      const wantedTop = Math.round(ROW_TOP[fromRow + 1] + 0.5);
      const wantedBottom = Math.round(ROW_TOP[toRow + 2] - 0.5);
      const wantedLeft = Math.round(COL_LEFT[fromCol] + 0.5);
      const wantedRight = Math.round(COL_LEFT[toCol + 1] - 0.5);
      expect(top + 150).toBe(wantedTop);
      expect(left + 90).toBe(wantedLeft);
      // the size follows from the *snapped* edges, so no edge can drift
      expect(height).toBe(wantedBottom - wantedTop);
      expect(width).toBe(wantedRight - wantedLeft);
    }
  });

  it("does not inset the leading edges of borderless cells", () => {
    // sticky cells draw their separator as an outline outside the bounding rect
    const { refs, rectangle } = buildGrid("0px");
    forceUpdateCursorRect(cursor(0, 1, 2, 1), 0, refs);
    expect(parseFloat(rectangle.style.top) + 150).toBe(Math.round(ROW_TOP[1]));
    expect(parseFloat(rectangle.style.left) + 90).toBe(Math.round(COL_LEFT[1]));
  });
});

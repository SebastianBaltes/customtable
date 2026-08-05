import { Cursor } from "./Types";
import {
  boundingBox,
  cursorBoxes,
  ctrlAddRange,
  ctrlClickCursor,
  isCellSelected,
  selectedRowIndices,
  selectionTsvLayout,
  shiftClickCursor,
} from "./selectionRanges";

const addr = (rowIdx: number, colIdx: number) => ({ rowIdx, colIdx });

function cursorAt(
  start: [number, number],
  end: [number, number] = start,
  extraRanges: Cursor["extraRanges"] = [],
): Cursor {
  return {
    selectionStart: addr(...start),
    selectionEnd: addr(...end),
    fillEnd: addr(...end),
    editing: false,
    initialEditValue: null,
    filling: false,
    colSelection: false,
    extraRanges,
  };
}

/** Applies a partial cursor update the way useCursor's setCursorRef does. */
function apply(cursor: Cursor, partial: Partial<Cursor>): Cursor {
  const resetExtras = "selectionStart" in partial && !("extraRanges" in partial);
  return { ...cursor, ...partial, ...(resetExtras ? { extraRanges: [] } : null) };
}

describe("cursorBoxes", () => {
  test("normalizes a range selected upwards/leftwards", () => {
    expect(cursorBoxes(cursorAt([3, 4], [1, 2]))).toEqual([
      { startRow: 1, endRow: 3, startCol: 2, endCol: 4 },
    ]);
  });

  test("lists the extra areas first and the active one last", () => {
    const cursor = cursorAt([5, 5], [5, 5], [{ start: addr(0, 0), end: addr(1, 1) }]);
    expect(cursorBoxes(cursor)).toEqual([
      { startRow: 0, endRow: 1, startCol: 0, endCol: 1 },
      { startRow: 5, endRow: 5, startCol: 5, endCol: 5 },
    ]);
  });

  test("drops the active area while nothing is selected", () => {
    expect(cursorBoxes(cursorAt([-1, -1]))).toEqual([]);
    const withExtra = cursorAt([-1, -1], [-1, -1], [{ start: addr(2, 2), end: addr(2, 2) }]);
    expect(cursorBoxes(withExtra)).toEqual([{ startRow: 2, endRow: 2, startCol: 2, endCol: 2 }]);
  });
});

describe("shiftClickCursor", () => {
  test("keeps the anchor and moves only the focus", () => {
    const next = apply(cursorAt([1, 1]), shiftClickCursor(cursorAt([1, 1]), addr(3, 4)));
    expect(cursorBoxes(next)).toEqual([{ startRow: 1, endRow: 3, startCol: 1, endCol: 4 }]);
  });

  test("keeps the areas added with Ctrl+click alive", () => {
    const extras = [{ start: addr(0, 0), end: addr(0, 0) }];
    const cursor = cursorAt([2, 2], [2, 2], extras);
    const next = apply(cursor, shiftClickCursor(cursor, addr(4, 2)));
    expect(cursorBoxes(next)).toEqual([
      { startRow: 0, endRow: 0, startCol: 0, endCol: 0 },
      { startRow: 2, endRow: 4, startCol: 2, endCol: 2 },
    ]);
  });

  test("anchors at the clicked cell when nothing is selected yet", () => {
    const cursor = cursorAt([-1, -1]);
    const next = apply(cursor, shiftClickCursor(cursor, addr(2, 3)));
    expect(cursorBoxes(next)).toEqual([{ startRow: 2, endRow: 2, startCol: 3, endCol: 3 }]);
  });

  test("leaves edit mode so the extension is not typed into a cell", () => {
    const cursor = { ...cursorAt([1, 1]), editing: true };
    expect(shiftClickCursor(cursor, addr(2, 1)).editing).toBe(false);
  });
});

describe("ctrlClickCursor", () => {
  test("commits the active area and makes the clicked cell active", () => {
    const cursor = cursorAt([0, 0], [1, 1]);
    const next = apply(cursor, ctrlClickCursor(cursor, addr(5, 5)));
    expect(cursorBoxes(next)).toEqual([
      { startRow: 0, endRow: 1, startCol: 0, endCol: 1 },
      { startRow: 5, endRow: 5, startCol: 5, endCol: 5 },
    ]);
    // The new area is the active one, so a following drag extends it.
    expect(next.selectionStart).toEqual(addr(5, 5));
  });

  test("a second Ctrl+click on the same extra cell removes it again", () => {
    let cursor = cursorAt([0, 0]);
    cursor = apply(cursor, ctrlClickCursor(cursor, addr(2, 2)));
    cursor = apply(cursor, ctrlClickCursor(cursor, addr(4, 4)));
    expect(cursorBoxes(cursor)).toHaveLength(3);
    // (2,2) is now an extra area – clicking it again drops it.
    cursor = apply(cursor, ctrlClickCursor(cursor, addr(2, 2)));
    expect(cursorBoxes(cursor)).toEqual([
      { startRow: 0, endRow: 0, startCol: 0, endCol: 0 },
      { startRow: 4, endRow: 4, startCol: 4, endCol: 4 },
    ]);
  });

  test("Ctrl+click on the active cell promotes the last extra area", () => {
    let cursor = cursorAt([0, 0]);
    cursor = apply(cursor, ctrlClickCursor(cursor, addr(3, 3)));
    cursor = apply(cursor, ctrlClickCursor(cursor, addr(3, 3)));
    expect(cursorBoxes(cursor)).toEqual([{ startRow: 0, endRow: 0, startCol: 0, endCol: 0 }]);
    expect(cursor.selectionStart).toEqual(addr(0, 0));
  });

  test("Ctrl+click on the only selected cell keeps it selected", () => {
    const cursor = cursorAt([1, 1]);
    const next = apply(cursor, ctrlClickCursor(cursor, addr(1, 1)));
    expect(cursorBoxes(next)).toEqual([{ startRow: 1, endRow: 1, startCol: 1, endCol: 1 }]);
  });

  test("Ctrl+click inside a larger area adds a new area instead of punching a hole", () => {
    const cursor = cursorAt([0, 0], [4, 4]);
    const next = apply(cursor, ctrlClickCursor(cursor, addr(2, 2)));
    expect(cursorBoxes(next)).toEqual([
      { startRow: 0, endRow: 4, startCol: 0, endCol: 4 },
      { startRow: 2, endRow: 2, startCol: 2, endCol: 2 },
    ]);
  });

  test("Ctrl+click on a whole column toggles that column area", () => {
    const wholeCol = (col: number) => ({ start: addr(0, col), end: addr(9, col) });
    let cursor = cursorAt([0, 0], [9, 0]);
    cursor = apply(cursor, ctrlAddRange(cursor, wholeCol(2), true));
    expect(cursor.colSelection).toBe(true);
    expect(cursorBoxes(cursor)).toHaveLength(2);
    cursor = apply(cursor, ctrlAddRange(cursor, wholeCol(2), true));
    expect(cursorBoxes(cursor)).toEqual([{ startRow: 0, endRow: 9, startCol: 0, endCol: 0 }]);
  });
});

describe("plain cursor moves", () => {
  test("drop the extra areas, because they pass selectionStart without extraRanges", () => {
    const cursor = cursorAt([2, 2], [2, 2], [{ start: addr(0, 0), end: addr(0, 0) }]);
    const next = apply(cursor, {
      selectionStart: addr(7, 1),
      selectionEnd: addr(7, 1),
      fillEnd: addr(7, 1),
    });
    expect(cursorBoxes(next)).toEqual([{ startRow: 7, endRow: 7, startCol: 1, endCol: 1 }]);
  });
});

describe("box helpers", () => {
  const boxes = [
    { startRow: 0, endRow: 1, startCol: 0, endCol: 0 },
    { startRow: 5, endRow: 5, startCol: 3, endCol: 4 },
  ];

  test("boundingBox spans all areas", () => {
    expect(boundingBox(boxes)).toEqual({ startRow: 0, endRow: 5, startCol: 0, endCol: 4 });
    expect(boundingBox([])).toBeNull();
  });

  test("isCellSelected only accepts cells inside an area", () => {
    expect(isCellSelected(boxes, 1, 0)).toBe(true);
    expect(isCellSelected(boxes, 5, 4)).toBe(true);
    // inside the bounding box, but in the gap between the two areas
    expect(isCellSelected(boxes, 3, 2)).toBe(false);
  });

  test("selectedRowIndices is sorted and de-duplicated", () => {
    expect(
      selectedRowIndices([
        { startRow: 4, endRow: 5, startCol: 0, endCol: 0 },
        { startRow: 0, endRow: 0, startCol: 0, endCol: 0 },
        { startRow: 5, endRow: 6, startCol: 2, endCol: 2 },
      ]),
    ).toEqual([0, 4, 5, 6]);
  });
});

describe("selectionTsvLayout", () => {
  test("a single area is copied as-is", () => {
    expect(selectionTsvLayout([{ startRow: 1, endRow: 2, startCol: 0, endCol: 1 }])).toEqual({
      rows: [1, 2],
      cols: [0, 1],
      mask: null,
    });
  });

  test("areas over the same rows are joined column-wise", () => {
    expect(
      selectionTsvLayout([
        { startRow: 0, endRow: 1, startCol: 0, endCol: 0 },
        { startRow: 0, endRow: 1, startCol: 3, endCol: 3 },
      ]),
    ).toEqual({ rows: [0, 1], cols: [0, 3], mask: null });
  });

  test("areas over the same columns are joined row-wise", () => {
    expect(
      selectionTsvLayout([
        { startRow: 0, endRow: 0, startCol: 1, endCol: 2 },
        { startRow: 4, endRow: 4, startCol: 1, endCol: 2 },
      ]),
    ).toEqual({ rows: [0, 4], cols: [1, 2], mask: null });
  });

  test("any other layout falls back to the bounding box with a mask", () => {
    const boxes = [
      { startRow: 0, endRow: 0, startCol: 0, endCol: 0 },
      { startRow: 2, endRow: 2, startCol: 2, endCol: 2 },
    ];
    expect(selectionTsvLayout(boxes)).toEqual({ rows: [0, 1, 2], cols: [0, 1, 2], mask: boxes });
  });

  test("an empty selection produces nothing", () => {
    expect(selectionTsvLayout([])).toEqual({ rows: [], cols: [], mask: null });
  });
});

import React from "react";
import { createRoot, Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { GridDbEditor } from "./GridDbEditor";
import { ColumnConfig, RangeBox, Row, SelectionInfo } from "./Types";

(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 0) as unknown as number;
(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
(globalThis as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const columns: ColumnConfig<any>[] = [
  { name: "a", type: "String" },
  { name: "b", type: "String" },
  { name: "c", type: "String" },
];

let container: HTMLDivElement;
let root: Root;
let latestRows: Row[];
let selection: SelectionInfo | null;
let copied: string;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  selection = null;
  copied = "";
  (globalThis as any).navigator.clipboard = {
    readText: async () => "",
    writeText: async (text: string) => {
      copied = text;
    },
  };
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(rows: Row[]) {
  latestRows = rows;
  act(() => {
    root.render(
      <GridDbEditor
        rows={rows}
        columns={columns}
        onRowsChange={(next: Row[]) => {
          latestRows = next;
        }}
        rowKey={(_row, i) => "r" + i}
        onSelectionChange={(sel) => {
          selection = sel;
        }}
        colSelection
      />,
    );
  });
}

const grid = () => container.querySelector(".grid-db-editor") as HTMLElement;

const cell = (rowIdx: number, colIdx: number) =>
  container.querySelector(`td[data-row-idx="${rowIdx}"][data-col-idx="${colIdx}"]`) as HTMLElement;

const header = (colIdx: number) =>
  container.querySelectorAll("thead th, thead td")[colIdx] as HTMLElement;

/** buttons:1 matters — the cell's onMouseDown ignores anything else. */
function click(el: HTMLElement, opts: Partial<MouseEventInit> = {}) {
  act(() => {
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, buttons: 1, ...opts }));
  });
}

function press(key: string, opts: Partial<KeyboardEventInit> = {}) {
  act(() => {
    grid().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...opts }));
  });
}

const boxes = (): RangeBox[] => selection?.ranges ?? [];

const threeRows = () => [
  { a: "a1", b: "b1", c: "c1" },
  { a: "a2", b: "b2", c: "c2" },
  { a: "a3", b: "b3", c: "c3" },
];

test("Shift+click extends the selection from the anchor cell", () => {
  render(threeRows());
  click(cell(0, 0));
  click(cell(2, 1), { shiftKey: true });

  expect(boxes()).toEqual([{ startRow: 0, endRow: 2, startCol: 0, endCol: 1 }]);
});

test("Shift+click upwards keeps the anchor and normalizes the range", () => {
  render(threeRows());
  click(cell(2, 2));
  click(cell(0, 1), { shiftKey: true });

  expect(boxes()).toEqual([{ startRow: 0, endRow: 2, startCol: 1, endCol: 2 }]);
});

test("Ctrl+click adds a second, disjoint area", () => {
  render(threeRows());
  click(cell(0, 0));
  click(cell(2, 2), { ctrlKey: true });

  expect(boxes()).toEqual([
    { startRow: 0, endRow: 0, startCol: 0, endCol: 0 },
    { startRow: 2, endRow: 2, startCol: 2, endCol: 2 },
  ]);
});

test("Cmd+click adds an area as well (macOS)", () => {
  render(threeRows());
  click(cell(0, 0));
  click(cell(1, 1), { metaKey: true });

  expect(boxes()).toHaveLength(2);
});

test("Shift+click after Ctrl+click grows the added area and keeps the first one", () => {
  render(threeRows());
  click(cell(0, 0));
  click(cell(1, 1), { ctrlKey: true });
  click(cell(2, 2), { shiftKey: true });

  expect(boxes()).toEqual([
    { startRow: 0, endRow: 0, startCol: 0, endCol: 0 },
    { startRow: 1, endRow: 2, startCol: 1, endCol: 2 },
  ]);
});

test("Shift+arrow keeps the areas added with Ctrl+click", () => {
  render(threeRows());
  click(cell(0, 0));
  click(cell(2, 0), { ctrlKey: true });
  press("ArrowUp", { shiftKey: true });

  expect(boxes()).toEqual([
    { startRow: 0, endRow: 0, startCol: 0, endCol: 0 },
    { startRow: 1, endRow: 2, startCol: 0, endCol: 0 },
  ]);
});

test("a plain click drops the multi-selection", () => {
  render(threeRows());
  click(cell(0, 0));
  click(cell(2, 2), { ctrlKey: true });
  click(cell(1, 1));

  expect(boxes()).toEqual([{ startRow: 1, endRow: 1, startCol: 1, endCol: 1 }]);
});

test("every selected row keeps its highlight class", () => {
  render(threeRows());
  click(cell(0, 0));
  click(cell(2, 2), { ctrlKey: true });

  const rowClasses = Array.from(container.querySelectorAll("tbody tr")).map((tr) =>
    tr.className.includes("row-selected"),
  );
  expect(rowClasses).toEqual([true, false, true]);
});

test("each extra area gets its own selection rectangle", () => {
  render(threeRows());
  click(cell(0, 0));
  expect(container.querySelectorAll(".selection-rectangle-extra")).toHaveLength(0);

  click(cell(2, 2), { ctrlKey: true });
  expect(container.querySelectorAll(".selection-rectangle-extra")).toHaveLength(1);

  click(cell(1, 1), { ctrlKey: true });
  expect(container.querySelectorAll(".selection-rectangle-extra")).toHaveLength(2);

  // back to a single area → the pooled rectangles are removed again
  click(cell(0, 1));
  expect(container.querySelectorAll(".selection-rectangle-extra")).toHaveLength(0);
});

test("Shift+click on a column header extends the column range", () => {
  render(threeRows());
  click(header(0));
  click(header(2), { shiftKey: true });

  expect(boxes()).toEqual([{ startRow: 0, endRow: 2, startCol: 0, endCol: 2 }]);
});

test("Ctrl+click on a column header adds and removes that column", () => {
  render(threeRows());
  click(header(0));
  click(header(2), { ctrlKey: true });
  expect(boxes()).toEqual([
    { startRow: 0, endRow: 2, startCol: 0, endCol: 0 },
    { startRow: 0, endRow: 2, startCol: 2, endCol: 2 },
  ]);

  click(header(2), { ctrlKey: true });
  expect(boxes()).toEqual([{ startRow: 0, endRow: 2, startCol: 0, endCol: 0 }]);
});

test("Delete clears the cells of every area, not the gap between them", () => {
  render(threeRows());
  click(cell(0, 0));
  click(cell(2, 2), { ctrlKey: true });
  press("Delete");

  expect(latestRows).toEqual([
    { a: "", b: "b1", c: "c1" },
    { a: "a2", b: "b2", c: "c2" },
    { a: "a3", b: "b3", c: "" },
  ]);
});

test("copying two column blocks joins them side by side", async () => {
  render(threeRows());
  click(header(0));
  click(header(2), { ctrlKey: true });
  press("c", { ctrlKey: true });
  await act(async () => {
    await Promise.resolve();
  });

  expect(copied).toBe("a1\tc1\na2\tc2\na3\tc3");
});

test("copying two row blocks stacks them", async () => {
  render(threeRows());
  click(cell(0, 0));
  click(cell(0, 1), { shiftKey: true });
  click(cell(2, 0), { ctrlKey: true });
  click(cell(2, 1), { shiftKey: true });
  press("c", { ctrlKey: true });
  await act(async () => {
    await Promise.resolve();
  });

  expect(copied).toBe("a1\tb1\na3\tb3");
});

test("copying a staircase selection falls back to the bounding box", async () => {
  render(threeRows());
  click(cell(0, 0));
  click(cell(2, 2), { ctrlKey: true });
  press("c", { ctrlKey: true });
  await act(async () => {
    await Promise.resolve();
  });

  expect(copied).toBe("a1\t\t\n\t\t\n\t\tc3");
});

test("pasting one cell fills every area of the selection", async () => {
  render(threeRows());
  (globalThis as any).navigator.clipboard.readText = async () => "X";
  click(cell(0, 0));
  click(cell(2, 2), { ctrlKey: true });
  press("v", { ctrlKey: true });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(latestRows).toEqual([
    { a: "X", b: "b1", c: "c1" },
    { a: "a2", b: "b2", c: "c2" },
    { a: "a3", b: "b3", c: "X" },
  ]);
});

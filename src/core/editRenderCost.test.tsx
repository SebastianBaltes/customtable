import React, { useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { GridDbEditor } from "./GridDbEditor";
import { ColumnConfig, Row } from "./Types";

(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 0) as unknown as number;
(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
(globalThis as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Counting editor: renderCell uses column.editor for the display state too, so
// this counts how many cells of that column React actually re-renders.
let cellRenders = 0;
const CountingEditor: React.FC<any> = ({ value, editing, onChange }) => {
  cellRenders++;
  return editing ? (
    <input
      className="cell-editor-input"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  ) : (
    <span>{value}</span>
  );
};

const columns: ColumnConfig<any>[] = [
  { name: "id", type: "Number", readOnly: true },
  { name: "key", type: "String", editor: CountingEditor },
];

const ROWS = 40;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function Harness() {
  const [rows, setRows] = useState<Row[]>(
    Array.from({ length: ROWS }, (_, i) => ({ id: i + 1, key: `value ${i + 1}` })),
  );
  return <GridDbEditor rows={rows} columns={columns} onRowsChange={setRows} />;
}

const cell = (rowIdx: number, colIdx: number) =>
  container.querySelector(
    `td[data-row-idx="${rowIdx}"][data-col-idx="${colIdx}"]`,
  ) as HTMLTableCellElement;

const startEditing = (rowIdx: number, colIdx: number) => {
  const td = cell(rowIdx, colIdx);
  td.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, buttons: 1 }));
  td.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, buttons: 1 }));
};

// Entering edit mode used to re-render EVERY cell of the grid: the editing
// address was handed to each row as a fresh object, and onCellChange — a prop of
// every single cell — was rebuilt on every render, so React.memo could never
// hold. On a real grid of 930 x 28 that cost ~500ms per click, enough to swallow
// the second click of a double-click.
test("entering edit mode re-renders the edited cell, not the whole grid", () => {
  act(() => {
    root.render(<Harness />);
  });
  expect(cellRenders).toBeGreaterThanOrEqual(ROWS); // initial render touched every cell

  cellRenders = 0;
  act(() => {
    startEditing(5, 1);
  });

  expect(cell(5, 1).querySelector("input")).not.toBeNull();
  expect(cellRenders).toBeLessThanOrEqual(2);
});

test("leaving edit mode re-renders the edited cell, not the whole grid", () => {
  act(() => {
    root.render(<Harness />);
  });
  act(() => {
    startEditing(5, 1);
  });

  cellRenders = 0;
  act(() => {
    container
      .querySelector(".grid-db-editor")!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });

  expect(cell(5, 1).querySelector("input")).toBeNull();
  expect(cellRenders).toBeLessThanOrEqual(2);
});

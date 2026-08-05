import React from "react";
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

const columns: ColumnConfig<any>[] = [
  { name: "a", type: "String" },
  { name: "b", type: "String" },
];

let container: HTMLDivElement;
let root: Root;
let latestRows: Row[];

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function setClipboard(text: string) {
  (globalThis as any).navigator.clipboard = {
    readText: async () => text,
    writeText: async () => {},
  };
}

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
        initialSelection={{ colName: "a" }}
      />,
    );
  });
}

function grid() {
  return container.querySelector(".grid-db-editor") as HTMLElement;
}

/** Dispatch a keydown on the grid root, where the shortcut handler sits. */
function press(key: string, opts: Partial<KeyboardEventInit> = {}) {
  act(() => {
    grid().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...opts }));
  });
}

/** Ctrl+V is async (clipboard read) – flush the microtasks it awaits. */
async function paste() {
  press("v", { ctrlKey: true });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

test("a single copied cell is tiled over the whole selected range", async () => {
  render([
    { a: "a1", b: "b1" },
    { a: "a2", b: "b2" },
    { a: "a3", b: "b3" },
  ]);
  setClipboard("X");
  // extend the selection from (0,0) one row down → two cells selected
  press("ArrowDown", { shiftKey: true });
  await paste();

  expect(latestRows.map((r) => r.a)).toEqual(["X", "X", "a3"]);
  // untouched: third row and the whole second column
  expect(latestRows.map((r) => r.b)).toEqual(["b1", "b2", "b3"]);
});

test("a 1x2 copied block is tiled across a 2x2 selection", async () => {
  render([
    { a: "a1", b: "b1" },
    { a: "a2", b: "b2" },
  ]);
  setClipboard("X\tY");
  press("ArrowDown", { shiftKey: true });
  await paste();

  expect(latestRows).toEqual([
    { a: "X", b: "Y" },
    { a: "X", b: "Y" },
  ]);
});

test("a clipboard block larger than the selection is pasted in full", async () => {
  render([
    { a: "a1", b: "b1" },
    { a: "a2", b: "b2" },
    { a: "a3", b: "b3" },
  ]);
  setClipboard("X\nY\nZ");
  await paste(); // only the anchor cell is selected

  expect(latestRows.map((r) => r.a)).toEqual(["X", "Y", "Z"]);
});

test("selecting upwards pastes from the top-left corner of the range", async () => {
  render([
    { a: "a1", b: "b1" },
    { a: "a2", b: "b2" },
    { a: "a3", b: "b3" },
  ]);
  setClipboard("X");
  // move down to row 1, then extend the selection upwards to row 0
  press("ArrowDown");
  press("ArrowUp", { shiftKey: true });
  await paste();

  expect(latestRows.map((r) => r.a)).toEqual(["X", "X", "a3"]);
});

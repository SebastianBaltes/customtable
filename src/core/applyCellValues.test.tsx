import React from "react";
import { createRoot, Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { GridDbEditor } from "./GridDbEditor";
import { CellMetaMap, CellValueChange, ColumnConfig, Row, SortConfig } from "./Types";

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
  { name: "id", type: "Number", readOnly: true },
  { name: "name", type: "String" },
  { name: "locked", type: "String", readOnly: true },
];
const baseRows: Row[] = [
  { id: 1, name: "a", locked: "x" },
  { id: 2, name: "b", locked: "x" },
  { id: 3, name: "c", locked: "x" },
];
/** Key from the row itself, not from the index – as a real data source does. */
const rowKey = (row: Row) => `id:${row.id}`;
// Descending: display order is 3, 2, 1 – so any index-based addressing would be
// wrong. The whole point of rowKey addressing is that this does not matter.
const sortConfig: SortConfig = [{ column: "id", direction: "desc" }];

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

interface HarnessOptions {
  onUpdateRows?: (rows: Row[]) => void | Promise<void>;
  cellMeta?: CellMetaMap;
}

/** Renders the grid as a controlled data source and returns handles to it. */
function mount(opts: HarnessOptions = {}) {
  const applyRef = React.createRef<((c: CellValueChange[]) => number) | null>() as
    React.MutableRefObject<((c: CellValueChange[]) => number) | null>;
  const seen: { rows: Row[][]; updated: Row[][] } = { rows: [], updated: [] };
  let current: Row[] = baseRows;

  const Harness = () => {
    const [rows, setRows] = React.useState<Row[]>(baseRows);
    current = rows;
    return (
      <GridDbEditor
        rows={rows}
        columns={columns}
        rowKey={rowKey}
        sortConfig={sortConfig}
        cellMeta={opts.cellMeta}
        applyCellValuesRef={applyRef}
        onRowsChange={(next) => {
          seen.rows.push(next);
          setRows(next);
        }}
        onUpdateRows={(updated) => {
          seen.updated.push(updated);
          return opts.onUpdateRows?.(updated);
        }}
        onUndo={(recovered) => {
          seen.rows.push(recovered);
          setRows(recovered);
        }}
      />
    );
  };
  act(() => root.render(<Harness />));
  return { applyRef, seen, rows: () => current };
}

/** Ctrl+Z on the grid, as the user would press it. */
function pressUndo() {
  const grid = container.querySelector("[tabindex]") as HTMLElement | null;
  const target = grid ?? container;
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }),
    );
  });
}

test("writes the addressed cells and reports them via onRowsChange/onUpdateRows", () => {
  const h = mount();
  let applied = 0;
  act(() => {
    applied = h.applyRef.current!([
      { rowKey: "id:1", colName: "name", value: "A" },
      { rowKey: "id:3", colName: "name", value: "C" },
    ]);
  });
  expect(applied).toBe(2);
  expect(h.rows().map((r) => r.name)).toEqual(["A", "b", "C"]);
  // One update call carrying exactly the two changed rows.
  expect(h.seen.updated).toHaveLength(1);
  expect(h.seen.updated[0].map((r) => r.id).sort()).toEqual([1, 3]);
});

test("Ctrl+Z restores the previous values", () => {
  const h = mount();
  act(() => {
    h.applyRef.current!([{ rowKey: "id:2", colName: "name", value: "NEU" }]);
  });
  expect(h.rows().map((r) => r.name)).toEqual(["a", "NEU", "c"]);
  pressUndo();
  expect(h.rows().map((r) => r.name)).toEqual(["a", "b", "c"]);
});

test("skips unknown keys, unknown and readOnly columns, and readOnly rows", () => {
  const h = mount({ cellMeta: { "id:3": { row: { readOnly: true } } } as CellMetaMap });
  let applied = 0;
  act(() => {
    applied = h.applyRef.current!([
      { rowKey: "id:999", colName: "name", value: "X" }, // unknown row
      { rowKey: "id:1", colName: "gibtsnicht", value: "X" }, // unknown column
      { rowKey: "id:1", colName: "locked", value: "X" }, // readOnly column
      { rowKey: "id:3", colName: "name", value: "X" }, // readOnly row
      { rowKey: "id:1", colName: "name", value: "OK" }, // the only valid one
    ]);
  });
  expect(applied).toBe(1);
  expect(h.rows().map((r) => r.name)).toEqual(["OK", "b", "c"]);
  expect(h.rows().map((r) => r.locked)).toEqual(["x", "x", "x"]);
});

test("applies nothing and pushes no undo state when no change is valid", () => {
  const h = mount();
  let applied = 0;
  act(() => {
    applied = h.applyRef.current!([{ rowKey: "id:999", colName: "name", value: "X" }]);
  });
  expect(applied).toBe(0);
  expect(h.seen.rows).toHaveLength(0);
  expect(h.seen.updated).toHaveLength(0);
  // An empty undo step would make the next Ctrl+Z a no-op for the user.
  act(() => {
    h.applyRef.current!([{ rowKey: "id:1", colName: "name", value: "EINS" }]);
  });
  pressUndo();
  expect(h.rows().map((r) => r.name)).toEqual(["a", "b", "c"]);
});

test("empty input is a no-op", () => {
  const h = mount();
  let applied = -1;
  act(() => {
    applied = h.applyRef.current!([]);
  });
  expect(applied).toBe(0);
  expect(h.seen.rows).toHaveLength(0);
});

test("rolls back when onUpdateRows rejects", async () => {
  const h = mount({ onUpdateRows: () => Promise.reject(new Error("server sagt nein")) });
  await act(async () => {
    h.applyRef.current!([{ rowKey: "id:1", colName: "name", value: "A" }]);
    await Promise.resolve();
  });
  expect(h.rows().map((r) => r.name)).toEqual(["a", "b", "c"]);
});

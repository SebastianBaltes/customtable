import React from "react";
import { createRoot, Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { GridDbEditor } from "./GridDbEditor";
import { ColumnConfig, Row, SortConfig } from "./Types";

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
];
const rows: Row[] = [
  { id: 1, name: "a" },
  { id: 2, name: "b" },
  { id: 3, name: "c" },
];
// desc sort by id → display order is id 3, 2, 1
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

function render(initialSelection: { rowKey?: string; colName: string } | null) {
  act(() => {
    root.render(
      <GridDbEditor
        rows={rows}
        columns={columns}
        sortConfig={sortConfig}
        onSortChange={() => {}}
        onRowsChange={() => {}}
        rowKey={(row) => "id:" + row.id}
        initialSelection={initialSelection}
      />,
    );
  });
}

test("initialSelection selects the cell by rowKey + colName in display coordinates", () => {
  render({ rowKey: "id:2", colName: "name" });
  const sel = container.querySelector("td.cell-selected") as HTMLElement;
  expect(sel).not.toBeNull();
  expect(sel.getAttribute("data-col-idx")).toBe("1"); // "name"
  // display order [3,2,1] → id:2 is the middle row (display idx 1)
  expect(sel.getAttribute("data-row-idx")).toBe("1");
});

test("initialSelection without rowKey targets the first display row", () => {
  render({ colName: "name" });
  const sel = container.querySelector("td.cell-selected") as HTMLElement;
  expect(sel).not.toBeNull();
  expect(sel.getAttribute("data-col-idx")).toBe("1");
  expect(sel.getAttribute("data-row-idx")).toBe("0"); // top display row (id 3)
});

test("initialSelection with a non-existent rowKey is a silent no-op", () => {
  render({ rowKey: "id:999", colName: "name" });
  // the target column must NOT get selected (no crash, no forced selection)
  expect(container.querySelector('td[data-col-idx="1"].cell-selected')).toBeNull();
});

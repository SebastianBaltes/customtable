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

const columns: ColumnConfig<any>[] = [
  { name: "id", type: "Number", readOnly: true },
  { name: "key", type: "String" },
];

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
  const [rows, setRows] = useState<Row[]>([
    { id: 1, key: "SystemSenkrechtprofile" },
    { id: 2, key: "VersetzteSenkrechtprofileVariabel" },
  ]);
  return <GridDbEditor rows={rows} columns={columns} onRowsChange={setRows} />;
}

// jsdom does no layout, so the header widths the grid measures are stubbed.
const stubHeaderWidths = (widths: number[]) => {
  const ths = container.querySelectorAll("thead th");
  ths.forEach((th, i) =>
    Object.defineProperty(th, "offsetWidth", { value: widths[i] ?? 0, configurable: true }),
  );
};

const cell = (rowIdx: number, colIdx: number) =>
  container.querySelector(
    `td[data-row-idx="${rowIdx}"][data-col-idx="${colIdx}"]`,
  ) as HTMLTableCellElement;

// Double-click as the browser delivers it: the mousedown moves the cursor into
// the cell, only then does the dblclick open the editor.
const startEditing = (rowIdx: number, colIdx: number) => {
  const td = cell(rowIdx, colIdx);
  td.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, buttons: 1 }));
  td.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, buttons: 1 }));
};

const injectedStyles = () =>
  Array.from(container.querySelectorAll("style"))
    .map((s) => s.textContent ?? "")
    .join("\n");

test("editing a cell freezes the column width it had before the editor opened", () => {
  act(() => {
    root.render(<Harness />);
  });
  stubHeaderWidths([40, 260]);

  act(() => {
    startEditing(1, 1);
  });

  // The <input> replacing the text must not be allowed to collapse the column.
  expect(cell(1, 1).querySelector("input.cell-editor-input")).not.toBeNull();
  // box-sizing, because the measured value is a border box — without it the
  // min-width would constrain the content box and widen the column by its padding.
  expect(injectedStyles()).toContain("td:nth-child(2){box-sizing:border-box;min-width:260px}");
});

test("leaving edit mode releases the frozen width again", () => {
  act(() => {
    root.render(<Harness />);
  });
  stubHeaderWidths([40, 260]);

  act(() => {
    startEditing(1, 1);
  });
  expect(injectedStyles()).toContain("min-width:260px");

  act(() => {
    container
      .querySelector(".grid-db-editor")!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  expect(injectedStyles()).not.toContain("min-width:260px");
});

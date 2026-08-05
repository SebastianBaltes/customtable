import React from "react";
import { createRoot, Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { GridDbEditor } from "./GridDbEditor";
import { ColumnConfig, FilterState } from "./Types";

(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 0) as unknown as number;
(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
(globalThis as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// "type" has selectOptions -> its header filter renders as ComboboxFilter.
const columns: ColumnConfig<any>[] = [
  { name: "id", type: "Number", readOnly: true },
  { name: "type", type: "String", selectOptions: ["Metallpfosten", "Holzpfosten"] },
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

const comboInput = () =>
  container.querySelector(".col-filter-combobox .col-filter-input") as HTMLInputElement;

const renderGrid = (filters: FilterState, onFilterChange: (f: FilterState) => void) => {
  act(() => {
    root.render(
      <GridDbEditor
        rows={[{ id: 1, type: "Metallpfosten" }]}
        columns={columns}
        filters={filters}
        onFilterChange={onFilterChange}
        onRowsChange={() => {}}
        rowKey={(row) => "id:" + row.id}
        commitFilterOnBlur={true}
      />,
    );
  });
};

test("clicking into a cell keeps an active combobox substring filter", () => {
  const calls: FilterState[] = [];
  renderGrid({ type: "metall" }, (f) => calls.push(f));

  const input = comboInput();
  expect(input.value).toBe("metall");

  // Focus opens the dropdown and seeds the search text from the active filter.
  act(() => input.dispatchEvent(new FocusEvent("focusin", { bubbles: true })));

  // Click somewhere else (a data cell): the document mousedown closes the
  // dropdown, then the input loses focus.
  act(() => {
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  });
  act(() => input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));

  // The filter must survive; in particular it must not be committed as "".
  expect(calls).toEqual([]);
  expect(comboInput().value).toBe("metall");
});

test("blur still commits newly typed combobox text", () => {
  const calls: FilterState[] = [];
  renderGrid({}, (f) => calls.push(f));

  const input = comboInput();
  act(() => input.dispatchEvent(new FocusEvent("focusin", { bubbles: true })));
  act(() => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setValue.call(input, "metall");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => {
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  });
  act(() => input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));

  expect(calls).toEqual([{ type: "metall" }]);
});

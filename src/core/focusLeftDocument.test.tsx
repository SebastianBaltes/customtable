import React from "react";
import { createRoot, Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { GridDbEditor } from "./GridDbEditor";
import { focusLeftDocument } from "./focusLeftDocument";
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

// activeElement is a getter on Document.prototype, so jest.spyOn cannot see it
// as an own property of `document`.
function stubActiveElement(el: Element | null) {
  Object.defineProperty(document, "activeElement", { configurable: true, get: () => el });
}
function restoreActiveElement() {
  delete (document as any).activeElement;
}

describe("focusLeftDocument", () => {
  const el = document.createElement("div");

  afterEach(() => {
    jest.restoreAllMocks();
    restoreActiveElement();
  });

  test("a focus that names its new home stays inside the page", () => {
    const target = document.createElement("input");
    expect(focusLeftDocument({ relatedTarget: target, currentTarget: el })).toBe(false);
  });

  test("document.hasFocus() === false means the window/tab was left", () => {
    jest.spyOn(document, "hasFocus").mockReturnValue(false);
    expect(focusLeftDocument({ relatedTarget: null, currentTarget: el })).toBe(true);
  });

  // Firefox reports hasFocus() as true while dispatching the event but leaves
  // activeElement on the element it just blurred.
  test("activeElement still on the blurred element means the window was left", () => {
    jest.spyOn(document, "hasFocus").mockReturnValue(true);
    stubActiveElement(el);
    expect(focusLeftDocument({ relatedTarget: null, currentTarget: el })).toBe(true);
  });

  // Clicking a non-focusable element inside the page: relatedTarget is null here
  // too, but the document keeps the focus and activeElement moves to <body>.
  test("focus dropped to <body> inside the page is NOT a window switch", () => {
    jest.spyOn(document, "hasFocus").mockReturnValue(true);
    stubActiveElement(document.body);
    expect(focusLeftDocument({ relatedTarget: null, currentTarget: el })).toBe(false);
  });
});

// The behaviour this protects: after alt-tabbing away and back, the cursor must
// still sit in the cell it was left in. Dropping the selection on the way out
// made the grid's own onFocus re-seed it at (0,0), which scrolls the viewport to
// the top-left cell (Firefox/Windows).
describe("grid keeps its selection across a window switch", () => {
  const columns: ColumnConfig<any>[] = [
    { name: "id", type: "Number", readOnly: true },
    { name: "name", type: "String" },
  ];
  const rows: Row[] = [
    { id: 1, name: "a" },
    { id: 2, name: "b" },
  ];

  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <GridDbEditor
          rows={rows}
          columns={columns}
          onRowsChange={() => {}}
          rowKey={(row) => "id:" + row.id}
          initialSelection={{ rowKey: "id:2", colName: "name" }}
        />,
      );
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    restoreActiveElement();
    act(() => root.unmount());
    container.remove();
  });

  const selectedCell = () => container.querySelector("td.cell-selected") as HTMLElement | null;

  const blurGrid = () =>
    act(() => {
      const grid = container.querySelector(".grid-db-editor") as HTMLElement;
      // React's onBlur maps to the native (bubbling) focusout event.
      grid.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: null }));
    });

  test("selection survives the window switch", () => {
    expect(selectedCell()).not.toBeNull();
    jest.spyOn(document, "hasFocus").mockReturnValue(false);
    blurGrid();

    const sel = selectedCell();
    expect(sel).not.toBeNull();
    expect(sel!.getAttribute("data-row-idx")).toBe("1");
    expect(sel!.getAttribute("data-col-idx")).toBe("1");
  });

  test("focus leaving inside the page still deselects", () => {
    jest.spyOn(document, "hasFocus").mockReturnValue(true);
    stubActiveElement(document.body);
    blurGrid();

    expect(selectedCell()).toBeNull();
  });
});

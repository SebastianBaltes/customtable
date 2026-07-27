import React, { useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { GridDbEditor } from "../core/GridDbEditor";
import { ColumnConfig, Row } from "../core/Types";

// jsdom lacks requestAnimationFrame; the grid uses it. Polyfill to a macrotask.
(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 0) as unknown as number;
(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
(globalThis as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom has no showPicker(); Date/Time/Color editors call it behind a try/catch,
// but the hidden <input type="date"> also warns without it.
(HTMLInputElement.prototype as any).showPicker = () => {};

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

const tick = () => new Promise((r) => setTimeout(r, 0));

const cell = (rowIdx: number, colIdx: number) =>
  container.querySelector(
    `td[data-row-idx="${rowIdx}"][data-col-idx="${colIdx}"]`,
  ) as HTMLTableCellElement;

const activeInput = () => document.activeElement as HTMLInputElement;

// The editor input is React-controlled, so assigning .value directly is invisible
// to React's value tracker. Go through the native setter it patches.
const typeIntoEditor = (text: string) => {
  const input = activeInput();
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;
  setValue.call(input, text);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

// buttons:1 matters — the cell's onMouseDown ignores anything else.
const mouseDownOn = async (rowIdx: number, colIdx: number) => {
  await act(async () => {
    cell(rowIdx, colIdx).dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, buttons: 1 }),
    );
    await tick();
  });
};

/** Select a cell and open its editor via double-click (initialEditValue ""). */
const openEditor = async (rowIdx: number, colIdx: number) => {
  await mouseDownOn(rowIdx, colIdx);
  await act(async () => {
    cell(rowIdx, colIdx).dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await tick();
  });
};

const pressKey = async (key: string) => {
  await act(async () => {
    activeInput().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    await tick();
  });
};

/**
 * Harness with one editable column of the given type plus a second String
 * column to click into. Column indices: 0 = id (readOnly), 1 = target,
 * 2 = other.
 */
function renderGrid(
  column: Partial<ColumnConfig<any>> & { name: string },
  initialRow: Row,
) {
  const updates: Row[][] = [];
  const columns: ColumnConfig<any>[] = [
    { name: "id", type: "Number", readOnly: true },
    column as ColumnConfig<any>,
    { name: "other", type: "String" },
  ];
  function Harness() {
    const [rows, setRows] = useState<Row[]>([{ id: 1, other: "x", ...initialRow }]);
    return (
      <GridDbEditor
        rows={rows}
        columns={columns}
        onRowsChange={(r) => setRows(r)}
        onUpdateRows={(updated) => updates.push(updated)}
        rowKey={(row) => "id:" + row.id}
      />
    );
  }
  return { updates, render: async () => act(async () => root.render(<Harness />)) };
}

/**
 * The core scenario of the fix: type into a cell, then click into a *different*
 * cell instead of pressing Enter. The grid re-renders the source cell without an
 * editor, so the <input> is unmounted without any focusout — the old code lost
 * the input silently.
 */
async function typeThenClickAway(
  column: Partial<ColumnConfig<any>> & { name: string },
  initialRow: Row,
  text: string,
) {
  const h = renderGrid(column, initialRow);
  await h.render();
  await openEditor(0, 1);
  await act(async () => typeIntoEditor(text));
  await mouseDownOn(0, 2);
  return h.updates;
}

// ---------------------------------------------------------------------------
// String / Url — every input is valid
// ---------------------------------------------------------------------------

test("String: clicking into another cell commits the typed value", async () => {
  const updates = await typeThenClickAway(
    { name: "name", type: "String" },
    { name: "Max Mustermann" },
    "XY",
  );
  expect(updates).toHaveLength(1);
  expect(updates[0][0].name).toBe("XY");
});

test("String: Escape discards, a following click commits nothing", async () => {
  const h = renderGrid({ name: "name", type: "String" }, { name: "Max Mustermann" });
  await h.render();
  await openEditor(0, 1);
  await act(async () => typeIntoEditor("XY"));
  await pressKey("Escape");
  await mouseDownOn(0, 2);
  expect(h.updates).toHaveLength(0);
});

test("String: Enter commits exactly once, the following click adds nothing", async () => {
  const h = renderGrid({ name: "name", type: "String" }, { name: "a" });
  await h.render();
  await openEditor(0, 1);
  await act(async () => typeIntoEditor("b"));
  await pressKey("Enter");
  await mouseDownOn(0, 2);
  expect(h.updates).toHaveLength(1);
  expect(h.updates[0][0].name).toBe("b");
});

test("String: visiting a cell without typing writes nothing", async () => {
  const h = renderGrid({ name: "name", type: "String" }, { name: "a" });
  await h.render();
  await openEditor(0, 1);
  await mouseDownOn(0, 2);
  expect(h.updates).toHaveLength(0);
});

test("Url: clicking into another cell commits the typed value", async () => {
  const updates = await typeThenClickAway(
    { name: "link", type: "Url" },
    { link: "example.com" },
    "objectcode.de",
  );
  expect(updates).toHaveLength(1);
  expect(updates[0][0].link).toBe("objectcode.de");
});

// ---------------------------------------------------------------------------
// Number — parsing, and the null -> 0 round-trip that must not happen
// ---------------------------------------------------------------------------

test("Number: clicking into another cell commits the parsed number", async () => {
  const updates = await typeThenClickAway(
    { name: "salary", type: "Number" },
    { salary: 1000 },
    "4711",
  );
  expect(updates).toHaveLength(1);
  expect(updates[0][0].salary).toBe(4711);
});

test("Number: unparsable input is discarded instead of stored as 0", async () => {
  const updates = await typeThenClickAway(
    { name: "salary", type: "Number" },
    { salary: 1000 },
    "abc",
  );
  expect(updates).toHaveLength(0);
});

// A leading numeric prefix is what parseLocaleNumber has always accepted, and
// Enter behaves the same. Both commit paths must agree, otherwise the same input
// would mean two different things depending on how the user leaves the cell.
test("Number: leading numeric prefix parses like it does on Enter", async () => {
  const updates = await typeThenClickAway(
    { name: "salary", type: "Number" },
    { salary: 1000 },
    "12abc",
  );
  expect(updates).toHaveLength(1);
  expect(updates[0][0].salary).toBe(12);
});

test("Number: an empty cell visited without typing is not turned into 0", async () => {
  const h = renderGrid({ name: "salary", type: "Number" }, { salary: null });
  await h.render();
  await openEditor(0, 1);
  await mouseDownOn(0, 2);
  expect(h.updates).toHaveLength(0);
});

test("Number: clearing the cell commits 0", async () => {
  const updates = await typeThenClickAway(
    { name: "salary", type: "Number" },
    { salary: 1000 },
    "",
  );
  expect(updates).toHaveLength(1);
  expect(updates[0][0].salary).toBe(0);
});

// ---------------------------------------------------------------------------
// Date / Time / DateTime
// ---------------------------------------------------------------------------

test("Date: clicking into another cell commits the parsed ISO date", async () => {
  const updates = await typeThenClickAway(
    { name: "hireDate", type: "Date" },
    { hireDate: "2020-01-01" },
    "2026-03-05",
  );
  expect(updates).toHaveLength(1);
  expect(updates[0][0].hireDate).toBe("2026-03-05");
});

test("Date: half-typed date is discarded, not stored verbatim", async () => {
  const updates = await typeThenClickAway(
    { name: "hireDate", type: "Date" },
    { hireDate: "2020-01-01" },
    "27.0",
  );
  expect(updates).toHaveLength(0);
});

test("Date: visiting a cell without typing does not re-write the value", async () => {
  const h = renderGrid({ name: "hireDate", type: "Date" }, { hireDate: "2020-01-01" });
  await h.render();
  await openEditor(0, 1);
  await mouseDownOn(0, 2);
  expect(h.updates).toHaveLength(0);
});

test("Time: clicking into another cell commits the parsed time", async () => {
  const updates = await typeThenClickAway(
    { name: "checkIn", type: "Time" },
    { checkIn: "08:00" },
    "14:30",
  );
  expect(updates).toHaveLength(1);
  expect(updates[0][0].checkIn).toBe("14:30");
});

test("Time: half-typed time is discarded", async () => {
  const updates = await typeThenClickAway(
    { name: "checkIn", type: "Time" },
    { checkIn: "08:00" },
    "14:",
  );
  expect(updates).toHaveLength(0);
});

test("DateTime: clicking into another cell commits the parsed timestamp", async () => {
  const updates = await typeThenClickAway(
    { name: "createdAt", type: "DateTime" },
    { createdAt: "2020-01-01T10:00:00.000Z" },
    "2026-03-05T08:15:00.000Z",
  );
  expect(updates).toHaveLength(1);
  expect(updates[0][0].createdAt).toBe("2026-03-05T08:15:00.000Z");
});

test("DateTime: unparsable input is discarded", async () => {
  const updates = await typeThenClickAway(
    { name: "createdAt", type: "DateTime" },
    { createdAt: "2020-01-01T10:00:00.000Z" },
    "2026-03-0",
  );
  expect(updates).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Duration / Color
// ---------------------------------------------------------------------------

test("Duration: clicking into another cell commits the normalized duration", async () => {
  const updates = await typeThenClickAway(
    { name: "shift", type: "Duration" },
    { shift: "PT1H" },
    "2h 30m",
  );
  expect(updates).toHaveLength(1);
  expect(updates[0][0].shift).toBe("PT2H30M");
});

test("Duration: half-typed duration is discarded", async () => {
  const updates = await typeThenClickAway(
    { name: "shift", type: "Duration" },
    { shift: "PT1H" },
    "2h 3",
  );
  expect(updates).toHaveLength(0);
});

test("Color: clicking into another cell commits the normalized hex", async () => {
  const updates = await typeThenClickAway(
    { name: "brand", type: "Color" },
    { brand: "#000000" },
    "#f00",
  );
  expect(updates).toHaveLength(1);
  expect(updates[0][0].brand).toBe("#ff0000");
});

test("Color: half-typed hex is discarded", async () => {
  const updates = await typeThenClickAway(
    { name: "brand", type: "Color" },
    { brand: "#000000" },
    "#ff00",
  );
  expect(updates).toHaveLength(0);
});

test("Color: free text is not treated as a half-typed hex", async () => {
  const updates = await typeThenClickAway(
    { name: "brand", type: "Color" },
    { brand: "#000000" },
    "rebeccapurple",
  );
  expect(updates).toHaveLength(1);
  expect(updates[0][0].brand).toBe("rebeccapurple");
});

// ---------------------------------------------------------------------------
// Editor-owned side channel — the picker commits, the buffer must not repeat it
// ---------------------------------------------------------------------------

test("Color: picking a color writes once, leaving edit mode adds no second write", async () => {
  const h = renderGrid({ name: "brand", type: "Color" }, { brand: "#000000" });
  await h.render();
  await openEditor(0, 1);

  // The hidden <input type="color"> calls onChange (= commit) directly and
  // mirrors the value into the inline buffer.
  const picker = cell(0, 1).querySelector(
    'input[type="color"]',
  ) as HTMLInputElement;
  await act(async () => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setValue.call(picker, "#00ff00");
    picker.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
  });
  expect(h.updates).toHaveLength(1);
  expect(h.updates[0][0].brand).toBe("#00ff00");

  // Now leave edit mode. The buffer holds exactly what the picker stored, so
  // there is nothing left to commit.
  await mouseDownOn(0, 2);
  expect(h.updates).toHaveLength(1);
});

test("Color: typing after using the picker still commits the typed value", async () => {
  const h = renderGrid({ name: "brand", type: "Color" }, { brand: "#000000" });
  await h.render();
  await openEditor(0, 1);
  const picker = cell(0, 1).querySelector(
    'input[type="color"]',
  ) as HTMLInputElement;
  await act(async () => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setValue.call(picker, "#00ff00");
    picker.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
  });
  await act(async () => typeIntoEditor("#0000ff"));
  await mouseDownOn(0, 2);
  expect(h.updates).toHaveLength(2);
  expect(h.updates[1][0].brand).toBe("#0000ff");
});

// ---------------------------------------------------------------------------
// String with input mask — transformValue must not fake a change
// ---------------------------------------------------------------------------

test("masked String: visiting a cell without typing writes nothing", async () => {
  const h = renderGrid(
    { name: "phone", type: "String", inputMask: "(###) ###-####" },
    { phone: "(555) 123-4567" },
  );
  await h.render();
  await openEditor(0, 1);
  await mouseDownOn(0, 2);
  expect(h.updates).toHaveLength(0);
});

test("masked String: clicking into another cell commits the masked value", async () => {
  const updates = await typeThenClickAway(
    { name: "phone", type: "String", inputMask: "(###) ###-####" },
    { phone: "(555) 123-4567" },
    "5559999999",
  );
  expect(updates).toHaveLength(1);
  expect(updates[0][0].phone).toBe("(555) 999-9999");
});

import { InflightEditTracker } from "./InflightEditTracker";
import { ColumnConfig, Row } from "./Types";

const cols: ColumnConfig<any>[] = [
  { name: "id", type: "Number", serverOwned: true },
  { name: "name", type: "String" },
  { name: "email", type: "String" },
  { name: "updatedAt", type: "String", serverOwned: true },
];

const keyFn = (_row: Row, i: number) => "" + i;

describe("InflightEditTracker – counter basics", () => {
  test("initial count is 0", () => {
    const tracker = new InflightEditTracker();
    expect(tracker.getCount("0", "name")).toBe(0);
    expect(tracker.hasInflight()).toBe(false);
  });

  test("trackEdit increments counter", () => {
    const tracker = new InflightEditTracker();
    tracker.trackEdit("0", "name");
    expect(tracker.getCount("0", "name")).toBe(1);
    expect(tracker.hasInflight()).toBe(true);
  });

  test("resolveEdit decrements counter", () => {
    const tracker = new InflightEditTracker();
    tracker.trackEdit("0", "name");
    tracker.resolveEdit("0", "name");
    expect(tracker.getCount("0", "name")).toBe(0);
    expect(tracker.hasInflight()).toBe(false);
  });

  test("double edit, single resolve → counter = 1", () => {
    const tracker = new InflightEditTracker();
    tracker.trackEdit("0", "name");
    tracker.trackEdit("0", "name");
    expect(tracker.getCount("0", "name")).toBe(2);

    tracker.resolveEdit("0", "name");
    expect(tracker.getCount("0", "name")).toBe(1);
    expect(tracker.hasInflight()).toBe(true);
  });

  test("double edit, double resolve → counter = 0", () => {
    const tracker = new InflightEditTracker();
    tracker.trackEdit("0", "name");
    tracker.trackEdit("0", "name");
    tracker.resolveEdit("0", "name");
    tracker.resolveEdit("0", "name");
    expect(tracker.getCount("0", "name")).toBe(0);
    expect(tracker.hasInflight()).toBe(false);
  });

  test("resolve without track does not go negative", () => {
    const tracker = new InflightEditTracker();
    tracker.resolveEdit("0", "name");
    expect(tracker.getCount("0", "name")).toBe(0);
  });

  test("independent cells have independent counters", () => {
    const tracker = new InflightEditTracker();
    tracker.trackEdit("0", "name");
    tracker.trackEdit("0", "email");
    tracker.trackEdit("1", "name");

    expect(tracker.getCount("0", "name")).toBe(1);
    expect(tracker.getCount("0", "email")).toBe(1);
    expect(tracker.getCount("1", "name")).toBe(1);
    expect(tracker.getCount("1", "email")).toBe(0);
  });
});

describe("InflightEditTracker – trackChanges & resolveBatch", () => {
  test("trackChanges detects changed cells", () => {
    const tracker = new InflightEditTracker();
    const oldRows = [{ id: 1, name: "Alice", email: "a@x.com", updatedAt: "t1" }];
    const newRows = [{ id: 1, name: "Bob", email: "a@x.com", updatedAt: "t1" }];

    const changed = tracker.trackChanges(oldRows, newRows, cols, keyFn);
    expect(changed).toEqual([{ rowKey: "0", colName: "name" }]);
    expect(tracker.getCount("0", "name")).toBe(1);
    expect(tracker.getCount("0", "email")).toBe(0);
  });

  test("trackChanges detects multiple changes", () => {
    const tracker = new InflightEditTracker();
    const oldRows = [{ id: 1, name: "Alice", email: "a@x.com", updatedAt: "t1" }];
    const newRows = [{ id: 1, name: "Bob", email: "b@x.com", updatedAt: "t1" }];

    const changed = tracker.trackChanges(oldRows, newRows, cols, keyFn);
    expect(changed).toHaveLength(2);
    expect(tracker.getCount("0", "name")).toBe(1);
    expect(tracker.getCount("0", "email")).toBe(1);
  });

  test("resolveBatch decrements all tracked changes", () => {
    const tracker = new InflightEditTracker();
    tracker.trackEdit("0", "name");
    tracker.trackEdit("0", "email");
    const batch = [
      { rowKey: "0", colName: "name" },
      { rowKey: "0", colName: "email" },
    ];
    tracker.resolveBatch(batch);
    expect(tracker.hasInflight()).toBe(false);
  });
});

describe("InflightEditTracker – mergeRows", () => {
  test("no inflight → returns backend rows as-is", () => {
    const tracker = new InflightEditTracker();
    const local = [{ id: 1, name: "Local", email: "local@x.com", updatedAt: "t1" }];
    const backend = [{ id: 2, name: "Backend", email: "backend@x.com", updatedAt: "t2" }];

    const merged = tracker.mergeRows(local, backend, cols, keyFn, keyFn);
    expect(merged).toBe(backend); // same reference, no copy
  });

  test("inflight cell keeps local value", () => {
    const tracker = new InflightEditTracker();
    tracker.trackEdit("0", "name");

    const local = [{ id: 1, name: "UserEdit", email: "a@x.com", updatedAt: "t1" }];
    const backend = [{ id: 1, name: "OldValue", email: "a@x.com", updatedAt: "t2" }];

    const merged = tracker.mergeRows(local, backend, cols, keyFn, keyFn);
    expect(merged[0].name).toBe("UserEdit"); // kept local
    expect(merged[0].email).toBe("a@x.com"); // no inflight → backend
  });

  test("serverOwned column always uses backend value", () => {
    const tracker = new InflightEditTracker();
    tracker.trackEdit("0", "id"); // even if tracked (shouldn't happen, but defensive)
    tracker.trackEdit("0", "updatedAt");

    const local = [{ id: 99, name: "Alice", email: "a@x.com", updatedAt: "old" }];
    const backend = [{ id: 1, name: "Alice", email: "a@x.com", updatedAt: "new" }];

    const merged = tracker.mergeRows(local, backend, cols, keyFn, keyFn);
    expect(merged[0].id).toBe(1); // serverOwned → backend wins
    expect(merged[0].updatedAt).toBe("new"); // serverOwned → backend wins
  });

  test("mixed: inflight user-edit + serverOwned update", () => {
    const tracker = new InflightEditTracker();
    tracker.trackEdit("0", "name");

    const local = [{ id: 1, name: "UserEdit", email: "a@x.com", updatedAt: "t1" }];
    const backend = [{ id: 2, name: "BackendName", email: "b@x.com", updatedAt: "t2" }];

    const merged = tracker.mergeRows(local, backend, cols, keyFn, keyFn);
    expect(merged[0]).toEqual({
      id: 2, // serverOwned → backend
      name: "UserEdit", // inflight → local
      email: "b@x.com", // no inflight → backend
      updatedAt: "t2", // serverOwned → backend
    });
  });

  test("resolved edit → backend value wins on next merge", () => {
    const tracker = new InflightEditTracker();
    tracker.trackEdit("0", "name");
    tracker.resolveEdit("0", "name"); // confirmed

    const local = [{ id: 1, name: "UserEdit", email: "a@x.com", updatedAt: "t1" }];
    const backend = [{ id: 1, name: "BackendValue", email: "a@x.com", updatedAt: "t2" }];

    const merged = tracker.mergeRows(local, backend, cols, keyFn, keyFn);
    expect(merged[0].name).toBe("BackendValue"); // resolved → backend wins
  });

  test("double edit, single resolve → local preserved", () => {
    const tracker = new InflightEditTracker();
    tracker.trackEdit("0", "name");
    tracker.trackEdit("0", "name");
    tracker.resolveEdit("0", "name"); // one still inflight

    const local = [{ id: 1, name: "SecondEdit", email: "a@x.com", updatedAt: "t1" }];
    const backend = [{ id: 1, name: "FirstEdit", email: "a@x.com", updatedAt: "t2" }];

    const merged = tracker.mergeRows(local, backend, cols, keyFn, keyFn);
    expect(merged[0].name).toBe("SecondEdit"); // still inflight → local
  });

  test("multiple rows — only affected rows are merged", () => {
    const tracker = new InflightEditTracker();
    tracker.trackEdit("1", "email");

    const local = [
      { id: 1, name: "Alice", email: "alice@local.com", updatedAt: "t1" },
      { id: 2, name: "Bob", email: "bob@local.com", updatedAt: "t1" },
    ];
    const backend = [
      { id: 1, name: "Alice", email: "alice@backend.com", updatedAt: "t2" },
      { id: 2, name: "Bob", email: "bob@backend.com", updatedAt: "t2" },
    ];

    const merged = tracker.mergeRows(local, backend, cols, keyFn, keyFn);
    expect(merged[0].email).toBe("alice@backend.com"); // row 0: no inflight → backend
    expect(merged[1].email).toBe("bob@local.com"); // row 1: inflight → local
    expect(merged[0].updatedAt).toBe("t2"); // serverOwned
    expect(merged[1].updatedAt).toBe("t2"); // serverOwned
  });
});

/**
 * Attribute-scoped theming demo.
 *
 * Every theme is linked as a normal stylesheet — no `?raw` imports, no runtime
 * CSS string injection. Switching themes is a single attribute write:
 *
 *   document.documentElement.dataset.ctTheme = "dark";
 *
 * `themes/light.css` is still loaded globally on `:root`, which is exactly the
 * setup a pre-1.4 consumer has. The scoped files override it because
 * `:root[data-ct-theme="x"]` is more specific than `:root`, so adding scoped
 * theming to an existing app does not require touching the existing imports.
 *
 * This page is also the fixture for tests/theme_scoping.spec.ts, which measures
 * the dialog and toolbar colours that used to fall back to light literals.
 */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ColumnConfig, GridDbEditor, Row } from "../index";
import { ColumnManagerDialog } from "../core/ColumnManagerDialog";

import "../core/base.css";
import "./themes/light.css";
import "./themes/scoped/dark.css";
import "./themes/scoped/high-contrast.css";
import "./themes/scoped/numbers.css";

const SCOPED_THEMES = ["", "dark", "high-contrast", "numbers"];

const columns: ColumnConfig<any>[] = [
  { name: "id", type: "Number", label: "ID", readOnly: true },
  { name: "firstName", type: "String", label: "First Name" },
  { name: "lastName", type: "String", label: "Last Name" },
  { name: "email", type: "String", label: "Email" },
  {
    name: "department",
    type: "Combobox",
    label: "Department",
    selectOptions: ["HR", "IT", "Sales"],
  },
  { name: "isActive", type: "Boolean", label: "Active" },
];

const sampleData: Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  firstName: ["Alice", "Bob", "Clara", "David"][i % 4],
  lastName: ["Schmidt", "Mueller", "Fischer", "Weber"][i % 4],
  email: `person${i + 1}@example.com`,
  department: ["HR", "IT", "Sales"][i % 3],
  isActive: i % 2 === 0,
}));

const ScopedThemeApp = () => {
  const [rows, setRows] = useState(sampleData);
  const [theme, setTheme] = useState("");
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const applyTheme = (next: string) => {
    setTheme(next);
    if (next) document.documentElement.dataset.ctTheme = next;
    else delete document.documentElement.dataset.ctTheme;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 16px" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Scoped theming</h2>
        <label htmlFor="scoped-theme-select">data-ct-theme:</label>
        <select
          id="scoped-theme-select"
          data-testid="scoped-theme-select"
          value={theme}
          onChange={(e) => applyTheme(e.target.value)}
        >
          {SCOPED_THEMES.map((t) => (
            <option key={t} value={t}>
              {t === "" ? "(none — global light)" : t}
            </option>
          ))}
        </select>
        <button data-testid="open-column-manager" onClick={() => setColumnManagerOpen(true)}>
          Columns
        </button>
      </div>

      <div style={{ flex: 1, position: "relative", margin: "0 16px 16px" }}>
        <GridDbEditor
          rows={rows}
          columns={columns}
          onRowsChange={setRows}
          caption="Employees"
          enableSearchReplace
        />
      </div>

      <ColumnManagerDialog
        open={columnManagerOpen}
        onClose={() => setColumnManagerOpen(false)}
        columns={columns}
        columnOrder={columnOrder}
        onColumnOrderChange={setColumnOrder}
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={setHiddenColumns}
        onReset={() => {
          setColumnOrder([]);
          setHiddenColumns(new Set());
        }}
      />
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<ScopedThemeApp />);

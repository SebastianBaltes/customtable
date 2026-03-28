import React, { useState, useMemo, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { CellMetaMap, ColumnConfig, CustomContextMenuItem, CustomTable, FilterState, Row, SortConfig } from "../index";
import { TextareaDialogEditor } from "../editors/TextareaDialogEditor";
import { Pagination } from "../pagination/Pagination";

// Import JSON as ESM (tsconfig.json has resolveJsonModule: true)
import exampleData from "./example-data.json";

// Theme CSS — imported as raw strings via Vite's ?raw suffix
import lightCss from "./themes/light.css?raw";
import darkCss from "./themes/dark.css?raw";
import excelCss from "./themes/excel-classic.css?raw";
import sheetsCss from "./themes/google-sheets.css?raw";
import materialCss from "./themes/material.css?raw";
import numbersCss from "./themes/numbers.css?raw";

const themes = [
  { id: "light", label: "Light", css: lightCss },
  { id: "dark", label: "Dark", css: darkCss },
  { id: "excel", label: "Excel Classic", css: excelCss },
  { id: "sheets", label: "Google Sheets", css: sheetsCss },
  { id: "material", label: "Material", css: materialCss },
  { id: "numbers", label: "Numbers", css: numbersCss },
];

// Column definitions matching example-data.json (30 columns)
// Order changed: description moved to 8th position
export const demoColumns: ColumnConfig<any>[] = [
  {
    name: "id",
    type: "Number",
    readOnly: true,
    label: "ID",
    comment: "Unique internal row ID",
  },
  {
    name: "complexKey",
    type: "String",
    label: "System Key",
    comment: "Internal system key (10-50 characters)",
  },
  {
    name: "firstName",
    type: "String",
    label: "First Name",
    required: true,
    comment: "First name of the person",
  },
  {
    name: "lastName",
    type: "String",
    label: "Last Name",
    required: true,
    comment: "Last name of the person",
  },
  {
    name: "email",
    type: "String",
    label: "Email",
    required: true,
    comment: "Email address in the format user@example.com",
  },
  {
    name: "department",
    type: "Combobox",
    label: "Department",
    selectOptions: ["HR", "IT", "Sales", "Marketing", "Finance", "Legal"],
    comment: "Department / organizational unit",
  },
  {
    name: "skills",
    type: "MultiCombobox",
    label: "Skills",
    selectOptions: ["React", "TypeScript", "Python", "Java", "SQL", "AWS", "Docker", "Figma"],
    comment: "Skills / competencies (multiple selection)",
  },
  {
    name: "description",
    type: "String",
    label: "Description",
    comment: "Free text / long description (0-1000 characters)",
    editor: TextareaDialogEditor,
    dialogTitle: "${firstName} ${lastName}: Description",
  },
  {
    name: "isActive",
    type: "Boolean",
    label: "Active",
    comment: "Whether the person is active in the company",
  },
  {
    name: "salary",
    type: "Number",
    label: "Salary",
    comment: "Annual salary in EUR",
    numberFormat: { decimalPlaces: 2, thousandsSeparator: true, suffix: " €" },
  },
  {
    name: "hireDate",
    type: "String",
    label: "Hire Date",
    comment: "Hire date (YYYY-MM-DD)",
  },
  { name: "manager", type: "String", label: "Manager", comment: "Name of the direct manager" },
  {
    name: "officeLocation",
    type: "String",
    label: "Office Location",
    comment: "Location or office",
  },
  {
    name: "phone",
    type: "String",
    label: "Phone",
    comment: "Phone number (international format)",
  },
  {
    name: "employeeNumber",
    type: "String",
    label: "Employee Number",
    comment: "Company-internal employee number",
  },
  {
    name: "status",
    type: "String",
    label: "Employment Status",
    comment: "Employment status (e.g. Active, On Leave)",
  },
  {
    name: "role",
    type: "String",
    label: "Role",
    comment: "Job title / role in the company",
  },
  { name: "team", type: "String", label: "Team", comment: "Team name or unit" },
  {
    name: "lastLogin",
    type: "String",
    label: "Last Login",
    comment: "Last login timestamp (ISO)",
  },
  {
    name: "performanceScore",
    type: "Number",
    label: "Score",
    comment: "Rating value (0-5)",
    numberFormat: { decimalPlaces: 2, thousandsSeparator: false },
  },
  {
    name: "bonus",
    type: "Number",
    label: "Bonus",
    comment: "Variable bonus payments in EUR",
    numberFormat: { decimalPlaces: 0, thousandsSeparator: true, prefix: "+ ", suffix: " €" },
  },
  {
    name: "contractType",
    type: "String",
    label: "Contract Type",
    comment: "Type of contract (Permanent/Temporary/etc.)",
  },
  {
    name: "country",
    type: "String",
    label: "Country",
    comment: "Country of residence or workplace",
  },
  { name: "city", type: "String", label: "City", comment: "City" },
  { name: "postalCode", type: "String", label: "Postal Code", comment: "Postal code" },
  { name: "address", type: "String", label: "Address", comment: "Street and house number" },
  { name: "linkedin", type: "String", label: "LinkedIn", comment: "LinkedIn profile URL" },
  { name: "github", type: "String", label: "GitHub", comment: "GitHub profile URL" },
  {
    name: "dateOfBirth",
    type: "String",
    label: "Date of Birth",
    comment: "Date of birth (YYYY-MM-DD)",
  },
  {
    name: "emergencyContact",
    type: "String",
    label: "Emergency Contact",
    comment: "Emergency contact (name + phone)",
  },
];

// Use only the demoColumns (no dummy columns)
const initialColumns = [...demoColumns];

// Rows from the JSON file; if data has fewer fields, fill missing values with a sensible default
const initialRows: Record<string, any>[] = (exampleData as Record<string, any>[]).map((r, idx) => {
  const row: Record<string, any> = {};
  initialColumns.forEach((c) => {
    // If field is missing, set default: for Booleans false, for Number null, otherwise empty string
    const has = Object.prototype.hasOwnProperty.call(r, c.name);
    if (has) {
      row[c.name] = r[c.name];
    } else {
      if (c.type === "Boolean") row[c.name] = false;
      else if (c.type === "Number") row[c.name] = null;
      else row[c.name] = "";
    }
  });
  // Ensure there is an id field as Number
  row.id = r.id != null ? r.id : idx;
  return row;
});

// Example: cellMeta with error-style for row "3" / column "Key", and a disabled cell
const exampleCellMeta: CellMetaMap = {
  "3": {
    cells: {
      complexKey: {
        style: { backgroundColor: "#fdd" },
        title: "Validation error: Key must not be 'dummy'",
        className: "cell-error",
      },
    },
  },
  "5": {
    row: {
      style: { backgroundColor: "#eee" },
      title: "This row is read-only",
      readOnly: true,
    },
    cells: {
      complexKey: {
        disabled: true,
        title: "Disabled cell",
      },
    },
  },
};

const App = () => {
  const [allRows, setAllRows] = useState(initialRows);
  const [activeTheme, setActiveTheme] = useState("light");

  const switchTheme = useCallback((themeId: string) => {
    const theme = themes.find((t) => t.id === themeId);
    if (!theme) return;
    // Inject/replace a <style> tag with the selected theme's CSS variables
    let el = document.getElementById("theme-override") as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = "theme-override";
      document.head.appendChild(el);
    }
    el.textContent = theme.css;
    setActiveTheme(themeId);
  }, []);

  // Controlled sort & filter — allows external reset
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState<FilterState>({});

  // Ellipsis toggle
  const [ellipsis, setEllipsis] = useState(true);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Pre-filter and sort ALL rows (same logic as CustomTable internally)
  // so that filters span the entire dataset, not just the current page.
  const filteredSorted = useMemo(() => {
    let indexed = allRows.map((row, origIdx) => ({ row, origIdx }));
    const activeFilters = Object.entries(filters).filter(([, v]) => v.trim() !== "");
    if (activeFilters.length > 0) {
      indexed = indexed.filter(({ row }) =>
        activeFilters.every(([colName, filterVal]) => {
          const cellVal = row[colName];
          if (cellVal == null) return false;
          return String(cellVal).toLowerCase().includes(filterVal.toLowerCase());
        })
      );
    }
    if (sortConfig) {
      const { column, direction } = sortConfig;
      indexed.sort((a, b) => {
        const aVal = a.row[column];
        const bVal = b.row[column];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return direction === "asc" ? cmp : -cmp;
      });
    }
    return indexed;
  }, [allRows, filters, sortConfig]);

  const totalFilteredRows = filteredSorted.length;
  const effectivePageSize = pageSize === 0 ? totalFilteredRows || 1 : pageSize;
  const start = (page - 1) * effectivePageSize;
  const currentPageItems = filteredSorted.slice(start, start + effectivePageSize);
  const rows = currentPageItems.map((item) => item.row);

  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps);
    setPage(1);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1); // reset to page 1 on filter change
  };

  return (
    <div style={{ display: "contents" }}>
      <div className="theme-switcher">
        <span className="theme-switcher-label">Theme:</span>
        <select
          className="theme-switcher-select"
          value={activeTheme}
          onChange={(e) => switchTheme(e.target.value)}
        >
          {themes.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="app-table-wrapper">
        <CustomTable
          rows={rows}
          columns={initialColumns}
          numberOfStickyColums={1}
          caption="Employee Data"
          textEllipsisLength={ellipsis ? 25 : undefined}
          onRowsChange={(newRows) => {
            // Map changes back to the original (unfiltered/unsorted) allRows array.
            const updated = [...allRows];
            if (newRows.length === rows.length) {
              // Updates: patch by origIdx
              newRows.forEach((r, i) => {
                updated[currentPageItems[i].origIdx] = r;
              });
            } else if (newRows.length > rows.length) {
              // Creates: patch existing by origIdx, then append new rows
              const added = newRows.slice(rows.length);
              newRows.slice(0, rows.length).forEach((r, i) => {
                updated[currentPageItems[i].origIdx] = r;
              });
              updated.push(...added);
            } else {
              // Deletes: remove rows that disappeared (by reference)
              const newSet = new Set(newRows);
              const removedOrigIdxs = new Set(
                currentPageItems.filter((item) => !newSet.has(item.row)).map((item) => item.origIdx)
              );
              setAllRows(updated.filter((_, i) => !removedOrigIdxs.has(i)));
              return;
            }
            setAllRows(updated);
          }}
          rowKey={(_row: Row, idx: number) => "" + currentPageItems[idx]?.origIdx}
          cellMeta={exampleCellMeta}
          sortConfig={sortConfig}
          onSortChange={setSortConfig}
          filters={filters}
          onFilterChange={(f) => handleFilterChange(f)}
          onUpdateRows={(updatedRows) => {
            console.log("onUpdateRows:", updatedRows);
          }}
          onCreateRows={(newRows) => {
            console.log("onCreateRows:", newRows);
          }}
          onDeleteRows={(deletedRows) => {
            console.log("onDeleteRows:", deletedRows);
          }}
          onUndo={(recoveredRows) => {
            console.log("onUndo:", recoveredRows);
          }}
          onRedo={(recoveredRows) => {
            console.log("onRedo:", recoveredRows);
          }}
          extraContextMenuItems={[
            {
              label: "Log selection",
              onClick: ({ selectedRows, selectionRange }) => {
                console.log("Selected range:", selectionRange, "Rows:", selectedRows);
              },
            },
          ] satisfies CustomContextMenuItem[]}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", background: "var(--ct-toolbar-bg)", borderTop: "1px solid var(--ct-border)" }}>
        <Pagination
          totalRows={totalFilteredRows}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, padding: "0 10px", flexShrink: 0 }}>
          <button
            className="ct-pagination-button"
            disabled={!sortConfig && Object.keys(filters).every(k => !filters[k])}
            onClick={() => { setSortConfig(null); setFilters({}); setPage(1); }}
          >
            Reset Filter &amp; Sort
          </button>
          <button
            className="ct-pagination-button"
            style={{ fontWeight: ellipsis ? 600 : 400 }}
            onClick={() => setEllipsis(e => !e)}
            title="Toggle text truncation"
          >
            [...]
          </button>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  CellMetaMap,
  ColumnConfig,
  CustomContextMenuItem,
  CustomTable,
  FilterState,
  Row,
  SortConfig,
  TableStatus,
} from "../index";
import { TextareaDialogEditor } from "../editors/TextareaDialogEditor";
import { Pagination } from "../pagination/Pagination";
import { useLocalStorage } from "./useLocalStorage";
import { useAsyncTableState } from "../core/useAsyncTableState";

// Import JSON as ESM (tsconfig.json has resolveJsonModule: true)
import exampleData from "./example-data.json";

// Theme CSS — imported as raw strings via Vite's ?raw suffix
import lightCss from "./themes/light.css?raw";
import darkCss from "./themes/dark.css?raw";
import excelCss from "./themes/excel-classic.css?raw";
import sheetsCss from "./themes/google-sheets.css?raw";
import materialCss from "./themes/material.css?raw";
import material3Css from "./themes/material3.css?raw";
import numbersCss from "./themes/numbers.css?raw";
import highContrastCss from "./themes/high-contrast.css?raw";
import classNames from "../core/classNames";

const themes = [
  { id: "light", label: "Light", css: lightCss },
  { id: "dark", label: "Dark", css: darkCss },
  { id: "excel", label: "Excel Classic", css: excelCss },
  { id: "sheets", label: "Google Sheets", css: sheetsCss },
  { id: "material", label: "Material", css: materialCss },
  { id: "material3", label: "Material 3", css: material3Css },
  { id: "numbers", label: "Numbers", css: numbersCss },
  { id: "high-contrast", label: "High Contrast", css: highContrastCss },
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
    serverOwned: true,
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
    className: "col-description",
    wrap: true,
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
        title: "Validation error: Key must not be 'dummy'",
        className: "cell-error",
      },
    },
  },
  "5": {
    row: {
      className: "row-readonly",
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

type DataMode =
  | "local"
  | "backend-fast"
  | "backend-slow"
  | "backend-error"
  | "backend-offline"
  | "backend-validation"
  | "backend-stale";

const modeLabels: Record<DataMode, string> = {
  local: "Local (sync)",
  "backend-fast": "Backend (100 ms)",
  "backend-slow": "Backend (2 s)",
  "backend-error": "Error (2 s)",
  "backend-offline": "Connection error",
  "backend-validation": "Validation (2 s)",
  "backend-stale": "Stale (2 s)",
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const delayReject = (ms: number, msg: string) =>
  new Promise<void>((_, reject) => setTimeout(() => reject(new Error(msg)), ms));

/** Retry a promise-returning function with exponential backoff. */
async function withRetry(fn: () => Promise<void>, retries: number, baseMs: number): Promise<void> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      await delay(baseMs * 2 ** i);
    }
  }
}

/**
 * Simulate backend-side normalization (stale mode):
 * trims whitespace, capitalizes first letter of names, lowercases emails.
 */
function simulateServerNormalization(rows: Row[]): Row[] {
  return rows.map((row) => {
    const r = { ...row };
    if (typeof r.firstName === "string" && r.firstName) {
      r.firstName = r.firstName.trim().replace(/^\w/, (c: string) => c.toUpperCase());
    }
    if (typeof r.lastName === "string" && r.lastName) {
      r.lastName = r.lastName.trim().replace(/^\w/, (c: string) => c.toUpperCase());
    }
    if (typeof r.email === "string" && r.email) {
      r.email = r.email.trim().toLowerCase();
    }
    return r;
  });
}

/** Simulate backend validation: returns cellMeta errors for specific columns. */
function simulateValidation(
  updatedRows: Row[],
  rowKeyFn: (row: Row, idx: number) => string,
): CellMetaMap {
  const meta: CellMetaMap = {};
  updatedRows.forEach((row, i) => {
    const key = rowKeyFn(row, i);
    const cells: Record<string, { title?: string; className?: string }> = {};
    // Email: must contain @
    if (row.email != null && row.email !== "" && !String(row.email).includes("@")) {
      cells.email = { title: "Invalid email: must contain @", className: "cell-error" };
    }
    // First name: required, min 2 chars
    if (row.firstName != null && row.firstName !== "" && String(row.firstName).length < 2) {
      cells.firstName = { title: "Too short: minimum 2 characters", className: "cell-warning" };
    }
    // Last name: must not be empty if first name is set
    if (row.firstName && (!row.lastName || String(row.lastName).trim() === "")) {
      cells.lastName = { title: "Last name is required", className: "cell-error" };
    }
    if (Object.keys(cells).length > 0) {
      meta[key] = { cells };
    }
  });
  return meta;
}

const App = () => {
  const [allRows, setAllRows] = useState(initialRows);
  const [dataMode, setDataMode] = useLocalStorage<DataMode>("ct-data-mode", "local");
  const [activeTheme, setActiveTheme] = useLocalStorage("ct-theme", "light");

  const applyTheme = useCallback((themeId: string) => {
    const theme = themes.find((t) => t.id === themeId);
    if (!theme) return;
    let el = document.getElementById("theme-override") as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = "theme-override";
      document.head.appendChild(el);
    }
    el.textContent = theme.css;
  }, []);

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme, applyTheme]);


  // Controlled sort & filter — allows external reset
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState<FilterState>({});

  // Ellipsis toggle (persisted)
  const [ellipsis, setEllipsis] = useLocalStorage("ct-ellipsis", true);

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

          // Multi-select filter: \x00 prefix + newline-separated exact match
          if (filterVal.startsWith("\x00")) {
            const selectedVals = filterVal
              .slice(1)
              .split("\n")
              .filter(Boolean)
              .map((v) => (v === "\x01empty\x01" ? "" : v));
            if (cellVal == null || cellVal === "") return selectedVals.includes("");
            if (Array.isArray(cellVal))
              return (cellVal as unknown[]).some((v) => selectedVals.includes(String(v)));
            return selectedVals.includes(String(cellVal));
          }

          if (cellVal == null) return false;
          if (Array.isArray(cellVal))
            return (cellVal as unknown[]).some((v) =>
              String(v).toLowerCase().includes(filterVal.toLowerCase()),
            );
          return String(cellVal).toLowerCase().includes(filterVal.toLowerCase());
        }),
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
  const currentPageItems = useMemo(
    () => filteredSorted.slice(start, start + effectivePageSize),
    [filteredSorted, start, effectivePageSize],
  );
  const pageRows = useMemo(() => currentPageItems.map((item) => item.row), [currentPageItems]);

  // --- Async delay for each mode ---
  const asyncDelayMs =
    dataMode === "backend-slow" || dataMode === "backend-error" || dataMode === "backend-validation" || dataMode === "backend-stale"
      ? 2000
      : dataMode === "backend-offline"
        ? 200
        : dataMode === "backend-fast"
          ? 100
          : 0; // local = sync

  // --- useAsyncTableState hook ---
  const asyncState = useAsyncTableState({
    allRows,
    columns: initialColumns,
    sortConfig,
    filters,
    rowKeyFn: (_r, i) => "" + currentPageItems[i]?.origIdx,
    pageItems: currentPageItems,
    pageRows,
    totalFilteredRows,
    delayMs: asyncDelayMs,
    transformBackendRows:
      dataMode === "backend-stale" ? simulateServerNormalization : undefined,
    validateRows:
      dataMode === "backend-validation" ? simulateValidation : undefined,
  });

  const {
    displayRows,
    displayItems,
    displaySortConfig,
    displayFilters,
    displayTotalFilteredRows,
    status: hookStatus,
    loading,
    pendingSortColumn,
    pendingFilterColumns,
    asyncCellMeta,
    handleRowsChange: hookHandleRowsChange,
    handleUpdateRows: hookHandleUpdateRows,
    handleAsyncOp,
    setError: setLastError,
    markCellsUnsaved,
    consumeLastBatch,
    resolveBatch,
    clearAsyncMeta,
  } = asyncState;

  // Merge static example cellMeta + async meta from hook
  const mergedCellMeta = useMemo<CellMetaMap>(() => {
    const merged: CellMetaMap = { ...exampleCellMeta };
    for (const [rowKey, entry] of Object.entries(asyncCellMeta)) {
      if (!merged[rowKey]) {
        merged[rowKey] = entry;
      } else {
        merged[rowKey] = { ...merged[rowKey], cells: { ...merged[rowKey].cells, ...entry.cells } };
      }
    }
    return merged;
  }, [asyncCellMeta]);

  // --- Error/offline mode overrides (example-specific simulation) ---
  const backendOp = useCallback(
    (label: string): void | Promise<void> => {
      if (dataMode === "local") return undefined;
      if (dataMode === "backend-offline") {
        setLastError(`${label}: connection failed — changes kept locally`);
        return Promise.resolve();
      }
      if (dataMode === "backend-error") {
        const ms = 2000;
        return delayReject(ms, `${label} failed: server error`).catch((err: Error) => {
          setLastError(err.message);
          throw err;
        });
      }
      return handleAsyncOp(label);
    },
    [dataMode, handleAsyncOp, setLastError],
  );

  // Override status for error/offline modes
  const status = useMemo<TableStatus | undefined>(() => {
    if (dataMode === "local") return undefined;
    return hookStatus;
  }, [dataMode, hookStatus]);

  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps);
    setPage(1);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="example-page">
      <div className="theme-switcher">
        <span className="theme-switcher-label">Theme:</span>
        <select
          className="theme-switcher-select"
          value={activeTheme}
          onChange={(e) => setActiveTheme(e.target.value)}
        >
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <span className="theme-switcher-label" style={{ marginLeft: "2rem" }}>Mode:</span>
        <select
          className="theme-switcher-select"
          value={dataMode}
          onChange={(e) => {
            setDataMode(e.target.value as DataMode);
            clearAsyncMeta();
            try { localStorage.removeItem("ct-unsaved"); } catch {}
          }}
        >
          {(Object.keys(modeLabels) as DataMode[]).map((m) => (
            <option key={m} value={m}>
              {modeLabels[m]}
            </option>
          ))}
        </select>
      </div>
      <div className="app-table-wrapper">
        <CustomTable
          rows={displayRows}
          columns={initialColumns}
          numberOfStickyColums={1}
          caption="Employee Data"
          textEllipsisLength={ellipsis ? 25 : undefined}
          onRowsChange={(newRows) => {
            // Let hook handle tracking + optimistic patch
            hookHandleRowsChange(newRows);

            // Map changes back to the allRows source array
            const updated = [...allRows];
            if (newRows.length === displayRows.length) {
              newRows.forEach((r, i) => {
                updated[displayItems[i].origIdx] = r;
              });
            } else if (newRows.length > displayRows.length) {
              const added = newRows.slice(displayRows.length);
              newRows.slice(0, displayRows.length).forEach((r, i) => {
                updated[displayItems[i].origIdx] = r;
              });
              updated.push(...added);
            } else {
              const newSet = new Set(newRows);
              const removedOrigIdxs = new Set(
                displayItems
                  .filter((item) => !newSet.has(item.row))
                  .map((item) => item.origIdx),
              );
              setAllRows(updated.filter((_, i) => !removedOrigIdxs.has(i)));
              return;
            }
            setAllRows(updated);
          }}
          rowKey={(_row: Row, idx: number) => "" + displayItems[idx]?.origIdx}
          cellMeta={mergedCellMeta}
          sortConfig={displaySortConfig}
          onSortChange={setSortConfig}
          filters={displayFilters}
          onFilterChange={(f) => handleFilterChange(f)}
          status={status}
          loading={loading}
          pendingFilterColumns={pendingFilterColumns}
          pendingSortColumn={pendingSortColumn}
          onUpdateRows={(updatedRows) => {
            console.log("onUpdateRows:", updatedRows);
            if (dataMode === "backend-error") {
              const batch = consumeLastBatch();
              return delayReject(2000, "update failed: server error").catch((err: Error) => {
                resolveBatch(batch);
                setLastError(err.message);
                throw err;
              });
            }
            if (dataMode === "backend-offline") {
              const batch = consumeLastBatch();
              markCellsUnsaved(batch);
              setLastError("Connection error — retrying in background");
              // Background retry with exponential backoff
              const retryInBackground = async (attempt: number) => {
                const backoff = Math.min(2000 * 2 ** attempt, 30000);
                await delay(backoff);
                try {
                  await Promise.reject(new Error("connection refused"));
                } catch {
                  setLastError(
                    `Connection error — retry ${attempt + 2} in ${Math.round(Math.min(backoff * 2, 30000) / 1000)}s`,
                  );
                  retryInBackground(attempt + 1);
                }
              };
              retryInBackground(0);
              return Promise.resolve(); // no rollback
            }
            return hookHandleUpdateRows(updatedRows);
          }}
          onCreateRows={(rows) => {
            console.log("onCreateRows:", rows);
            return backendOp("create");
          }}
          onDeleteRows={(rows) => {
            console.log("onDeleteRows:", rows);
            return backendOp("delete");
          }}
          onUndo={(rows) => {
            console.log("onUndo:", rows);
            return backendOp("undo");
          }}
          onRedo={(rows) => {
            console.log("onRedo:", rows);
            return backendOp("redo");
          }}
          extraContextMenuItems={
            [
              {
                label: "Log selection",
                onClick: ({ selectedRows, selectionRange }) => {
                  console.log("Selected range:", selectionRange, "Rows:", selectedRows);
                },
              },
            ] satisfies CustomContextMenuItem[]
          }
        />
      </div>
      <div className="example-footer">
        <Pagination
          totalRows={displayTotalFilteredRows}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
        <div className="example-footer-controls">
          <button
            className="toolbar-button"
            disabled={!sortConfig && Object.keys(filters).every((k) => !filters[k])}
            onClick={() => {
              setSortConfig(null);
              setFilters({});
              setPage(1);
            }}
          >
            Reset Filter &amp; Sort
          </button>
          <button
            className={classNames("toolbar-button", "toggle", ellipsis && "active")}
            onClick={() => setEllipsis((e) => !e)}
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

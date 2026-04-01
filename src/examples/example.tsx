import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  CellMetaMap,
  ColumnConfig,
  CustomContextMenuItem,
  TableCraft,
  FilterState,
  Row,
  SelectionInfo,
  SortConfig,
  TableStatus,
} from "../index";
import { TextareaDialogEditor } from "../editors/TextareaDialogEditor";
import { Pagination } from "../pagination/Pagination";
import { useLocalStorage } from "./useLocalStorage";
import { ColumnManagerDialog } from "../core/ColumnManagerDialog";
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
    headerTitle: "Unique internal row ID",
    serverOwned: true,
  },
  {
    name: "complexKey",
    type: "String",
    label: "System Key",
    headerTitle: "Internal system key (10-50 characters)",
  },
  {
    name: "firstName",
    type: "String",
    label: "First Name",
    required: true,
    headerTitle: "First name of the person",
  },
  {
    name: "lastName",
    type: "String",
    label: "Last Name",
    required: true,
    headerTitle: "Last name of the person",
  },
  {
    name: "email",
    type: "String",
    label: "Email",
    required: true,
    headerTitle: "Email address in the format user@example.com",
  },
  {
    name: "department",
    type: "Combobox",
    label: "Department",
    selectOptions: ["HR", "IT", "Sales", "Marketing", "Finance", "Legal"],
    headerTitle: "Department / organizational unit",
  },
  {
    name: "skills",
    type: "MultiCombobox",
    label: "Skills",
    selectOptions: ["React", "TypeScript", "Python", "Java", "SQL", "AWS", "Docker", "Figma"],
    headerTitle: "Skills / competencies (multiple selection)",
  },
  {
    name: "description",
    type: "String",
    label: "Description",
    headerTitle: "Free text / long description (0-1000 characters)",
    editor: TextareaDialogEditor,
    dialogTitle: "${firstName} ${lastName}: Description",
    className: "col-description",
    wrap: true,
  },
  {
    name: "isActive",
    type: "Boolean",
    label: "Active",
    headerTitle: "Whether the person is active in the company",
  },
  {
    name: "salary",
    type: "Number",
    label: "Salary",
    headerTitle: "Annual salary in EUR",
    numberFormat: { decimalPlaces: 2, thousandsSeparator: true, suffix: " €" },
  },
  {
    name: "hireDate",
    type: "Date",
    label: "Hire Date",
    headerTitle: "Hire date (YYYY-MM-DD)",
    dateFormat: { dateStyle: "medium" },
  },
  { name: "manager", type: "String", label: "Manager", headerTitle: "Name of the direct manager" },
  {
    name: "officeLocation",
    type: "String",
    label: "Office Location",
    headerTitle: "Location or office",
  },
  {
    name: "phone",
    type: "String",
    label: "Phone",
    inputMask: "+## ### ########",
    headerTitle: "Phone number (international format)",
  },
  {
    name: "employeeNumber",
    type: "String",
    label: "Employee Number",
    headerTitle: "Company-internal employee number",
  },
  {
    name: "status",
    type: "String",
    label: "Employment Status",
    headerTitle: "Employment status (e.g. Active, On Leave)",
  },
  {
    name: "role",
    type: "String",
    label: "Role",
    headerTitle: "Job title / role in the company",
  },
  { name: "team", type: "String", label: "Team", headerTitle: "Team name or unit" },
  {
    name: "lastLogin",
    type: "DateTime",
    label: "Last Login",
    headerTitle: "Last login timestamp (ISO)",
    dateTimeFormat: { dateStyle: "medium", timeStyle: "short" },
  },
  {
    name: "performanceScore",
    type: "Number",
    label: "Score",
    headerTitle: "Rating value (0-5)",
    numberFormat: { decimalPlaces: 2, thousandsSeparator: false },
  },
  {
    name: "bonus",
    type: "Number",
    label: "Bonus",
    headerTitle: "Variable bonus payments in EUR",
    numberFormat: { decimalPlaces: 0, thousandsSeparator: true, prefix: "+ ", suffix: " €" },
  },
  {
    name: "contractType",
    type: "String",
    label: "Contract Type",
    headerTitle: "Type of contract (Permanent/Temporary/etc.)",
  },
  {
    name: "country",
    type: "Combobox",
    label: "Country",
    headerTitle: "Country of residence or workplace",
    selectOptions: ["Germany", "Netherlands", "Austria", "Switzerland", "France"],
    freeText: true,
  },
  {
    name: "city",
    type: "Combobox",
    label: "City",
    headerTitle: "City (dependent on Country)",
    selectOptions: (row) => {
      const cities: Record<string, string[]> = {
        Germany: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart"],
        Netherlands: ["Amsterdam", "Rotterdam", "Utrecht", "The Hague", "Eindhoven"],
        Austria: ["Vienna", "Graz", "Salzburg", "Innsbruck", "Linz"],
        Switzerland: ["Zurich", "Geneva", "Basel", "Bern", "Lausanne"],
        France: ["Paris", "Lyon", "Marseille", "Toulouse", "Strasbourg"],
      };
      return cities[row.country as string] ?? [];
    },
    freeText: true,
  },
  { name: "postalCode", type: "String", label: "Postal Code", headerTitle: "Postal code" },
  { name: "address", type: "String", label: "Address", headerTitle: "Street and house number" },
  { name: "linkedin", type: "String", label: "LinkedIn", headerTitle: "LinkedIn profile URL" },
  { name: "github", type: "String", label: "GitHub", headerTitle: "GitHub profile URL" },
  {
    name: "dateOfBirth",
    type: "Date",
    label: "Date of Birth",
    headerTitle: "Date of birth (YYYY-MM-DD)",
    dateFormat: { dateStyle: "long" },
  },
  {
    name: "emergencyContact",
    type: "String",
    label: "Emergency Contact",
    headerTitle: "Emergency contact (name + phone)",
  },
  {
    name: "checkInTime",
    type: "Time",
    label: "Check-In",
    headerTitle: "Daily check-in time",
    timeFormat: { showSeconds: false },
  },
  {
    name: "shiftDuration",
    type: "Duration",
    label: "Shift",
    headerTitle: "Standard shift duration",
    durationFormat: { style: "short" },
  },
  {
    name: "brandColor",
    type: "Color",
    label: "Color",
    headerTitle: "Team / brand color",
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
  const dataModeRef = useRef(dataMode);
  dataModeRef.current = dataMode;
  // Abort controller for background retry loops — cancelled on mode switch
  const retryAbortRef = useRef<AbortController | null>(null);
  // Ref for programmatic shake from outside TableCraft
  const shakeRef = useRef<(() => void) | null>(null);
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


  // Selection summary for numeric values
  const [selectionSummary, setSelectionSummary] = useState("");

  // Controlled sort & filter — allows external reset
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState<FilterState>({});

  // Column order & visibility (persisted)
  const [columnOrder, setColumnOrder] = useLocalStorage<string[]>("ct-column-order", []);
  const [hiddenColumnNames, setHiddenColumnNames] = useLocalStorage<string[]>("ct-hidden-columns", []);
  const hiddenColumns = useMemo(() => new Set(hiddenColumnNames), [hiddenColumnNames]);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);

  // Column widths (persisted)
  const [columnWidths, setColumnWidths] = useLocalStorage<Record<string, number>>("ct-column-widths", {});

  // Effective columns: reordered + filtered by visibility
  const effectiveColumns = useMemo(() => {
    const colMap = new Map(initialColumns.map((c) => [c.name, c]));
    const order = columnOrder.length > 0 ? columnOrder : initialColumns.map((c) => c.name);
    // Add any new columns not in saved order
    const orderSet = new Set(order);
    const fullOrder = [...order, ...initialColumns.filter((c) => !orderSet.has(c.name)).map((c) => c.name)];
    return fullOrder
      .filter((name) => !hiddenColumns.has(name))
      .map((name) => colMap.get(name))
      .filter(Boolean) as typeof initialColumns;
  }, [columnOrder, hiddenColumns]);

  // Ellipsis toggle (persisted)
  const [ellipsis, setEllipsis] = useLocalStorage("ct-ellipsis", true);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Pre-filter and sort ALL rows (same logic as TableCraft internally)
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
    if (sortConfig && sortConfig.length > 0) {
      indexed.sort((a, b) => {
        for (const { column, direction } of sortConfig) {
          const aVal = a.row[column];
          const bVal = b.row[column];
          if (aVal == null && bVal == null) continue;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
          if (cmp !== 0) return direction === "asc" ? cmp : -cmp;
        }
        return 0;
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
    columns: effectiveColumns,
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
    onStaleDetected: () => requestAnimationFrame(() => shakeRef.current?.()),
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
  // Uses dataModeRef so the callback always sees the CURRENT mode,
  // not the mode at closure-creation time.
  const backendOp = useCallback(
    (label: string): void | Promise<void> => {
      const mode = dataModeRef.current;
      if (mode === "local") return undefined;
      if (mode === "backend-offline") {
        setLastError(`${label}: connection failed — changes kept locally`);
        requestAnimationFrame(() => shakeRef.current?.());
        return Promise.resolve();
      }
      if (mode === "backend-error") {
        const ms = 2000;
        return delayReject(ms, `${label} failed: server error`).catch((err: Error) => {
          setLastError(err.message);
          throw err;
        });
      }
      return handleAsyncOp(label);
    },
    [handleAsyncOp, setLastError],
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

  const handleSelectionChange = useCallback(
    (sel: SelectionInfo) => {
      if (!sel.hasSelection) {
        setSelectionSummary("");
        return;
      }
      const { startRow, endRow, startCol, endCol } = sel.range;
      let sum = 0;
      let count = 0;
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const col = effectiveColumns[c];
          if (!col) continue;
          const val = displayRows[r]?.[col.name];
          const num = Number(val);
          if (val != null && val !== "" && !isNaN(num)) {
            sum += num;
            count++;
          }
        }
      }
      if (count > 0) {
        setSelectionSummary(
          `Sum: ${sum.toFixed(2)} | Count: ${count} | Avg: ${(sum / count).toFixed(2)}`,
        );
      } else {
        setSelectionSummary("");
      }
    },
    [displayRows],
  );

  return (
    <div className="example-page">
      <div className="theme-switcher">
        <a
          href="https://github.com/SebastianBaltes/customtable/blob/master/src/examples/example.tsx"
          target="_blank"
          rel="noopener noreferrer"
          className="view-source-link"
        >
          &lt;/&gt; View Source
        </a>
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
            // Cancel any running retry loops from previous mode
            retryAbortRef.current?.abort();
            retryAbortRef.current = null;
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
        <TableCraft
          rows={displayRows}
          columns={effectiveColumns}
          numberOfStickyColums={1}
          colSelection
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
          shakeRef={shakeRef}
          onUpdateRows={(updatedRows) => {
            console.log("onUpdateRows:", updatedRows);
            const mode = dataModeRef.current;
            if (mode === "backend-error") {
              const batch = consumeLastBatch();
              return delayReject(2000, "update failed: server error").catch((err: Error) => {
                resolveBatch(batch);
                setLastError(err.message);
                throw err;
              });
            }
            if (mode === "backend-offline") {
              const batch = consumeLastBatch();
              markCellsUnsaved(batch);
              setLastError("Connection error — retrying in background");
              requestAnimationFrame(() => shakeRef.current?.());
              // Cancel any previous retry loop
              retryAbortRef.current?.abort();
              const abort = new AbortController();
              retryAbortRef.current = abort;
              // Background retry with exponential backoff — checks current mode
              const retryInBackground = async (attempt: number) => {
                const backoff = Math.min(2000 * 2 ** attempt, 30000);
                await delay(backoff);
                if (abort.signal.aborted) return; // cancelled by mode switch
                const currentMode = dataModeRef.current;
                if (currentMode === "backend-offline") {
                  // Still in offline mode — keep retrying
                  setLastError(
                    `Connection error — retry ${attempt + 2} in ${Math.round(Math.min(backoff * 2, 30000) / 1000)}s`,
                  );
                  retryInBackground(attempt + 1);
                } else if (currentMode !== "local") {
                  // Mode switched to a working backend — resolve the pending batch
                  resolveBatch(batch);
                  clearAsyncMeta();
                } else {
                  // Switched to local mode — just clear everything
                  resolveBatch(batch);
                  clearAsyncMeta();
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
          onSelectionChange={handleSelectionChange}
          enableSearchReplace
          columnWidths={columnWidths}
          onColumnResize={(colName, width) => {
            setColumnWidths((prev) => ({ ...prev, [colName]: width }));
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
          maxVisiblePages={7}
          loading={loading}
        />
        {selectionSummary && (
          <span className="selection-summary">{selectionSummary}</span>
        )}
        <div className="example-footer-controls">
          <button
            className="toolbar-button"
            disabled={(!sortConfig || sortConfig.length === 0) && Object.keys(filters).every((k) => !filters[k])}
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
          <button
            className="toolbar-button"
            onClick={() => setColumnManagerOpen(true)}
            title="Manage columns (order, visibility)"
          >
            Columns
          </button>
          <button
            className="toolbar-button"
            disabled={columnOrder.length === 0 && hiddenColumnNames.length === 0 && Object.keys(columnWidths).length === 0}
            onClick={() => {
              setColumnOrder([]);
              setHiddenColumnNames([]);
              setColumnWidths({});
            }}
            title="Reset column order, visibility, and widths"
          >
            Reset Columns
          </button>
        </div>
      </div>
      <ColumnManagerDialog
        open={columnManagerOpen}
        onClose={() => setColumnManagerOpen(false)}
        columns={initialColumns}
        columnOrder={columnOrder.length > 0 ? columnOrder : initialColumns.map((c) => c.name)}
        onColumnOrderChange={setColumnOrder}
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={(s) => setHiddenColumnNames([...s])}
        onReset={() => {
          setColumnOrder([]);
          setHiddenColumnNames([]);
          setColumnWidths({});
        }}
      />
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

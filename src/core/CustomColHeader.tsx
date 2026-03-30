import { ColumnConfig, Cursor, SortConfig } from "./Types";
import classNames from "./classNames";
import React, { useContext, useState } from "react";
import { getCursorName } from "./CustomTable";
import { TranslationsContext } from "./TranslationsContext";
import { ComboboxFilter } from "./ComboboxFilter";

export const CustomColHeader = React.memo(
  ({
    colIdx,
    cursorRef,
    setCursorRef,
    column,
    rowsLength,
    sticky,
    sortConfig,
    onSortChange,
    filterValue,
    onFilterChange,
    filterOptions,
    loading,
    pendingSortColumn,
    pendingFilterColumns,
    textEllipsisLength,
  }: {
    colIdx: number;
    cursorRef: React.MutableRefObject<Cursor>;
    setCursorRef: (partialCursor: Partial<Cursor>) => void;
    column: ColumnConfig<any>;
    rowsLength: number;
    sticky: boolean;
    sortConfig: SortConfig;
    onSortChange: (config: SortConfig) => void;
    filterValue: string;
    onFilterChange: (value: string) => void;
    filterOptions?: string[];
    loading?: boolean;
    pendingSortColumn?: string;
    pendingFilterColumns?: string[];
    textEllipsisLength?: number;
  }) => {
    const t = useContext(TranslationsContext);
    const { editing, selectionStart, selectionEnd } = cursorRef.current;
    const colHasCursor =
      colIdx >= Math.min(selectionStart.colIdx, selectionEnd.colIdx) &&
      colIdx <= Math.max(selectionStart.colIdx, selectionEnd.colIdx);
    const cursorName = getCursorName("col-", colHasCursor, editing);
    const label = column.label ?? column.name;

    const isSorted = sortConfig?.column === column.name;
    const sortDirection = isSorted ? sortConfig!.direction : null;

    const isInteractiveTarget = (el: HTMLElement) => {
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "BUTTON") return true;
      // Clicks on the sort label should not trigger column selection
      if (el.closest(".col-header-label")) return true;
      return false;
    };

    // Buffered filter value: keeps user input responsive while the controlled
    // value (from display.filters) may lag behind in async/backend mode.
    const [localFilter, setLocalFilter] = useState(filterValue);
    const [prevControlled, setPrevControlled] = useState(filterValue);
    if (filterValue !== prevControlled) {
      setLocalFilter(filterValue);
      setPrevControlled(filterValue);
    }
    const bufferedFilterValue = localFilter;
    const handleBufferedFilterChange = (value: string) => {
      setLocalFilter(value);
      onFilterChange(value);
    };

    const handleSortClick = (event: React.MouseEvent) => {
      const tag = (event.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "BUTTON") return;
      if (!isSorted) {
        onSortChange({ column: column.name, direction: "asc" });
      } else if (sortDirection === "asc") {
        onSortChange({ column: column.name, direction: "desc" });
      } else {
        onSortChange(null);
      }
    };

    const sharedFilterProps = {
      className: "col-filter-input",
      onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
      onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
    };

    const isFilterPending = pendingFilterColumns?.includes(column.name) ?? false;

    const renderFilter = () => {
      if (column.filterable === false) return null;

      const filterSpinner =
        isFilterPending ? <span className="col-filter-spinner" aria-hidden="true" /> : null;

      // Custom filter editor
      if (column.filterEditor) {
        const FilterEditorComp = column.filterEditor;
        return (
          <div className="col-filter-wrap" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <FilterEditorComp value={bufferedFilterValue} onChange={handleBufferedFilterChange} column={column} />
            {filterSpinner}
          </div>
        );
      }

      // Combobox filter for columns with selectOptions
      if (filterOptions && filterOptions.length > 0) {
        return (
          <div className="col-filter-wrap">
            <ComboboxFilter value={bufferedFilterValue} onChange={handleBufferedFilterChange} options={filterOptions} />
            {filterSpinner}
          </div>
        );
      }

      // Built-in Boolean select
      if (column.type === "Boolean") {
        return (
          <div className="col-filter-wrap">
            <select
              {...sharedFilterProps}
              value={bufferedFilterValue}
              onChange={(e) => handleBufferedFilterChange(e.target.value)}
            >
              <option value=""></option>
              <option value="true">{t["Yes"]}</option>
              <option value="false">{t["No"]}</option>
            </select>
            {filterSpinner}
          </div>
        );
      }

      // Default text input
      return (
        <div className="col-filter-wrap">
          <input
            {...sharedFilterProps}
            type="text"
            value={bufferedFilterValue}
            onChange={(e) => handleBufferedFilterChange(e.target.value)}
          />
          {filterSpinner}
        </div>
      );
    };

    const align = column.align ?? (column.type === "Number" ? "right" : "left");
    return (
      <th
        scope="col"
        aria-label={column.label ?? column.name}
        className={classNames(
          "col-header",
          sticky && "sticky",
          cursorName,
          column.className,
          `col-type-${column.type}`,
          column.required && "col-required",
          column.readOnly && "col-readonly",
          column.wrap && "col-wrap",
          textEllipsisLength != null && "col-ellipsis",
          align !== "left" && `cell-align-${align}`,
        )}
        onMouseDown={(event) => {
          if (isInteractiveTarget(event.target as HTMLElement)) return;
          setCursorRef({
            editing: false,
            filling: false,
            colSelection: true,
            selectionStart: { rowIdx: 0, colIdx },
            selectionEnd: { rowIdx: rowsLength - 1, colIdx },
            fillEnd: { rowIdx: rowsLength - 1, colIdx },
          });
        }}
        onMouseMove={(event) => {
          if (isInteractiveTarget(event.target as HTMLElement)) return;
          if (event.buttons === 1 && cursorRef.current.colSelection && !cursorRef.current.filling) {
            setCursorRef({
              editing: false,
              filling: false,
              selectionEnd: { rowIdx: rowsLength - 1, colIdx },
              fillEnd: { rowIdx: rowsLength - 1, colIdx },
            });
          }
        }}
      >
        <div className="col-header-content">
          <span className="col-header-label" onClick={handleSortClick}>
            {label}
            {pendingSortColumn === column.name ? (
              <span className="col-sort-spinner" aria-label="loading" />
            ) : (
              <>
                {sortDirection === "asc" && (
                  <span className="col-sort-icon col-sort-asc" aria-label="sorted ascending">
                    {" "}
                    ▲
                  </span>
                )}
                {sortDirection === "desc" && (
                  <span className="col-sort-icon col-sort-desc" aria-label="sorted descending">
                    {" "}
                    ▼
                  </span>
                )}
              </>
            )}
          </span>
          {renderFilter()}
        </div>
      </th>
    );
  },
);

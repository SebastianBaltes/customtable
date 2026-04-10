import { ColumnConfig, Cursor, OnColumnResize, SortConfig } from "./Types";
import classNames from "./classNames";
import React, { useCallback, useContext, useRef, useState } from "react";
import { getCursorName } from "./GridDbEditor";
import { TranslationsContext } from "./TranslationsContext";
import { ComboboxFilter } from "./ComboboxFilter";
import { throttledMouseMove } from "./useCursor";
import { columnAlign } from "./utils";

export const ColHeader = React.memo(
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
    columnWidth,
    onColumnResize,
    colSelection,
  }: {
    colIdx: number;
    cursorRef: React.MutableRefObject<Cursor>;
    setCursorRef: (partialCursor: Partial<Cursor>) => void;
    column: ColumnConfig<any>;
    rowsLength: number;
    sticky: boolean;
    sortConfig: SortConfig;
    onSortChange: (config: SortConfig, colIdx?: number) => void;
    filterValue: string;
    onFilterChange: (value: string) => void;
    filterOptions?: string[];
    loading?: boolean;
    pendingSortColumn?: string;
    pendingFilterColumns?: string[];
    textEllipsisLength?: number;
    columnWidth?: number;
    onColumnResize?: OnColumnResize;
    colSelection?: boolean;
  }) => {
    const t = useContext(TranslationsContext);
    const { editing, selectionStart, selectionEnd } = cursorRef.current;
    const colHasCursor =
      colIdx >= Math.min(selectionStart.colIdx, selectionEnd.colIdx) &&
      colIdx <= Math.max(selectionStart.colIdx, selectionEnd.colIdx);
    const cursorName = getCursorName("col-", colHasCursor, editing);
    const isColSelected = colSelection && cursorRef.current.colSelection && colHasCursor;
    const label = column.label ?? column.name;

    // Multi-sort: find this column's position and direction in a single pass
    const sortIndex = sortConfig?.findIndex((s) => s.column === column.name) ?? -1;
    const sortEntry = sortIndex >= 0 ? sortConfig![sortIndex] : undefined;
    const isSorted = !!sortEntry;
    const sortDirection = sortEntry?.direction ?? null;
    const sortPriority = sortConfig && sortConfig.length > 1 ? sortIndex + 1 : 0;

    const isInteractiveTarget = (el: HTMLElement) => {
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "BUTTON") return true;
      if (el.closest(".col-resize-handle")) return true;
      return false;
    };

    const MIN_COL_WIDTH = 40;
    const thRef = useRef<HTMLTableCellElement>(null);
    const resizeHandleRef = useRef<HTMLDivElement>(null);

    const handleResizeMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (!onColumnResize) return;
        e.preventDefault();
        e.stopPropagation();

        const th = thRef.current;
        if (!th) return;
        const startX = e.clientX;
        const startWidth = th.getBoundingClientRect().width;

        resizeHandleRef.current?.classList.add("resizing");
        const viewport = th.closest(".grid-db-editor-viewport") as HTMLElement | null;
        if (viewport) viewport.style.pointerEvents = "none";
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";

        const onMouseMove = (ev: MouseEvent) => {
          const newWidth = Math.max(MIN_COL_WIDTH, startWidth + (ev.clientX - startX));
          onColumnResize(column.name, newWidth);
        };

        const onMouseUp = () => {
          resizeHandleRef.current?.classList.remove("resizing");
          if (viewport) viewport.style.pointerEvents = "";
          document.body.style.userSelect = "";
          document.body.style.cursor = "";
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      },
      [onColumnResize, column.name],
    );

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

      const current = sortConfig ?? [];
      const existing = current.findIndex((s) => s.column === column.name);

      if (event.shiftKey) {
        // Shift+click: add/cycle this column as additional sort criterion
        if (existing === -1) {
          onSortChange([...current, { column: column.name, direction: "asc" }], colIdx);
        } else if (current[existing].direction === "asc") {
          const next = [...current];
          next[existing] = { column: column.name, direction: "desc" };
          onSortChange(next, colIdx);
        } else {
          // Remove this column from multi-sort
          const next = current.filter((_, i) => i !== existing);
          onSortChange(next.length > 0 ? next : null, colIdx);
        }
      } else {
        // Regular click: single-sort (replaces all)
        if (!isSorted) {
          onSortChange([{ column: column.name, direction: "asc" }], colIdx);
        } else if (sortDirection === "asc") {
          onSortChange([{ column: column.name, direction: "desc" }], colIdx);
        } else {
          onSortChange(null, colIdx);
        }
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

    const align = columnAlign(column);
    return (
      <th
        ref={thRef}
        scope="col"
        aria-label={column.label ?? column.name}
        style={columnWidth != null ? { width: columnWidth, minWidth: columnWidth, maxWidth: columnWidth } : undefined}
        className={classNames(
          "col-header",
          sticky && "sticky",
          cursorName,
          isColSelected && "col-selected",
          column.className,
          `col-type-${column.type}`,
          column.required && "col-required",
          column.readOnly && "col-readonly",
          column.wrap && "col-wrap",
          textEllipsisLength != null && "col-ellipsis",
          align !== "left" && `cell-align-${align}`,
        )}
        onMouseDown={(event) => {
          if (!colSelection) return;
          if (isInteractiveTarget(event.target as HTMLElement)) return;
          if ((event.target as HTMLElement).closest(".col-header-label")) return;
          if (resizeHandleRef.current?.classList.contains("resizing")) return;
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
          if (!colSelection) return;
          if (isInteractiveTarget(event.target as HTMLElement)) return;
          if (event.buttons === 1 && cursorRef.current.colSelection && !cursorRef.current.filling) {
            throttledMouseMove(setCursorRef, {
              editing: false,
              filling: false,
              selectionEnd: { rowIdx: rowsLength - 1, colIdx },
              fillEnd: { rowIdx: rowsLength - 1, colIdx },
            });
          }
        }}
      >
        <div className="col-header-content">
          <span className="col-header-label" title={column.headerTitle} onClick={handleSortClick}>
            {label}
            {pendingSortColumn === column.name ? (
              <span className="col-sort-spinner" aria-label="loading" />
            ) : (
              <>
                {sortDirection === "asc" && (
                  <span className="col-sort-icon col-sort-asc" aria-label="sorted ascending">
                    {" "}▲{sortPriority > 0 && <sup className="col-sort-priority">{sortPriority}</sup>}
                  </span>
                )}
                {sortDirection === "desc" && (
                  <span className="col-sort-icon col-sort-desc" aria-label="sorted descending">
                    {" "}▼{sortPriority > 0 && <sup className="col-sort-priority">{sortPriority}</sup>}
                  </span>
                )}
              </>
            )}
          </span>
          {renderFilter()}
        </div>
        {onColumnResize && (
          <div
            ref={resizeHandleRef}
            className="col-resize-handle"
            onMouseDown={handleResizeMouseDown}
          />
        )}
      </th>
    );
  },
);

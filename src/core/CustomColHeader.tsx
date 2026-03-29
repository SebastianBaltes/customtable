import { ColumnConfig, Cursor, SortConfig } from "./Types";
import classNames from "./classNames";
import React, { useContext } from "react";
import { getCursorName } from "./CustomTable";
import { TranslationsContext } from "./TranslationsContext";

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
      return tag === "INPUT" || tag === "SELECT";
    };

    const handleSortClick = (event: React.MouseEvent) => {
      if (isInteractiveTarget(event.target as HTMLElement)) return;
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

    const renderFilter = () => {
      if (column.filterable === false) return null;

      // Custom filter editor
      if (column.filterEditor) {
        const FilterEditorComp = column.filterEditor;
        return (
          <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <FilterEditorComp value={filterValue} onChange={onFilterChange} column={column} />
          </div>
        );
      }

      // Built-in Boolean select
      if (column.type === "Boolean") {
        return (
          <select
            {...sharedFilterProps}
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
          >
            <option value=""></option>
            <option value="true">{t["Yes"]}</option>
            <option value="false">{t["No"]}</option>
          </select>
        );
      }

      // Default text input
      return (
        <input
          {...sharedFilterProps}
          type="text"
          value={filterValue}
          onChange={(e) => onFilterChange(e.target.value)}
        />
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
          </span>
          {renderFilter()}
        </div>
      </th>
    );
  },
);

import { CellAddr, ColumnConfig, Cursor, Row, SortConfig } from "./Types";
import classNames from "classnames";
import React from "react";
import { getCursorName } from "./CustomTable";

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
    const { editing, selectionStart } = cursorRef.current;
    const colHasCursor = colIdx === selectionStart.colIdx;
    const cursorName = getCursorName("col-", colHasCursor, editing);
    const label = column.label ?? column.name;

    const isSorted = sortConfig?.column === column.name;
    const sortDirection = isSorted ? sortConfig!.direction : null;

    const handleSortClick = (event: React.MouseEvent) => {
      // Don't trigger sort if clicking the filter input
      if ((event.target as HTMLElement).tagName === "INPUT") return;

      if (!isSorted) {
        onSortChange({ column: column.name, direction: "asc" });
      } else if (sortDirection === "asc") {
        onSortChange({ column: column.name, direction: "desc" });
      } else {
        onSortChange(null);
      }
    };

    return (
      <th
        className={classNames("col-header", sticky && "sticky", cursorName)}
        onMouseDown={(event) => {
          if ((event.target as HTMLElement).tagName === "INPUT") return;
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
          if ((event.target as HTMLElement).tagName === "INPUT") return;
          if (event.buttons === 1 && cursorRef.current.colSelection && !cursorRef.current.filling) {
            setCursorRef({
              editing: false,
              filling: false,
              selectionEnd: { rowIdx: rowsLength - 1, colIdx },
              fillEnd: { rowIdx: rowsLength - 1, colIdx },
            });
          }
        }}
        onClick={handleSortClick}
      >
        <div className="col-header-content">
          <span className="col-header-label">
            {label}
            {sortDirection === "asc" && " ▲"}
            {sortDirection === "desc" && " ▼"}
          </span>
          <input
            type="text"
            className="col-filter-input"
            placeholder="Filter..."
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      </th>
    );
  },
);

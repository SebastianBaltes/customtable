import React from "react";
import {
  CellAddr,
  CellMeta,
  CellMetaMap,
  ColumnConfig,
  Cursor,
  OnColumnResize,
  Row,
  RowMeta,
  SortConfig,
} from "./Types";
import { ColHeader } from "./ColHeader";
import { TableRow } from "./TableRow";
import { defaultRowKey } from "./GridDbEditor";
import classNames from "./classNames";

export const RowTable = React.memo(
  ({
    tableId,
    tableRef,
    cursorRef,
    setCursorRef,
    rows,
    columns,
    numberOfStickyColums,
    stickyPortal,
    onCellChange,
    editingCell,
    sortConfig,
    onSortChange,
    filters,
    onFilterChange,
    filterOptionsMap,
    loading,
    pendingSortColumn,
    pendingFilterColumns,
    cellMeta,
    getRowKey,
    textEllipsisLength,
    caption,
    columnWidths,
    onColumnResize,
    colSelection,
  }: {
    tableId: string;
    tableRef: React.RefObject<HTMLTableElement>;
    cursorRef: React.MutableRefObject<Cursor>;
    setCursorRef: (value: Partial<Cursor>) => void;
    rows: Row[];
    columns: ColumnConfig<any>[];
    numberOfStickyColums: number;
    stickyPortal: (() => any) | undefined;
    onCellChange: (rowIdx: number, colName: string, value: any) => void;
    editingCell: CellAddr | null;
    sortConfig: SortConfig;
    onSortChange: (config: SortConfig, colIdx?: number) => void;
    filters: Record<string, string>;
    onFilterChange: (colName: string, value: string) => void;
    filterOptionsMap?: Record<string, string[]>;
    loading?: boolean;
    pendingSortColumn?: string;
    pendingFilterColumns?: string[];
    cellMeta?: CellMetaMap;
    getRowKey: (row: Row, rowIndex: number) => string;
    textEllipsisLength?: number;
    caption?: string;
    columnWidths?: Record<string, number>;
    onColumnResize?: OnColumnResize;
    colSelection?: boolean;
  }) => {
    const resolvedGetRowKey = getRowKey ?? defaultRowKey;
    return (
      <table ref={tableRef} id={tableId}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {columnWidths && Object.keys(columnWidths).length > 0 && (
          <colgroup>
            {columns.map((column) => (
              <col
                key={column.name}
                style={
                  columnWidths[column.name] != null
                    ? { width: columnWidths[column.name] }
                    : undefined
                }
              />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            {columns.map((column, colIdx) => {
              return (
                <ColHeader
                  key={column.name}
                  {...{ colIdx, cursorRef, setCursorRef, column, rowsLength: rows.length }}
                  sticky={colIdx < numberOfStickyColums}
                  sortConfig={sortConfig}
                  onSortChange={onSortChange}
                  filterValue={filters[column.name] ?? ""}
                  onFilterChange={(value) => onFilterChange(column.name, value)}
                  filterOptions={filterOptionsMap?.[column.name]}
                  loading={loading}
                  pendingSortColumn={pendingSortColumn}
                  pendingFilterColumns={pendingFilterColumns}
                  textEllipsisLength={textEllipsisLength}
                  columnWidth={columnWidths?.[column.name]}
                  onColumnResize={onColumnResize}
                  colSelection={colSelection}
                />
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => {
            const rk = resolvedGetRowKey(row, rowIdx);
            const rowMetaSlice = cellMeta?.[rk];
            const rowMeta = rowMetaSlice?.row;
            const cellMetaForRow = rowMetaSlice?.cells;
            return (
              <TableRow
                key={rk}
                {...{
                  row,
                  rowIdx,
                  columns,
                  cursorRef,
                  setCursorRef,
                  numberOfStickyColums,
                  onCellChange,
                  editingCell,
                  rowMeta,
                  cellMetaForRow,
                  textEllipsisLength,
                }}
                ariaRowLabel={`Row ${rk}`}
              />
            );
          })}
          {stickyPortal && (
            <tr>
              {columns.map((column, colIdx) => (
                <td
                  className={classNames("cell", colIdx < numberOfStickyColums && "sticky")}
                  key={column.name}
                >
                  {colIdx === numberOfStickyColums - 1 && stickyPortal()}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    );
  },
);

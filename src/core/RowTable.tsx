import React from "react";
import { CellAddr, CellMeta, CellMetaMap, ColumnConfig, Cursor, Row, RowMeta, SortConfig } from "./Types";
import { CustomColHeader } from "./CustomColHeader";
import { CustomRow } from "./CustomRow";
import { defaultRowKey } from "./CustomTable";
import classNames from "classnames";

export const RowTable = React.memo(
  ({
    tableId,
    tableRef,
    cursorRef,
    setCursorRef,
    rows,
    columns,
    rowKey,
    numberOfStickyColums,
    stickyPortal,
    onCellChange,
    editingCell,
    sortConfig,
    onSortChange,
    filters,
    onFilterChange,
    cellMeta,
    getRowKey,
    textEllipsisLength,
  }: {
    tableId: string;
    tableRef: React.RefObject<HTMLTableElement>;
    cursorRef: React.MutableRefObject<Cursor>;
    setCursorRef: (value: Partial<Cursor>) => void;
    rows: Row[];
    columns: ColumnConfig<any>[];
    rowKey: ((row: Row, rowIndex: number) => string) | undefined;
    numberOfStickyColums: number;
    stickyPortal: (() => any) | undefined;
    onCellChange: (rowIdx: number, colName: string, value: any) => void;
    editingCell: CellAddr | null;
    sortConfig: SortConfig;
    onSortChange: (config: SortConfig) => void;
    filters: Record<string, string>;
    onFilterChange: (colName: string, value: string) => void;
    cellMeta?: CellMetaMap;
    getRowKey: (row: Row, rowIndex: number) => string;
    textEllipsisLength?: number;
  }) => {
    const resolvedGetRowKey = getRowKey ?? (rowKey ?? defaultRowKey);
    return (
      <table ref={tableRef} id={tableId}>
        <thead>
          <tr>
            {columns.map((column, colIdx) => {
              return (
                <CustomColHeader
                  key={column.name}
                  {...{ colIdx, cursorRef, setCursorRef, column, rowsLength: rows.length }}
                  sticky={colIdx < numberOfStickyColums}
                  sortConfig={sortConfig}
                  onSortChange={onSortChange}
                  filterValue={filters[column.name] ?? ""}
                  onFilterChange={(value) => onFilterChange(column.name, value)}
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
              <CustomRow
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

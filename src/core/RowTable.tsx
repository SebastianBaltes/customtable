import React from "react";
import { ColumnConfig, Cursor, Row } from "./Types";
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
  }) => {
    const getRowKey = rowKey ?? defaultRowKey;
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
                />
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => {
            return (
              <CustomRow
                key={getRowKey(row, rowIdx)}
                {...{
                  row,
                  rowIdx,
                  columns,
                  cursorRef,
                  setCursorRef,
                  numberOfStickyColums,
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

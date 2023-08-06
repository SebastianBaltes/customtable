import { ColumnConfig, Cursor, Row } from "./Types";
import React from "react";
import classNames from "classnames";
import { CustomCell } from "./CustomCell";
import { getCursorName } from "./CustomTable";

export const CustomRow = React.memo(
  ({
    row,
    rowIdx,
    columns,
    cursorRef,
    setCursorRef,
    numberOfStickyColums,
  }: {
    columns: ColumnConfig<any>[];
    cursorRef: React.MutableRefObject<Cursor>;
    setCursorRef: (partialCursor: Partial<Cursor>) => void;
    row: Row;
    rowIdx: number;
    numberOfStickyColums: number;
  }) => {
    const { editing, selectionStart } = cursorRef.current;
    const rowHasCursor = rowIdx === selectionStart.rowIdx;
    const rowClass = getCursorName("row-", rowHasCursor, editing);
    return (
      <tr className={classNames(rowClass)}>
        {columns.map((column, colIdx) => {
          return (
            <CustomCell
              key={column.name}
              {...{
                colIdx,
                column,
                cursorRef,
                rowIdx,
                setCursorRef,
                row,
              }}
              sticky={colIdx < numberOfStickyColums}
            />
          );
        })}
      </tr>
    );
  },
);

import { ColumnConfig, Cursor, Row } from "./Types";
import React from "react";
import classNames from "classnames";
import { getCursorName } from "./CustomTable";
import { renderCell } from "./renderCell";

export const CustomCell = React.memo(
  ({
    colIdx,
    column,
    cursorRef,
    rowIdx,
    setCursorRef,
    row,
    sticky,
  }: {
    colIdx: number;
    column: ColumnConfig<any>;
    cursorRef: React.MutableRefObject<Cursor>;
    rowIdx: number;
    setCursorRef: (partialCursor: Partial<Cursor>) => void;
    row: Row;
    sticky: boolean;
  }) => {
    const { editing, selectionStart } = cursorRef.current;
    const rowHasCursor = rowIdx === selectionStart.rowIdx;
    const cellHasCursor = rowHasCursor && colIdx === selectionStart.colIdx;
    const cellClass = getCursorName("cell-", cellHasCursor, editing);
    return (
      <td
        key={column.name}
        className={classNames("cell", sticky && "sticky", cellClass)}
        onMouseDown={(event) => {
          if (event.buttons == 1) {
            // wegen direktem DOM-Access muß in Listenern cursorRef.current verwendet werden
            const cursor = cursorRef.current.selectionStart;
            const cellHasCursor = rowIdx === cursor.rowIdx && colIdx === cursor.colIdx;
            setCursorRef({
              editing: cellHasCursor,
              selectionStart: { rowIdx, colIdx },
              selectionEnd: { rowIdx, colIdx },
              fillEnd: { rowIdx, colIdx },
              filling: false,
              colSelection: false,
            });
          }
        }}
        onMouseMove={(event) => {
          if (event.buttons === 1) {
            // wegen direktem DOM-Access muß in Listenern cursorRef.current verwendet werden
            const cursor = cursorRef.current;
            const selectionEnd = { rowIdx, colIdx };
            const fillEnd = { rowIdx, colIdx };
            setCursorRef(cursor.filling ? { fillEnd } : { selectionEnd, fillEnd });
          }
        }}
      >
        {renderCell(row[column.name], row, editing, column)}
      </td>
    );
  },
);

import { CellAddr, ColumnConfig, Cursor, Row } from "./Types";
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
  }: {
    colIdx: number;
    cursorRef: React.MutableRefObject<Cursor>;
    setCursorRef: (partialCursor: Partial<Cursor>) => void;
    column: ColumnConfig<any>;
    rowsLength: number;
    sticky: boolean;
  }) => {
    const { editing, selectionStart } = cursorRef.current;
    const colHasCursor = colIdx === selectionStart.colIdx;
    const cursorName = getCursorName("col-", colHasCursor, editing);
    const label = column.label ?? column.name;
    return (
      <th
        className={classNames("col-header", sticky && "sticky", cursorName)}
        onMouseDown={(event) => {
          // wegen direktem DOM-Access muß in Listenern cursorRef.current verwendet werden
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
          if (event.buttons === 1 && cursorRef.current.colSelection && !cursorRef.current.filling) {
            // wegen direktem DOM-Access muß in Listenern cursorRef.current verwendet werden
            setCursorRef({
              editing: false,
              filling: false,
              selectionEnd: { rowIdx: rowsLength - 1, colIdx },
              fillEnd: { rowIdx: rowsLength - 1, colIdx },
            });
          }
        }}
      >
        {label}
      </th>
    );
  },
);

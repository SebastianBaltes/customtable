import { CellMeta, ColumnConfig, Cursor, Row } from "./Types";
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
    onCellChange,
    isEditing,
    cellMeta,
  }: {
    colIdx: number;
    column: ColumnConfig<any>;
    cursorRef: React.MutableRefObject<Cursor>;
    rowIdx: number;
    setCursorRef: (partialCursor: Partial<Cursor>) => void;
    row: Row;
    sticky: boolean;
    onCellChange: (rowIdx: number, colName: string, value: any) => void;
    isEditing: boolean;
    cellMeta?: CellMeta;
  }) => {
    const { editing, selectionStart } = cursorRef.current;
    const rowHasCursor = rowIdx === selectionStart.rowIdx;
    const cellHasCursor = rowHasCursor && colIdx === selectionStart.colIdx;
    const cellClass = getCursorName("cell-", cellHasCursor, editing);
    const isDisabled = cellMeta?.disabled === true;
    const effectiveEditing = isDisabled ? false : isEditing;
    const handleChange = (value: any) => {
      if (isDisabled) return;
      onCellChange(rowIdx, column.name, value);
    };
    return (
      <td
        key={column.name}
        className={classNames("cell", sticky && "sticky", cellClass, isDisabled && "cell-disabled", cellMeta?.className)}
        style={cellMeta?.style}
        title={cellMeta?.title}
        onMouseDown={(event) => {
          if (event.buttons == 1) {
            const selectionStart = cursorRef.current.selectionStart;
            const cellHasCursor =
              rowIdx === selectionStart.rowIdx && colIdx === selectionStart.colIdx;
            setCursorRef({
              editing: isDisabled ? false : cellHasCursor,
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
            const cursor = cursorRef.current;
            const selectionEnd = { rowIdx, colIdx };
            const fillEnd = { rowIdx, colIdx };
            setCursorRef(cursor.filling ? { fillEnd } : { selectionEnd, fillEnd });
          }
        }}
      >
        {renderCell(row[column.name], row, effectiveEditing, column, handleChange)}
      </td>
    );
  },
);

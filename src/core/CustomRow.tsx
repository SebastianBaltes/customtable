import { CellAddr, CellMeta, ColumnConfig, Cursor, Row, RowMeta } from "./Types";
import React from "react";
import classNames from "./classNames";
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
    onCellChange,
    editingCell,
    rowMeta,
    cellMetaForRow,
    textEllipsisLength,
    ariaRowLabel,
  }: {
    columns: ColumnConfig<any>[];
    cursorRef: React.MutableRefObject<Cursor>;
    setCursorRef: (partialCursor: Partial<Cursor>) => void;
    row: Row;
    rowIdx: number;
    numberOfStickyColums: number;
    onCellChange: (rowIdx: number, colName: string, value: any) => void;
    editingCell: CellAddr | null;
    rowMeta?: RowMeta;
    cellMetaForRow?: Record<string, CellMeta>;
    textEllipsisLength?: number;
    ariaRowLabel?: string;
  }) => {
    const { editing, selectionStart, selectionEnd } = cursorRef.current;
    const rowHasCursor =
      rowIdx >= Math.min(selectionStart.rowIdx, selectionEnd.rowIdx) &&
      rowIdx <= Math.max(selectionStart.rowIdx, selectionEnd.rowIdx);
    const rowClass = getCursorName("row-", rowHasCursor, editing);
    return (
      <tr
        className={classNames(rowClass, rowMeta?.className)}
        style={rowMeta?.style}
        title={rowMeta?.title}
        aria-label={ariaRowLabel}
      >
        {columns.map((column, colIdx) => {
          const isEditing =
            editingCell != null && editingCell.rowIdx === rowIdx && editingCell.colIdx === colIdx;
          const cellMetaEntry = cellMetaForRow?.[column.name];
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
                onCellChange,
                isEditing,
                cellMeta: cellMetaEntry,
                textEllipsisLength,
                rowReadOnly: rowMeta?.readOnly,
              }}
              sticky={colIdx < numberOfStickyColums}
            />
          );
        })}
      </tr>
    );
  },
);

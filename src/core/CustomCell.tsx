import { CellMeta, ColumnConfig, Cursor, Row } from "./Types";
import React from "react";
import classNames from "classnames";
import { getCursorName } from "./CustomTable";
import { renderCell } from "./renderCell";
import { setPendingNumberEditorClick } from "../editors/NumberEditor";

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
    textEllipsisLength,
    rowReadOnly,
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
    textEllipsisLength?: number;
    rowReadOnly?: boolean;
  }) => {
    const { editing, selectionStart, initialEditValue } = cursorRef.current;
    const rowHasCursor = rowIdx === selectionStart.rowIdx;
    const cellHasCursor = rowHasCursor && colIdx === selectionStart.colIdx;
    const isReadOnly = column.readOnly === true || rowReadOnly === true || cellMeta?.disabled === true;
    const cellClass = getCursorName("cell-", cellHasCursor, editing && !isReadOnly);
    const isDisabled = cellMeta?.disabled === true;
    const effectiveEditing = isReadOnly ? false : isEditing;
    const handleChange = (value: any) => {
      if (isDisabled) return;
      onCellChange(rowIdx, column.name, value);
    };
    const align = column.align ?? (column.type === "Number" ? "right" : "left");
    return (
      <td
        key={column.name}
        data-row-idx={rowIdx}
        data-col-idx={colIdx}
        className={classNames("cell", sticky && "sticky", cellClass, isDisabled && "cell-disabled", cellMeta?.className, align !== "left" && `cell-align-${align}`)}
        style={cellMeta?.style}
        title={cellMeta?.title}
        onMouseDown={(event) => {
          if (event.buttons == 1) {
            const selectionStart = cursorRef.current.selectionStart;
            const cellHasCursor =
              rowIdx === selectionStart.rowIdx && colIdx === selectionStart.colIdx;

            // Check if click lands within the 2rem dropdown zone (right edge of cell)
            const isDropdownColumn = column.type === "Combobox" || column.type === "MultiCombobox";
            const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
            const cellRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const distFromRight = cellRect.right - event.clientX;
            const isDropdownZoneClick = isDropdownColumn && !isReadOnly && distFromRight <= 2 * rem;

            // For Number columns: single click on the already-selected cell enters edit
            // mode and positions the text cursor at the click location.
            const enterEditViaClick =
              cellHasCursor &&
              !isReadOnly &&
              !cursorRef.current.editing &&
              column.type === "Number";

            if (enterEditViaClick) {
              setPendingNumberEditorClick(event.clientX);
            }

            if (cellHasCursor && !isReadOnly) {
              event.preventDefault();
            }

            setCursorRef({
              editing: isDropdownZoneClick || enterEditViaClick,
              initialEditValue: null,
              selectionStart: { rowIdx, colIdx },
              selectionEnd: { rowIdx, colIdx },
              fillEnd: { rowIdx, colIdx },
              filling: false,
              colSelection: false,
            });
          }
        }}
        onDoubleClick={() => {
          if (!isReadOnly) {
            setCursorRef({
              editing: true,
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
        {renderCell(row[column.name], row, effectiveEditing, column, handleChange, textEllipsisLength, initialEditValue)}
        {!effectiveEditing && (column.type === "Combobox" || column.type === "MultiCombobox") && (
          <span className="cell-dropdown-indicator" aria-hidden="true">▾</span>
        )}
      </td>
    );
  },
);

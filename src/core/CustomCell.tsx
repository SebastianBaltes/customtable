import { CellMeta, ColumnConfig, Cursor, Row, ValidationResult } from "./Types";
import React, { useRef } from "react";
import classNames from "./classNames";
import { getCursorName } from "./CustomTable";
import { renderCell } from "./renderCell";
import { throttledMouseMove } from "./useCursor";
import { columnAlign, isDropdownType } from "./utils";

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
    const isDisabled = cellMeta?.disabled === true;
    const isReadOnly =
      column.readOnly === true || rowReadOnly === true || isDisabled;
    const lastTapRef = useRef(0);
    const cellClass = getCursorName("cell-", cellHasCursor, editing && !isReadOnly);
    const effectiveEditing = isReadOnly ? false : isEditing;
    const handleChange = (value: any) => {
      if (isDisabled) return;
      onCellChange(rowIdx, column.name, value);
    };
    const align = columnAlign(column);

    // Validation
    const cellValue = row[column.name];
    const validationResult = column.validate ? column.validate(cellValue) : null;
    let validationClass: string | null = null;
    let validationMessage: string | null = null;
    if (validationResult !== null) {
      if (validationResult === false) {
        validationClass = "cell-error";
      } else if (typeof validationResult === "object") {
        validationClass = validationResult.severity === "warning" ? "cell-warning" : "cell-error";
        validationMessage = validationResult.message;
      }
    }

    // Ellipsis: text value exceeds textEllipsisLength
    const isEllipsis =
      textEllipsisLength != null &&
      typeof cellValue === "string" &&
      cellValue.length > textEllipsisLength;

    return (
      <td
        key={column.name}
        data-row-idx={rowIdx}
        data-col-idx={colIdx}
        className={classNames(
          "cell",
          sticky && "sticky",
          cellClass,
          column.className,
          `col-type-${column.type}`,
          column.required && "col-required",
          isReadOnly && "col-readonly",
          column.wrap && "col-wrap",
          isDisabled && "cell-disabled",
          validationClass,
          isEllipsis && "cell-ellipsis",
          cellMeta?.className,
          align !== "left" && `cell-align-${align}`,
        )}
        style={cellMeta?.style}
        title={cellMeta?.title ?? validationMessage ?? undefined}
        onMouseDown={(event) => {
          if (event.buttons === 1) {
            const selectionStart = cursorRef.current.selectionStart;
            const cellHasCursor =
              rowIdx === selectionStart.rowIdx && colIdx === selectionStart.colIdx;

            // If already editing this cell and the click lands on the editor
            // input/textarea, let the browser handle cursor positioning natively.
            if (cellHasCursor && cursorRef.current.editing) {
              const target = event.target as HTMLElement;
              if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
            }

            // Check if click lands within the 2rem dropdown zone (right edge of cell)
            let isDropdownZoneClick = false;
            if (isDropdownType(column.type) && !isReadOnly) {
              const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
              const cellRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
              isDropdownZoneClick = cellRect.right - event.clientX <= 2 * rem;
            }

            const alreadyEditing = cellHasCursor && cursorRef.current.editing;

            if (cellHasCursor && !isReadOnly && !cursorRef.current.editing) {
              event.preventDefault();
            }

            setCursorRef({
              editing: alreadyEditing || isDropdownZoneClick,
              initialEditValue: isDropdownZoneClick ? "" : null,
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
              initialEditValue: "", // cursor at end, not select-all
            });
          }
        }}
        onClick={(event) => {
          // Triple-click → select all text in the editor
          // onDoubleClick already entered edit mode; we just override the selection
          if (event.detail >= 3 && !isReadOnly) {
            const td = event.currentTarget as HTMLElement;
            requestAnimationFrame(() => {
              const input = td.querySelector("input, textarea") as HTMLInputElement;
              if (input) input.select();
            });
          }
        }}
        onTouchEnd={(e) => {
          const now = Date.now();
          if (now - lastTapRef.current < 400 && !cursorRef.current.editing) {
            // Double-tap detected — enter edit mode with cursor at end
            e.preventDefault();
            if (!isReadOnly) {
              setCursorRef({ editing: true, initialEditValue: "" });
            }
            lastTapRef.current = 0; // reset so a third tap is not treated as double-tap
          } else {
            lastTapRef.current = now;
          }
        }}
        onMouseMove={(event) => {
          if (event.buttons === 1) {
            const cursor = cursorRef.current;
            const selectionEnd = { rowIdx, colIdx };
            const fillEnd = { rowIdx, colIdx };
            throttledMouseMove(setCursorRef, cursor.filling ? { fillEnd } : { selectionEnd, fillEnd });
          }
        }}
      >
        {renderCell(
          row[column.name],
          row,
          effectiveEditing,
          column,
          handleChange,
          textEllipsisLength,
          initialEditValue,
          () => setCursorRef({ editing: false }),
        )}
        {!effectiveEditing && isDropdownType(column.type) && (
          <span className="cell-dropdown-indicator" aria-hidden="true">
            ▾
          </span>
        )}
      </td>
    );
  },
);

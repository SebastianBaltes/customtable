import React from "react";
import { ColumnConfig, Row } from "./Types";
import { useCursorKeys } from "./useCursorKeys";
import { forceUpdateCursorRect } from "./directDomUpdateForCursor";
import { ContextMenu } from "./ContextMenu";
import { RowTable } from "./RowTable";
import { useStickyColumnsLeftChecker } from "./useStickColumnLeftsChecker";
import { useOnGridResize } from "./useGridResizeChecker";
import { useContextMenu } from "./useContextMenu";
import { useCursor } from "./useCursor";

export const getCursorName = (prefix: string, hasCursor: boolean, editing: boolean) =>
  hasCursor ? prefix + (editing ? "edited" : "selected") : "";

export const defaultRowKey = (row: Row, rowIndex: number) => "" + rowIndex;

interface IRequiredProps {
  rows: Row[];
  columns: ColumnConfig<any>[];
}

interface IProps {
  onCreateRows: (rows: Row[]) => void;
  onUpdateRows: (rows: Row[]) => void;
  onDeleteRows: (rows: Row[]) => void;
  rowKey: (row: Row, rowIndex: number) => string;
  numberOfStickyColums: number;
}

type CustomTableProps = IRequiredProps & Partial<IProps>;

export const CustomTable: React.FC<CustomTableProps> = React.memo(
  ({
    rows,
    columns,
    onCreateRows,
    onUpdateRows,
    onDeleteRows,
    rowKey,
    numberOfStickyColums = 0,
  }: CustomTableProps) => {
    const [tableId] = React.useState(() => `MkEu3ZWrGK${Math.floor(Math.random() * 1000000)}`);

    const {
      cursorRef,
      viewportRef,
      tableRef,
      selectionRectangleRef,
      selectionRectangleStickyRef,
      fillRectangleRef,
      fillRectangleStickyRef,
      setCursorRef,
      handleKeyDown,
      customTableRef,
    } = useCursor(rows, columns, numberOfStickyColums);

    const { stickyColumnsLefts } = useStickyColumnsLeftChecker(
      tableRef,
      numberOfStickyColums,
      tableId,
    );

    useOnGridResize(tableRef, rows.length, columns.length, () => {
      forceUpdateCursorRect(
        cursorRef.current,
        numberOfStickyColums,
        viewportRef,
        tableRef,
        selectionRectangleRef,
        selectionRectangleStickyRef,
        fillRectangleRef,
        fillRectangleStickyRef,
      );
    });

    const { contextMenu, openContextMenu, closeContextMenu, contextMenuItems } = useContextMenu();

    const selectionRectangleDraggerOnMouseDown = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setCursorRef({
        filling: true,
      });
    };

    return (
      <div ref={customTableRef} className="custom-table" onKeyDown={handleKeyDown} tabIndex={0}>
        {stickyColumnsLefts.css != null && (
          <style dangerouslySetInnerHTML={{ __html: stickyColumnsLefts.css }} />
        )}
        <div ref={viewportRef} className="custom-table-viewport" onContextMenu={openContextMenu}>
          <RowTable
            {...{
              tableId,
              tableRef,
              cursorRef,
              setCursorRef,
              rows,
              columns,
              rowKey,
              numberOfStickyColums,
            }}
            stickyPortal={
              numberOfStickyColums === 0
                ? undefined
                : () => (
                    <>
                      <div
                        ref={selectionRectangleStickyRef}
                        id="selection-rectangle-sticky"
                        className="selection-rectangle"
                      >
                        <div
                          className="selection-rectangle-dragger"
                          onMouseDown={selectionRectangleDraggerOnMouseDown}
                        ></div>
                      </div>
                      <div
                        ref={fillRectangleStickyRef}
                        id="fill-rectangle-sticky"
                        className="fill-rectangle"
                      ></div>
                    </>
                  )
            }
          />
          <div ref={selectionRectangleRef} id="selection-rectangle" className="selection-rectangle">
            <div
              className="selection-rectangle-dragger"
              onMouseDown={selectionRectangleDraggerOnMouseDown}
            ></div>
          </div>
          <div ref={fillRectangleRef} id="fill-rectangle" className="fill-rectangle"></div>
          {contextMenu.visible && (
            <ContextMenu
              position={contextMenu.position}
              items={contextMenuItems}
              hideMenu={closeContextMenu}
            />
          )}
        </div>
      </div>
    );
  },
);

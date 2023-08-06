import { ColumnConfig, Cursor, Row } from "./Types";
import { useEffect, useRef } from "react";
import { directDomUpdateForCursor } from "./directDomUpdateForCursor";
import { useCursorKeys } from "./useCursorKeys";

export function useCursor(rows: Row[], columns: ColumnConfig<any>[], numberOfStickyColums: number) {
  const cursorRef = useRef<Cursor>({
    editing: false,
    filling: false,
    colSelection: false,
    selectionStart: { colIdx: -1, rowIdx: -1 },
    selectionEnd: { colIdx: -1, rowIdx: -1 },
    fillEnd: { colIdx: -1, rowIdx: -1 },
  });

  const viewportRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const selectionRectangleRef = useRef<HTMLDivElement>(null);
  const fillRectangleRef = useRef<HTMLDivElement>(null);
  const selectionRectangleStickyRef = useRef<HTMLDivElement>(null);
  const fillRectangleStickyRef = useRef<HTMLDivElement>(null);

  const setCursorRef = (partialCursor: Partial<Cursor>) => {
    const oldCursor = cursorRef.current;
    const newCursor: Cursor = (cursorRef.current = {
      ...oldCursor,
      ...partialCursor,
    });
    directDomUpdateForCursor(
      oldCursor,
      newCursor,
      numberOfStickyColums,
      viewportRef,
      tableRef,
      selectionRectangleRef,
      selectionRectangleStickyRef,
      fillRectangleRef,
      fillRectangleStickyRef,
    );
  };

  useEffect(() => {
    setCursorRef({
      editing: false,
      filling: false,
      colSelection: false,
      selectionStart: { colIdx: 0, rowIdx: 0 },
      selectionEnd: { colIdx: 0, rowIdx: 0 },
      fillEnd: { colIdx: 0, rowIdx: 0 },
    });
  }, [rows]);

  const handleKeyDown = useCursorKeys(cursorRef, setCursorRef, rows, columns);

  return {
    cursorRef,
    viewportRef,
    tableRef,
    selectionRectangleRef,
    selectionRectangleStickyRef,
    fillRectangleRef,
    fillRectangleStickyRef,
    setCursorRef,
    handleKeyDown,
  };
}

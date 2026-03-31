import React, { useEffect, useRef } from "react";

export function useOnGridResize(
  tableRef: React.RefObject<HTMLTableElement>,
  rowsLength: number,
  columnsLength: number,
  onResize: () => void,
) {
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    const observer = new ResizeObserver(() => onResizeRef.current());
    const cells = tableRef.current?.rows?.[0]?.cells;
    if (cells) {
      for (let i = 0; i < columnsLength; i++) {
        observer.observe(cells[i]);
      }
    }
    return () => {
      observer.disconnect();
    };
  }, [columnsLength]);

  useEffect(() => {
    const observer = new ResizeObserver(() => onResizeRef.current());
    const rows = tableRef.current?.rows;
    if (rows) {
      for (let i = 0; i < rowsLength; i++) {
        observer.observe(rows[i].cells[0]);
      }
    }
    return () => {
      observer.disconnect();
    };
  }, [rowsLength]);
}

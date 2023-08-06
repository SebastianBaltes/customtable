import React, { useEffect, useState } from "react";
import { arrayEquals } from "./utils";
import { ColumnConfig, Row } from "./Types";

interface StickColumnLefts {
  lefts: number[];
  css: string | null;
}

export function useOnGridResize(
  tableRef: React.RefObject<HTMLTableElement>,
  rowsLength: number,
  columnsLength: number,
  onResize: () => void,
) {
  useEffect(() => {
    const observer = new ResizeObserver(onResize);
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
    const observer = new ResizeObserver(onResize);
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

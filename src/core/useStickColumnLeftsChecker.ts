import React, { useEffect, useRef, useState } from "react";
import { arrayEquals } from "./utils";

interface StickColumnLefts {
  lefts: number[];
  css: string | null;
}

export function useStickyColumnsLeftChecker(
  tableRef: React.RefObject<HTMLTableElement>,
  numberOfStickyColums: number,
  tableId: string,
) {
  const [stickyColumnsLefts, setStickyColumnsLefts] = useState<StickColumnLefts>({
    lefts: [],
    css: null,
  });

  const leftsRef = useRef(stickyColumnsLefts.lefts);
  leftsRef.current = stickyColumnsLefts.lefts;

  useEffect(() => {
    if (numberOfStickyColums <= 0) return;

    const checkStickyColumnsLefts = () => {
      const columns = tableRef.current?.rows?.[0]?.cells;
      if (columns == null) return;
      let x = 0;
      const lefts: number[] = [];
      for (let i = 0; i < numberOfStickyColums; i++) {
        lefts.push(x);
        x += columns[i].offsetWidth;
      }
      if (!arrayEquals(leftsRef.current, lefts)) {
        const css = lefts
          .map(
            (left, index) =>
              `#${tableId}>thead>tr>th:nth-child(${index + 1}),#${tableId}>tbody>tr>td:nth-child(${
                index + 1
              }) { left: ${left}px; }`,
          )
          .join("\n");
        setStickyColumnsLefts({ lefts, css });
      }
    };

    const observer = new ResizeObserver(checkStickyColumnsLefts);
    const cells = tableRef.current?.rows?.[0]?.cells;
    if (cells) {
      for (let i = 0; i < numberOfStickyColums; i++) {
        observer.observe(cells[i]);
      }
    }
    return () => {
      observer.disconnect();
    };
  }, [numberOfStickyColums, tableId]);

  return { stickyColumnsLefts };
}

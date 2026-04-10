import { useState, useCallback, useRef } from "react";

export function useColumnWidthAnimation(
  tableRef: React.RefObject<HTMLTableElement>, 
  viewportRef: React.RefObject<HTMLDivElement>,
  tableId: string
) {
  const [frozenCss, setFrozenCss] = useState<string>("");
  const frozenCssRef = useRef<string>("");
  const isFilterFocusedRef = useRef(false);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getWidths = () => {
    if (!tableRef.current) return [];
    const ths = Array.from(tableRef.current.querySelectorAll("thead th"));
    return ths.map(th => (th as HTMLElement).offsetWidth);
  };

  const getCss = (widths: number[], withTransition = false) => {
    const transitionRule = withTransition ? "transition: width 0.3s ease, min-width 0.3s ease, max-width 0.3s ease;" : "";
    return widths.map((w, i) => {
      return `#${tableId} th:nth-child(${i+1}), #${tableId} td:nth-child(${i+1}) { width: ${w}px !important; min-width: ${w}px !important; max-width: ${w}px !important; overflow: hidden; ${transitionRule} }`;
    }).join("\n");
  };
  
  const applyCss = (css: string) => {
    frozenCssRef.current = css;
    setFrozenCss(css);
  };

  const freeze = useCallback(() => {
    const widths = getWidths();
    if (widths.length > 0) {
      applyCss(getCss(widths, false));
    }
  }, [tableId, tableRef]);

  const animateToNatural = useCallback(() => {
    if (isFilterFocusedRef.current) return;
    
    const oldCss = frozenCssRef.current;
    if (!oldCss) return;
    
    applyCss("");
    
    requestAnimationFrame(() => {
      if (isFilterFocusedRef.current) return;
      
      const newWidths = getWidths();
      if (newWidths.length === 0) return;
      
      applyCss(oldCss);
      
      requestAnimationFrame(() => {
        if (!tableRef.current || isFilterFocusedRef.current) return;
        void tableRef.current.offsetHeight; // Force reflow
        
        applyCss(getCss(newWidths, true));
        
        if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
        animationTimerRef.current = setTimeout(() => {
          if (!isFilterFocusedRef.current) {
            applyCss("");
          }
        }, 350);
      });
    });
  }, [tableId, tableRef]);

  const handleFocusCapture = useCallback((e: React.FocusEvent) => {
    if (e.target instanceof HTMLElement && e.target.classList.contains("col-filter-input")) {
      isFilterFocusedRef.current = true;
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      if (!frozenCssRef.current) freeze();
    }
  }, [freeze]);

  const handleBlurCapture = useCallback((e: React.FocusEvent) => {
    if (e.target instanceof HTMLElement && e.target.classList.contains("col-filter-input")) {
      isFilterFocusedRef.current = false;
      requestAnimationFrame(() => animateToNatural());
    }
  }, [animateToNatural]);

  const onSortInitiated = useCallback((colIdx: number) => {
    const vp = viewportRef.current;
    const table = tableRef.current;
    if (!vp || !table || colIdx < 0) return;

    const ths = Array.from(table.querySelectorAll("thead th"));
    const th = ths[colIdx] as HTMLElement;
    if (!th) return;

    const originalOffsetLeft = th.offsetLeft;
    const originalScrollLeft = vp.scrollLeft;
    const relativeX = originalOffsetLeft - originalScrollLeft;

    // Adjust scroll position after sorting to keep the clicked column at the same visual X
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const updatedTable = tableRef.current;
        const updatedVp = viewportRef.current;
        if (!updatedTable || !updatedVp) return;
        
        const newThs = Array.from(updatedTable.querySelectorAll("thead th"));
        const newTh = newThs[colIdx] as HTMLElement;
        if (!newTh) return;

        const newOffsetLeft = newTh.offsetLeft;
        const targetScrollLeft = newOffsetLeft - relativeX;
        updatedVp.scrollLeft = Math.max(0, targetScrollLeft);
      });
    });
  }, [tableRef, viewportRef]);

  return {
    frozenCss,
    handleFocusCapture,
    handleBlurCapture,
    onSortInitiated
  };
}

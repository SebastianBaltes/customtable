import { useEffect, useRef, useState } from "react";
import { useWindowSize } from "./useWindowSize";

interface PositionState {
  top: number;
  left: number;
  visibility: "hidden" | "visible";
}

export function usePositionInsideViewport(x: number, y: number) {
  const menuRef = useRef<HTMLDivElement>(null);
  const viewportSize = useWindowSize();
  const [pos, setPos] = useState<PositionState>({ top: 0, left: 0, visibility: "hidden" });

  useEffect(() => {
    if (menuRef.current) {
      const { width, height } = menuRef.current.getBoundingClientRect();
      const { width: vw, height: vh } = viewportSize;
      setPos({
        top: y + height > vh ? y - height : y,
        left: x + width > vw ? x - width : x,
        visibility: "visible",
      });
    }
  }, [viewportSize, x, y]);
  return { menuRef, visibility: pos.visibility, top: pos.top, left: pos.left };
}

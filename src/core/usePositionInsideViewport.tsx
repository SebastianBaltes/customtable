import { useEffect, useRef, useState } from "react";
import { useWindowSize } from "./useWindowSize";

export function usePositionInsideViewport(x: number, y: number) {
  const menuRef = useRef<HTMLDivElement>(null);
  const viewportSize = useWindowSize();
  const [visibility, setVisibility] = useState<any>("hidden");
  const [top, setTop] = useState(0);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (menuRef.current) {
      const { width, height } = menuRef.current.getBoundingClientRect();
      const { width: vw, height: vh } = viewportSize;
      setTop(y + height > vh ? y - height : y);
      setLeft(x + width > vw ? x - width : x);
      setVisibility("visible");
    }
  }, [viewportSize, x, y]);
  return { menuRef, visibility, top, left };
}

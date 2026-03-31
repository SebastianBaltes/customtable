import { useEffect, RefObject } from "react";

/** Prevents useCursor's document-level handler from receiving mousedown events inside dialog overlays. */
export function useStopMousedownPropagation(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: MouseEvent) => e.stopPropagation();
    el.addEventListener("mousedown", stop, { capture: true });
    return () => el.removeEventListener("mousedown", stop, { capture: true });
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
}

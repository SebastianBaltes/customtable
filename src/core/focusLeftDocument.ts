/**
 * True when a focusout is caused by the whole DOCUMENT losing focus — switching
 * to another window or browser tab, opening devtools, alt-tabbing away — rather
 * than by the focus moving somewhere else inside the page.
 *
 * The grid drops its selection when the focus leaves it, so that a click
 * elsewhere on the page visibly deselects. Switching windows must not count as
 * leaving: the browser restores the focus to the grid on the way back, the grid
 * then sees "focused, but nothing selected" and seeds the cursor at (0,0) — and
 * `directDomUpdateForCursor` scrolls the viewport up to that cell. Observed as
 * "focus and scrolling jump to cell 0/0" on Firefox/Windows, and as a focus
 * jump without the scroll on Linux.
 *
 * `relatedTarget` is null in BOTH cases, so it cannot tell them apart on its
 * own. Two further signals can, and browsers disagree on which one is readable
 * while the event is being dispatched:
 *
 *   - `document.hasFocus()` is false once the document lost the focus.
 *   - Firefox keeps `document.activeElement` on the element it just blurred,
 *     while a focus move INSIDE the page has already put it on <body> (or on
 *     the new element).
 *
 * Either signal on its own is enough, so both are accepted.
 */
export function focusLeftDocument(e: {
  relatedTarget: EventTarget | null;
  currentTarget: EventTarget | null;
}): boolean {
  // A focus that names its new home stays inside the page by definition.
  if (e.relatedTarget !== null) return false;
  if (typeof document === "undefined") return false;
  if (!document.hasFocus()) return true;
  return e.currentTarget !== null && document.activeElement === e.currentTarget;
}

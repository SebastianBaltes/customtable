# Performance

GridDbEditor is designed for small to medium datasets rendered as a native HTML `<table>`. The cursor/selection system bypasses React re-renders entirely via direct DOM manipulation (`classList`, `style`).

## Implemented Optimizations

### RAF-throttled Mousemove

During selection-drag and fill-drag, `onMouseMove` events can fire 100+ times per second. Each event would trigger `setCursorRef` -> `directDomUpdateForCursor` -> `getBoundingClientRect` (forced reflow). A shared `requestAnimationFrame` dispatcher batches these updates to at most once per frame (60/s). The visual result is identical since the browser renders at 60 FPS anyway.

- **Measured improvement: 86% less CPU time** during drag operations (130 ms to 18 ms for 300 events on a 101x30 table).
- Code: `throttledMouseMove()` in `useCursor.tsx`, used by `TableCell.onMouseMove` and `ColHeader.onMouseMove`.

### CSS Containment

`contain: content` on `.cell` tells the browser that layout changes inside cells cannot affect elements outside. This allows the browser to skip unnecessary reflow calculations on surrounding DOM.

- Measured improvement: ~4% on isolated pages, more significant when the table is embedded in complex layouts.

### GPU Compositing Hint

`will-change: top, left, width, height` on `.selection-rectangle` and `.fill-rectangle` promotes these frequently-repositioned overlays to their own compositing layer, avoiding repaints of underlying cells.

## Evaluated but not Implemented

The following optimizations were prototyped, benchmarked, and deliberately rejected due to unfavorable complexity/benefit ratio:

### Event Delegation

Moving mouse handlers from individual cells to `<tbody>`/`<thead>` would reduce ~12,000 React handler props to 6. However, React already delegates events internally — the "12,000 handlers" are closures, not DOM listeners. The delegated version required duplicating cell interaction logic (readOnly checks, dropdown zone detection, cellMeta lookups), making it fragile. The memory savings were not measurable in practice.

### Cell Position Cache

Caching `getBoundingClientRect` results during drag would eliminate redundant reflow calls. However, with RAF-throttling already in place, only ~7-10 BCR calls remain per drag operation (down from 250+ without throttling). The cache reduced this to ~5-7 — a marginal improvement that added lifecycle complexity.

### editingCell State Isolation

Replacing React state with a ref + portal would eliminate `React.memo` comparison overhead on 300+ rows when entering/exiting edit mode. Not implemented because the current approach already filters out most re-renders via `React.memo`, and the complexity of managing a portal-based editor injection is high.

### Row/Column Highlight Overlay

Replacing `classList` operations with overlay divs would reduce N classList operations to 2 style updates. Not implemented because classList is already fast for typical table sizes, and the overlay approach introduces complexity around sticky column clipping.

## Why No Virtualization?

GridDbEditor deliberately uses native `<table>` elements. This gives:

- **Native column sizing** — browser calculates widths based on content
- **Native sticky positioning** — `position: sticky` on headers and columns
- **Full CSS control** — standard selectors work on every cell
- **Screen reader support** — native table semantics
- **Zero scroll jank** — no measurement/recycling overhead

The trade-off: not suited for 5,000+ rows without pagination. For admin/back-office use cases (10-500 rows per page), native tables outperform virtualized grids in perceived responsiveness.

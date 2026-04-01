# Performance Optimization Report: CustomTable

## 1. Current State: Architecture Analysis

### Cursor/Selection: Direct DOM Manipulation (very efficient)

Cursor movement (arrow keys, Tab, mouse click, drag) avoids React re-renders entirely. `directDomUpdateForCursor.tsx` works exclusively with:

- `classList.add()` / `classList.remove()` on `<th>`, `<tr>`, `<td>` elements
- Direct `style` property assignments on the selection-rectangle divs
- `getBoundingClientRect()` for position calculations

**Only React state trigger:** `setEditingCell()` in `useCursor.tsx` — only when entering edit mode.

### Selection Rectangle: Overlay Approach (efficient)

Two separate rectangles (normal + sticky) are positioned synchronously via the DOM. No `requestAnimationFrame` is used for the positioning itself — only for auto-scroll during drag.

### Row/Column Background Shading

`.row-selected`, `.col-selected` are applied via `classList` directly to DOM elements. **No React re-render** is required. The CSS engine handles painting.

### React Rendering

All components use `React.memo()`: `CustomTable`, `RowTable`, `CustomRow`, `CustomCell`, `CustomColHeader`. Re-renders are only triggered on prop changes.

---

## 2. Optimization Opportunities

### 2.1 Reduce `getBoundingClientRect()` Calls on Every Mousemove

**Problem:** During selection drag, `forceUpdateCursorRect()` calls `getBoundingClientRect()` for the start and end cell on every `onMouseMove` event. This forces a browser layout reflow.

**Solution:** Cache cell positions. Since cells do not change size during a drag, compute a position grid once on `mousedown` and reuse it during the drag.

```text
// Pseudo-Code (plain text to avoid language parsing)
let cellPositionCache: Map<string, DOMRect> | null = null;

onMouseDown -> cellPositionCache = buildPositionCache(table);
onMouseMove -> lookup from cellPositionCache (no reflow)
onMouseUp -> cellPositionCache = null;
```

**Expected gain:** Eliminates ~2 reflows per mousemove event (~100-200/sec during fast drags). Especially relevant for large tables with many visible cells.

### 2.2 Throttle Mousemove Events

**Problem:** `onMouseMove` on each cell synchronously fires `setCursorRef()`. During a fast drag across many cells, 100+ events/sec can occur.

**Solution:** Use `requestAnimationFrame`-based throttling:

```typescript
let pendingUpdate: CursorUpdate | null = null;
let rafScheduled = false;

onMouseMove = (update) => {
  pendingUpdate = update;
  if (!rafScheduled) {
    rafScheduled = true;
    requestAnimationFrame(() => {
      if (pendingUpdate) setCursorRef(pendingUpdate);
      rafScheduled = false;
      pendingUpdate = null;
    });
  }
};
```

**Expected gain:** Reduces DOM updates to max 60/sec (one per frame). Visually no difference because the browser already renders at the display refresh rate.

### 2.3 Switch Row/Column Highlighting to an Overlay Approach

**Problem:** On every cursor movement, `classList` operations affect potentially many `<tr>` and `<th>` elements. Column selection across many columns or column dragging touches all affected header TH and all TR elements.

**Solution:** Use an additional overlay div (similar to the selection rectangle) for row and column highlighting instead of toggling classes on many elements:

```
Row highlight: a semi-transparent div spanning the full table width, height = row height
Column highlight: a semi-transparent div spanning the full table height, width = column width
```

**Advantage:** Only 2 DOM style updates instead of N classList operations (N = number of rows/columns).

**Disadvantage:** More complex for multi-column/multi-row selection; may require clip-path or similar for sticky areas. The current classList solution is already fast for most cases — this refactor is only worth it when measurable bottlenecks exist.

### 2.4 Isolate `editingCell` State

**Problem:** `editingCell` as React state in `useCursor.tsx` triggers re-renders that propagate through `RowTable` → `CustomRow` → `CustomCell`. Although `React.memo()` filters most updates, the shallow prop comparison itself costs time for 300+ rows.

**Solution A:** Keep `editingCell` as a ref instead of state and update only the affected cell via direct DOM updates. The editor can be injected into the cell using `createPortal`.

**Solution B:** Use a separate React context only for the editing cell, consumed only by `CustomCell` — with a `useMemo` check to determine if the cell is affected.

**Expected gain:** Eliminates the memo comparison across 300+ rows when entering/exiting edit mode.

### 2.5 CSS Containment

**Problem:** Any DOM change (classList, style) can potentially cause reflows across the whole page.

**Solution:** Apply the CSS `contain` property to cells and the viewport:

```css
.custom-table-viewport {
  contain: strict; /* Layout, Paint, Size isolation */
}

.cell {
  contain: content; /* Layout + Paint isolation */
}
```

**Expected gain:** The browser can confine reflow calculations to the container instead of recalculating the entire page. Especially beneficial for very large tables.

### 2.6 `will-change` for Selection Rectangles

**Solution:** Use GPU-accelerated compositing layers for frequently moved elements:

```text
.selection-rectangle,
.fill-rectangle {
  will-change: top, left, width, height;
}
```

**Expected gain:** The browser promotes these elements to their own compositing layers so changes in position/size do not repaint underlying cells.

**Caution:** Use sparingly — each layer consumes GPU memory.

### 2.7 Optimize Sticky-Column CSS Generation

**Problem:** `useStickColumnLeftsChecker.ts` generates a CSS string on every ResizeObserver callback and sets it as state. This triggers a React re-render.

**Solution:** Write the generated CSS text directly into a `<style>` element (as is already done in some places) without a React state update:

```typescript
styleElement.textContent = css; // Direct, without setState
```

### 2.8 Event Delegation Instead of Individual Handlers

**Problem:** Each cell has its own `onMouseDown`, `onMouseMove`, `onMouseUp`, `onClick`, `onDoubleClick` handlers. With 300 Rows x 10 Columns = 3000 event handler registrations.

**Solution:** Use event delegation at the `<table>` or `<tbody>` level:

```text
<tbody onMouseDown={(e) => {
  const td = (e.target as HTMLElement).closest('td');
  if (!td) return;
  const rowIdx = td.parentElement.rowIndex - 1;
  const colIdx = td.cellIndex;
  handleCellMouseDown(rowIdx, colIdx, e);
}}>
```

**Expected gain:**

- Less memory (1 handler instead of 3000)
- Faster initial rendering (fewer props on each `<td>`)
- No difference in event processing itself

---

## 3. Measurement and Benchmark Options

### 3.1 Chrome DevTools Performance Panel

Workflow:

1. Open the Performance tab and start recording
2. Perform a selection drag across many cells
3. Stop recording and analyze the flame chart

Metrics:

- **Scripting Time**: Time spent in JS (event handlers, DOM updates)
- **Rendering Time**: Time spent on style calculation and layout
- **Painting Time**: Time spent painting pixels
- **Frames**: How many frames are above/below 16.6ms (60 FPS target)

### 3.2 `performance.mark()` / `performance.measure()` API

Instrument the code directly:

```text
// In setCursorRef:
performance.mark('cursor-update-start');
directDomUpdateForCursor(oldCursor, newCursor /*, ...args */);
performance.mark('cursor-update-end');
performance.measure('cursor-update', 'cursor-update-start', 'cursor-update-end');
```

Results are visible via `performance.getEntriesByName('cursor-update')` or in the DevTools Performance panel.

### 3.3 Frame-Rate Monitoring

A lightweight FPS counter for live monitoring:

```typescript
let frameCount = 0;
let lastTime = performance.now();

function measureFPS() {
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    console.log(`FPS: ${frameCount}`);
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(measureFPS);
}
requestAnimationFrame(measureFPS);
```

### 3.4 React Profiler

```text
<React.Profiler id="CustomTable" onRender={(id, phase, actualDuration) => {
  console.log(`${id} ${phase}: ${actualDuration.toFixed(2)}ms`);
}}>
  <CustomTable ... />
</React.Profiler>
```

This shows exactly which components take how long to render and how often.

### 3.5 Lighthouse / Web Vitals (for initial load)

- **LCP** (Largest Contentful Paint): How quickly the table becomes visible
- **INP** (Interaction to Next Paint): How quickly the table responds to interaction
- **TBT** (Total Blocking Time): How long the main thread is blocked

```typescript
// Measure INP for specific interactions:
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log("INP candidate:", entry.duration, entry.name);
  }
}).observe({ type: "event", buffered: true });
```

### 3.6 Automated Benchmark with Playwright

```typescript
test("selection drag performance", async ({ page }) => {
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      const entries: number[] = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          entries.push(entry.duration);
        }
      });
      observer.observe({ type: "event", buffered: false });

      setTimeout(() => {
        observer.disconnect();
        const avg = entries.reduce((a, b) => a + b, 0) / entries.length;
        const p95 = entries.sort((a, b) => a - b)[Math.floor(entries.length * 0.95)];
        resolve({ avg, p95, count: entries.length });
      }, 3000);
    });
  });

  // During the 3 seconds: simulate a selection drag
  // ...

  expect(metrics.p95).toBeLessThan(100); // INP < 100ms = "good"
});
```

---

## 4. Prioritized Recommendation

| Prio | Measure                              | Effort | Expected Gain                          |
| ---- | ------------------------------------ | ------ | -------------------------------------- |
| 1    | CSS Containment (2.5)                | Low    | High for large tables                  |
| 2    | Mousemove RAF Throttling (2.2)       | Low    | Medium, reduces CPU load               |
| 3    | `will-change` for rectangles (2.6)   | Minimal| Medium, GPU compositing                |
| 4    | Event Delegation (2.8)               | Medium | High for many rows, less memory usage  |
| 5    | Cell Position Cache (2.1)            | Medium | High for fast drags                    |
| 6    | Isolate editingCell (2.4)            | Medium | Medium, fewer memo comparisons         |
| 7    | Row/Col Overlay (2.3)                | High   | Low (classList is already fast)        |

**Recommended first step:** Add CSS containment + performance instrumentation, then use real measurements to decide which further optimizations yield the largest effect.

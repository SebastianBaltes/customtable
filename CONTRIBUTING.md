# Contributing to react-griddbeditor

## Setup

```bash
git clone https://github.com/SebastianBaltes/react-grid-db-editor.git
cd react-griddbeditor
npm install
```

**Requirements:** Node.js >= 18, npm >= 9

## Dev Server

```bash
npm start
# Full demo:   http://localhost:5173/
# Simple demo: http://localhost:5173/simple.html
```

## Build Commands

| Command | Output | Description |
| --- | --- | --- |
| `npm run build` | `dist/` | Library build (TypeScript + CSS) |
| `npm run build-demo` | `docs/` | Demo site for GitHub Pages |
| `npm run build-release` | `release/` | Minified UMD + ESM bundles |
| `npx tsc --noEmit` | — | Type check only |

## Testing

```bash
npx playwright install   # First time only
npm run test:e2e         # Playwright E2E tests (Chromium + Firefox)
```

Tests live in `tests/customtable.spec.ts` and cover rendering, keyboard navigation, cell editing, filtering, sorting, copy/paste, context menu, column selection, and more.

## Project Structure

```
src/
  index.ts                    — Public API exports
  core/
    GridDbEditor.tsx             — Main component (~1200 lines): state, mutations, keyboard, undo/redo
    RowTable.tsx               — Renders <table> with <thead> and <tbody>
    ColHeader.tsx              — Column header: sort, filter, resize, column selection
    TableRow.tsx               — Row rendering (<tr>)
    TableCell.tsx              — Cell rendering (<td>) with editor dispatch
    directDomUpdateForCursor.tsx — Direct DOM manipulation for cursor/selection (no React re-renders)
    useCursor.tsx              — Cursor state management via refs
    useCursorKeys.tsx          — Keyboard event handling
    useContextMenu.tsx         — Context menu items and state
    useAsyncTableState.ts      — Hook for async backend integration
    InflightEditTracker.ts     — Per-cell inflight counter for optimistic updates
    Types.ts                   — All TypeScript interfaces and type definitions
    base.css                   — Structural layout styles (no colors)
  editors/                     — All built-in editor components (String, Number, Boolean, etc.)
  pagination/                  — Standalone Pagination component
  examples/                    — Demo apps, sample data, and 8 theme CSS files
tests/
  customtable.spec.ts          — Playwright E2E tests
```

## Architecture

### Data Flow

GridDbEditor is a controlled component. The parent owns the data:

1. Parent passes `rows` as a prop
2. User edits a cell -> GridDbEditor calls `onRowsChange(newRows)` with the complete new array
3. For targeted backend operations: `onUpdateRows`, `onCreateRows`, `onDeleteRows` with only the affected rows
4. Parent updates state -> GridDbEditor re-renders with new rows

### Cursor System

The cursor/selection system is the performance-critical path. It works via direct DOM manipulation:

- Arrow keys, mouse clicks, and drag operations update CSS classes directly on `<td>` and `<tr>` elements
- No React state updates or re-renders during navigation
- Selection/fill rectangles are positioned via `getBoundingClientRect` + inline styles
- State updates only trigger when entering/exiting edit mode

### Key Design Decisions

| Decision | Rationale |
| --- | --- |
| **Native `<table>`** | Browser handles column widths, text wrapping, sticky positioning. Screen-reader friendly. |
| **Direct DOM for cursor** | Arrow-key movement updates CSS classes — no React re-renders. |
| **Separate data and meta** | `rows` is business data; `cellMeta` is transient UI state. They change independently. |
| **Immutable row updates** | New array per mutation. Works with React reconciliation, enables undo snapshots. |
| **Optimistic + rollback** | Changes appear instantly. Backend rejection triggers rollback + shake animation. |

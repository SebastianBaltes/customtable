# Performance-Optimierungsbericht: CustomTable

## 1. Ist-Zustand: Architektur-Analyse

### Cursor/Selection: Direkte DOM-Manipulation (sehr effizient)

Die Cursor-Bewegung (Pfeiltasten, Tab, Mausklick, Drag) vermeidet React-Re-Renders komplett. `directDomUpdateForCursor.tsx` arbeitet ausschließlich mit:

- `classList.add()` / `classList.remove()` auf `<th>`, `<tr>`, `<td>` Elementen
- Direkte `style`-Property-Zuweisungen auf den Selection-Rectangle-Divs
- `getBoundingClientRect()` zur Positionsberechnung

**Einziger React-State-Trigger:** `setEditingCell()` in `useCursor.tsx` -- nur beim Wechsel in den Edit-Modus.

### Selection Rectangle: Overlay-Verfahren (effizient)

Zwei separate Rectangles (normal + sticky) werden synchron per DOM positioniert. Keine `requestAnimationFrame`-Nutzung bei der Positionierung selbst -- nur beim Auto-Scroll waehrend Drag.

### Row/Column Background-Shading

`.row-selected`, `.col-selected` werden per classList direkt auf DOM-Elemente gesetzt. **Kein React-Re-Render** dafuer noetig. Die CSS-Engine handled das Painting.

### React-Rendering

Alle Komponenten nutzen `React.memo()`: `CustomTable`, `RowTable`, `CustomRow`, `CustomCell`, `CustomColHeader`. Re-Renders werden nur bei Prop-Aenderungen ausgeloest.

---

## 2. Optimierungsmoeglichkeiten

### 2.1 `getBoundingClientRect()` bei jedem Mousemove reduzieren

**Problem:** Bei Selection-Drag ruft `forceUpdateCursorRect()` bei jedem `onMouseMove`-Event `getBoundingClientRect()` auf Start- und End-Zelle auf. Das erzwingt ein Browser-Layout-Reflow.

**Loesung:** Cell-Positionen cachen. Da Zellen waehrend eines Drags nicht ihre Groesse aendern, kann beim `mousedown` ein Positions-Grid einmalig berechnet und waehrend des Drags wiederverwendet werden.

```typescript
// Pseudo-Code
let cellPositionCache: Map<string, DOMRect> | null = null;

onMouseDown → cellPositionCache = buildPositionCache(table);
onMouseMove → lookup from cellPositionCache (kein Reflow)
onMouseUp → cellPositionCache = null;
```

**Erwarteter Gewinn:** Eliminiert ~2 Reflows pro Mousemove-Event (~100-200/Sek bei schnellem Drag). Besonders relevant bei grossen Tabellen mit vielen sichtbaren Zellen.

### 2.2 Mousemove-Events throttlen

**Problem:** `onMouseMove` auf jeder Zelle feuert `setCursorRef()` synchron. Bei schnellem Drag ueber viele Zellen koennen 100+ Events/Sek auftreten.

**Loesung:** `requestAnimationFrame`-basiertes Throttling:

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

**Erwarteter Gewinn:** Reduziert DOM-Updates auf max. 60/Sek (1 pro Frame). Visuell kein Unterschied, da der Browser ohnehin nur bei 60 FPS rendert.

### 2.3 Row/Column-Highlight auf Overlay-Verfahren umstellen

**Problem:** Bei jeder Cursor-Bewegung werden classList-Operationen auf potenziell vielen `<tr>`- und `<th>`-Elementen ausgefuehrt. Bei Column-Selection ueber viele Spalten hinweg oder bei Spalten-Drag werden alle betroffenen Header-TH und alle TR-Elemente angefasst.

**Loesung:** Statt classList auf einzelnen Elementen koennte ein zusaetzliches Overlay-Div (analog zum Selection-Rectangle) fuer Row- und Column-Highlighting verwendet werden:

```
Row-Highlight: Ein halbtransparentes Div mit voller Tabellenbreite, Hoehe = Zeilenhoehe
Col-Highlight: Ein halbtransparentes Div mit voller Tabellenhoehe, Breite = Spaltenbreite
```

**Vorteil:** Nur 2 DOM-Style-Updates statt N classList-Operationen (N = Anzahl Zeilen/Spalten).

**Nachteil:** Komplexer bei Multi-Column/Multi-Row-Selection, erfordert Clip-Path oder aehnliches fuer sticky Bereiche. Die aktuelle classList-Loesung ist bereits schnell genug fuer die meisten Faelle -- dieser Umbau lohnt sich nur bei messbaren Engpaessen.

### 2.4 `editingCell`-State isolieren

**Problem:** `editingCell` als React-State in `useCursor.tsx` loest Re-Renders aus, die sich durch `RowTable` → `CustomRow` → `CustomCell` propagieren. Zwar filtert `React.memo()` die meisten ab, aber der Vergleich selbst kostet bei 300+ Rows Zeit.

**Loesung A:** `editingCell` als Ref statt State fuehren und nur die betroffene Zelle per direktem DOM-Update aktualisieren. Der Editor koennte per `createPortal` in die Zelle injiziert werden.

**Loesung B:** Einen separaten React-Context nur fuer die editierende Zelle verwenden, den nur `CustomCell` konsumiert -- mit einem `useMemo`-Check, ob die eigene Adresse betroffen ist.

**Erwarteter Gewinn:** Eliminiert den memo-Vergleich auf allen 300+ Rows beim Wechsel in/aus dem Edit-Modus.

### 2.5 CSS Containment

**Problem:** Jede DOM-Aenderung (classList, style) kann potenziell Reflows in der gesamten Seite ausloesen.

**Loesung:** CSS `contain` Property auf Zellen und Viewport setzen:

```css
.custom-table-viewport {
  contain: strict; /* Layout, Paint, Size isolation */
}

.cell {
  contain: content; /* Layout + Paint isolation */
}
```

**Erwarteter Gewinn:** Browser kann Reflow-Berechnungen auf den Container beschraenken statt die gesamte Seite neu zu berechnen. Besonders relevant bei grossen Tabellen.

### 2.6 `will-change` fuer Selection-Rectangles

**Loesung:** GPU-beschleunigte Compositing-Layer fuer haeufig bewegte Elemente:

```css
.selection-rectangle,
.fill-rectangle {
  will-change: top, left, width, height;
}
```

**Erwarteter Gewinn:** Browser legt diese Elemente auf eigene Compositing-Layer, wodurch Aenderungen an Position/Groesse kein Repaint der darunterliegenden Zellen ausloesen.

**Achtung:** Sparsam einsetzen -- jeder Layer kostet GPU-Speicher.

### 2.7 Sticky-Column CSS-Generierung optimieren

**Problem:** `useStickColumnLeftsChecker.ts` generiert bei jedem ResizeObserver-Callback einen CSS-String und setzt ihn als State. Das erzeugt einen React-Re-Render.

**Loesung:** Den generierten CSS-Text direkt in ein `<style>`-Element schreiben (wie es teilweise schon gemacht wird), ohne den React-State-Update:

```typescript
styleElement.textContent = css; // Direkt, ohne setState
```

### 2.8 Event-Delegation statt Einzelner Handler

**Problem:** Jede Zelle hat eigene `onMouseDown`, `onMouseMove`, `onMouseUp`, `onClick`, `onDoubleClick` Handler. Bei 300 Rows x 10 Columns = 3000 Event-Handler-Registrierungen.

**Loesung:** Event-Delegation auf `<table>` oder `<tbody>` Ebene:

```typescript
<tbody onMouseDown={(e) => {
  const td = (e.target as HTMLElement).closest('td');
  if (!td) return;
  const rowIdx = td.parentElement.rowIndex - 1;
  const colIdx = td.cellIndex;
  handleCellMouseDown(rowIdx, colIdx, e);
}}>
```

**Erwarteter Gewinn:**

- Weniger Speicher (1 Handler statt 3000)
- Schnelleres initiales Rendering (weniger Props auf jedem `<td>`)
- Kein Unterschied bei der Event-Verarbeitung selbst

---

## 3. Mess- und Benchmark-Moeglichkeiten

### 3.1 Chrome DevTools Performance Panel

**Workflow:**

1. Performance-Tab oeffnen, Recording starten
2. Selection-Drag ueber viele Zellen ausfuehren
3. Recording stoppen, Flamechart analysieren

**Metriken:**

- **Scripting Time**: Wie viel Zeit in JS (Event-Handler, DOM-Updates)
- **Rendering Time**: Wie viel Zeit fuer Style-Berechnung + Layout
- **Painting Time**: Wie viel Zeit fuer Pixel-Ausgabe
- **Frames**: Wie viele Frames unter 16.6ms (60 FPS Ziel)

### 3.2 `performance.mark()` / `performance.measure()` API

Instrumentierung direkt im Code:

```typescript
// In setCursorRef:
performance.mark('cursor-update-start');
directDomUpdateForCursor(oldCursor, newCursor, ...);
performance.mark('cursor-update-end');
performance.measure('cursor-update', 'cursor-update-start', 'cursor-update-end');
```

Ergebnisse via `performance.getEntriesByName('cursor-update')` oder im DevTools Performance-Tab sichtbar.

### 3.3 Frame-Rate Monitoring

Eigener FPS-Counter fuer Live-Monitoring:

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

```tsx
<React.Profiler id="CustomTable" onRender={(id, phase, actualDuration) => {
  console.log(`${id} ${phase}: ${actualDuration.toFixed(2)}ms`);
}}>
  <CustomTable ... />
</React.Profiler>
```

Zeigt exakt, welche Komponenten wie lange zum Rendern brauchen und wie oft sie rendern.

### 3.5 Lighthouse / Web Vitals (fuer initiales Laden)

- **LCP** (Largest Contentful Paint): Wie schnell die Tabelle sichtbar wird
- **INP** (Interaction to Next Paint): Wie schnell die Tabelle auf Interaktion reagiert
- **TBT** (Total Blocking Time): Wie lange der Main Thread blockiert ist

```typescript
// INP messen fuer spezifische Interaktionen:
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log("INP candidate:", entry.duration, entry.name);
  }
}).observe({ type: "event", buffered: true });
```

### 3.6 Automatisierter Benchmark mit Playwright

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

  // Waehrend der 3 Sekunden: Selection-Drag simulieren
  // ...

  expect(metrics.p95).toBeLessThan(100); // INP < 100ms = "good"
});
```

---

## 4. Priorisierte Empfehlung

| Prio | Massnahme                           | Aufwand | Erwarteter Gewinn                      |
| ---- | ----------------------------------- | ------- | -------------------------------------- |
| 1    | CSS Containment (2.5)               | Gering  | Hoch bei grossen Tabellen              |
| 2    | Mousemove-RAF-Throttling (2.2)      | Gering  | Mittel, reduziert CPU-Last             |
| 3    | `will-change` fuer Rectangles (2.6) | Minimal | Mittel, GPU-Compositing                |
| 4    | Event-Delegation (2.8)              | Mittel  | Hoch bei vielen Rows, weniger Speicher |
| 5    | Cell-Position-Cache (2.1)           | Mittel  | Hoch bei schnellem Drag                |
| 6    | editingCell isolieren (2.4)         | Mittel  | Mittel, weniger memo-Vergleiche        |
| 7    | Row/Col-Overlay (2.3)               | Hoch    | Gering (classList ist bereits schnell) |

**Empfohlener erster Schritt:** CSS Containment + Performance-Instrumentierung einbauen, dann mit echten Messdaten entscheiden, welche weiteren Optimierungen den groessten Effekt haben.

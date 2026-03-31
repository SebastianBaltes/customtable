export const range = (start: number, end: number) =>
  Array.from({ length: Math.abs(end - start) + 1 }, (_, i) =>
    start < end ? start + i : start - i,
  );

export function arrayEquals<T>(a: Array<T>, b: Array<T>) {
  return !(a.length !== b.length || a.some((v, i) => a[i] != b[i]));
}

export function last(a: any): any {
  return a ? a[a.length - 1] : undefined;
}

/**
 * Resolve the effective text alignment for a column.
 * Number columns default to "right"; all others default to "left".
 */
export function columnAlign(column: { align?: string; type: string }): string {
  return column.align ?? (column.type === "Number" ? "right" : "left");
}

/** Whether a column type uses a dropdown indicator. */
export function isDropdownType(type: string): boolean {
  return type === "Combobox" || type === "MultiCombobox";
}

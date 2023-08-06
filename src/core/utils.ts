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

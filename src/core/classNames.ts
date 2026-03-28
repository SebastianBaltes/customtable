// Small utility to conditionally join class names (replacement for `classnames`)
export function classNames(...args: any[]): string {
  const classes: string[] = [];
  const add = (val: any) => {
    if (!val && val !== 0) return;
    const t = typeof val;
    if (t === "string" || t === "number") {
      classes.push(String(val));
    } else if (Array.isArray(val)) {
      val.forEach(add);
    } else if (t === "object") {
      for (const k in val) {
        if (Object.prototype.hasOwnProperty.call(val, k) && (val as any)[k]) {
          classes.push(k);
        }
      }
    }
  };
  args.forEach(add);
  return classes.join(" ");
}

export default classNames;


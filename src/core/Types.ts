import React, { JSX } from "react";
export type { TableTranslations } from "./TranslationsContext";

/**
 * Display format for numeric columns.
 *
 * The raw JS number is always stored as-is; this only affects the rendered display.
 * During editing the raw number is shown without any formatting or affixes.
 */
export interface NumberFormat {
  /**
   * Fixed number of decimal places shown.
   * undefined = auto (Intl default: significant digits, trailing zeros trimmed).
   */
  decimalPlaces?: number;
  /**
   * Whether to show a thousands-group separator.
   * Default: true (matches spreadsheet convention).
   */
  thousandsSeparator?: boolean;
  /**
   * BCP 47 locale tag (e.g. "de-DE", "en-US") that controls the decimal
   * and grouping separator characters.
   * Default: browser locale (navigator.language).
   */
  locale?: string;
  /**
   * Static non-editable prefix rendered before the number, e.g. "$ " or "€ ".
   */
  prefix?: string;
  /**
   * Static non-editable suffix rendered after the number, e.g. " %" or " km/h".
   */
  suffix?: string;
}

/**
 * Display format for Date columns.
 * Internal value is always an ISO date string (YYYY-MM-DD).
 */
export interface DateFormat {
  /** BCP 47 locale (default: navigator.language). */
  locale?: string;
  /** Shorthand date style. */
  dateStyle?: "full" | "long" | "medium" | "short";
  /** Full Intl.DateTimeFormatOptions override (takes precedence over dateStyle). */
  options?: Intl.DateTimeFormatOptions;
}

/**
 * Display format for DateTime columns.
 * Internal value is always an ISO datetime string (YYYY-MM-DDTHH:mm[:ss]).
 */
export interface DateTimeFormat {
  /** BCP 47 locale (default: navigator.language). */
  locale?: string;
  /** Shorthand date style. Default: "short". */
  dateStyle?: "full" | "long" | "medium" | "short";
  /** Shorthand time style. Default: "short". */
  timeStyle?: "full" | "long" | "medium" | "short";
  /** Full Intl.DateTimeFormatOptions override. */
  options?: Intl.DateTimeFormatOptions;
}

/**
 * Display format for Time columns.
 * Internal value is always HH:mm or HH:mm:ss.
 */
export interface TimeFormat {
  /** BCP 47 locale (default: navigator.language). */
  locale?: string;
  /** Whether to display seconds. Default: false. */
  showSeconds?: boolean;
  /** Override Intl hour cycle (h12, h23, h24). */
  hourCycle?: "h11" | "h12" | "h23" | "h24";
}

/**
 * Display format for Duration columns.
 * Internal value is ISO 8601 duration (e.g. "PT2H30M") or short form ("2h 30m").
 */
export interface DurationFormat {
  /** Display style: "short" => "2h 30m", "long" => "2 hours 30 minutes", "iso" => "PT2H30M". Default: "short". */
  style?: "short" | "long" | "iso";
}

/**
 * Interface for column configuration.
 */
export interface ColumnConfig<T> {
  /**
   * The name of the column.
   */
  name: string;

  /**
   * Label for the field. If not provided, `name` is used.
   */
  label?: string;

  /**
   * The type of the column.
   */
  type: string;

  /**
   * Whether the field is read-only or not.
   */
  readOnly?: boolean;

  /**
   * Whether the field is required or not.
   */
  required?: boolean;

  /**
   * A function to invoke custom rendering / editing for the cell
   */
  editor?: Editor<any>;

  /**
   * Options for the select field. Can be a static array or a function
   * that receives the current row and returns options dynamically
   * (e.g. for dependent dropdowns like Country → City).
   */
  selectOptions?: string[] | ((row: Row) => string[]);

  /**
   * The condition under which the field gets enabled.
   */
  enabledIf?: (row: Row) => boolean;

  /**
   * Function for validating the field.
   */
  validate?: (value: any) => boolean | ValidationResult;

  /**
   * Whether the field is multi-select or not.
   */
  multiselect?: boolean;

  /**
   * Whether the user may type custom values not appearing in selectOptions.
   * Applies to Combobox and MultiCombobox types.
   * Default: true
   */
  freeText?: boolean;

  /**
   * Tooltip text shown as HTML title attribute on the column header.
   */
  headerTitle?: string;

  /**
   * Number display format. Only meaningful for type "Number".
   */
  numberFormat?: NumberFormat;

  /**
   * Date display format. Only meaningful for type "Date".
   */
  dateFormat?: DateFormat;

  /**
   * DateTime display format. Only meaningful for type "DateTime".
   */
  dateTimeFormat?: DateTimeFormat;

  /**
   * Time display format. Only meaningful for type "Time".
   */
  timeFormat?: TimeFormat;

  /**
   * Duration display format. Only meaningful for type "Duration".
   */
  durationFormat?: DurationFormat;

  /**
   * Explicit text alignment for the cell and its header.
   * Number columns default to "right"; all others default to "left".
   */
  align?: "left" | "right" | "center";

  /**
   * Whether to show a filter input in the column header.
   * Default: true. Set to false to hide the filter entirely.
   */
  filterable?: boolean;

  /**
   * Custom filter UI component rendered in the column header instead of the
   * built-in text input (or Boolean select).
   * Receives the current string filter value and an onChange callback.
   */
  filterEditor?: FilterEditor;

  /**
   * Title template for the dialog editor.
   * Supports `${columnName}` placeholders that are replaced with row values.
   * Example: `"${firstName} ${lastName}: Description"`
   */
  dialogTitle?: string;

  /**
   * Allow text to wrap in this column.
   * Default: false (white-space: nowrap).
   * Set to true for long-text columns like descriptions.
   */
  wrap?: boolean;

  /**
   * Additional CSS class name(s) applied to both the column header (`<th>`)
   * and every data cell (`<td>`) in this column.
   */
  className?: string;

  /**
   * When true, this column's values are owned by the backend.
   * During optimistic merge, backend values always overwrite local values
   * for server-owned columns, regardless of inflight edit counters.
   * Typical examples: auto-generated IDs, timestamps, computed fields.
   * Default: false (user-owned — local edits are preserved during merge).
   */
  serverOwned?: boolean;

  /**
   * Input mask pattern for text fields. Use `#` for any digit, `A` for any letter,
   * `*` for any character. All other characters are literal separators inserted automatically.
   * Examples: "+## ### #######" (phone), "##.##.####" (date), "###.###.###.###" (IP address),
   * "AA## #### #### #### #### ##" (IBAN).
   */
  inputMask?: string;

}

export type FilterEditorParams = {
  /** Current filter value (string). */
  value: string;
  /** Called to update the filter value. */
  onChange: (value: string) => void;
  /** The column being filtered. */
  column: ColumnConfig<any>;
};

export type FilterEditor = (params: FilterEditorParams) => JSX.Element;

/**
 * Result returned by `ColumnConfig.validate()` when more detail than a simple
 * boolean is needed.
 *
 * The `severity` controls the CSS class applied to the cell:
 * - `"error"`   → adds `cell-error`   (indicates invalid data that must be corrected)
 * - `"warning"` → adds `cell-warning` (indicates data that may need attention)
 *
 * The `message` is shown as the cell's tooltip (`title` attribute) so the user
 * can see what is wrong on hover.
 *
 * When `validate` returns `false` instead of a `ValidationResult`, the cell
 * receives the `cell-error` class without a tooltip message.
 *
 * @example
 * ```ts
 * validate: (value) => {
 *   if (value == null || value === "") return { message: "Field is required", severity: "error" };
 *   if (value.length < 3) return { message: "Too short", severity: "warning" };
 *   return true;
 * }
 * ```
 */
export interface ValidationResult {
  /** Human-readable message shown as a tooltip on the cell. */
  message: string;
  /** Controls the visual severity: `"error"` or `"warning"`. */
  severity: "warning" | "error";
}

export type Row = Record<string, any>;

export type EditorParams<T> = {
  value: T;
  row: Record<string, T>;
  editing: boolean;
  columnConfig: ColumnConfig<T>;
  onChange: (value: T) => void;
  onRequestClose?: () => void;
  textEllipsisLength?: number;
  initialEditValue: string | null;
  readOnly?: boolean;
  onEnterEditMode?: () => void;
};

export type Editor<T> = (params: EditorParams<T>) => JSX.Element;

export type CellAddr = {
  colIdx: number;
  rowIdx: number;
};

export type Cursor = {
  selectionStart: CellAddr;
  selectionEnd: CellAddr;
  fillEnd: CellAddr;
  editing: boolean;
  initialEditValue: string | null;
  filling: boolean;
  colSelection: boolean;
};

/**
 * A single sort criterion. Multi-sort is represented as an array of these.
 */
export interface SortCriterion {
  column: string;
  direction: "asc" | "desc";
}

/**
 * Sort configuration: an array of sort criteria (multi-sort).
 * The first entry is the primary sort, subsequent entries are tie-breakers.
 * An empty array or null means unsorted.
 */
export type SortConfig = SortCriterion[] | null;

/**
 * Meta information for a single cell (style, disabled, title).
 */
export interface CellMeta {
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  title?: string;
}

/**
 * Meta information for a row (style, className, title, readOnly).
 */
export interface RowMeta {
  style?: React.CSSProperties;
  className?: string;
  title?: string;
  /** When true, all cells in this row are non-editable. */
  readOnly?: boolean;
}

/**
 * Meta map keyed by row-key.
 */
export type CellMetaMap = Record<
  string,
  {
    row?: RowMeta;
    cells?: Record<string, CellMeta>;
  }
>;

export type FilterState = Record<string, string>;

/**
 * Status indicator shown in the toolbar area.
 *
 * Severity controls the visual style:
 * - `"ok"`      — green checkmark, confirms a successful operation
 * - `"info"`    — neutral, informational (e.g. "loading", "saving")
 * - `"warning"` — yellow warning icon
 * - `"error"`   — red alert icon, indicates a failed operation
 */
export interface TableStatus {
  /** Human-readable status text. */
  text: string;
  /** Visual severity level. */
  severity: "ok" | "info" | "warning" | "error";
}

export type ContextMenuItem =
  | Partial<{
      onClick: () => void;
      label: string;
      shortcut: string;
      disabled: boolean;
    }>
  | "---";

/**
 * Snapshot of the table's current state, passed to custom context-menu item
 * handlers at the moment the user clicks the item.
 */
export interface TableContextState {
  /** Display-index range of the current selection (filtered/sorted view). */
  selectionRange: { startRow: number; endRow: number; startCol: number; endCol: number };
  /** The rows inside the selection (display order). */
  selectedRows: Row[];
  /** All rows currently visible (after filtering and sorting). */
  displayRows: Row[];
  /** All original rows (unfiltered, unsorted). */
  rows: Row[];
  /** Column configuration. */
  columns: ColumnConfig<any>[];
  /** Cell / row meta map, if provided. */
  cellMeta?: CellMetaMap;
}

/**
 * Information about the current cell selection range,
 * passed to the `onSelectionChange` callback.
 */
export interface SelectionInfo {
  /** Normalized selection range (start <= end). */
  range: { startRow: number; endRow: number; startCol: number; endCol: number };
  /** Whether any cells are selected (false when cursor is at -1,-1). */
  hasSelection: boolean;
}

/**
 * A custom entry for the context menu.
 * `onClick` receives the table state at the moment the item is clicked.
 * Use `"---"` for a visual separator.
 */
/**
 * Callback fired when a column is resized via drag handle.
 * @param columnName - The name of the resized column.
 * @param width - The new width in pixels.
 */
export type OnColumnResize = (columnName: string, width: number) => void;

export type CustomContextMenuItem =
  | {
      label: string;
      shortcut?: string;
      onClick: (state: TableContextState) => void;
    }
  | "---";

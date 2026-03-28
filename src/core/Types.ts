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
   * List of options for the select field.
   */
  selectOptions?: string[];

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
   * Comment or description for the field.
   */
  comment?: string;

  /**
   * Number display format. Only meaningful for type "Number".
   */
  numberFormat?: NumberFormat;

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

export interface ValidationResult {
  message: string;
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

export type SortConfig = {
  column: string;
  direction: "asc" | "desc";
} | null;

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
export type CellMetaMap = Record<string, {
  row?: RowMeta;
  cells?: Record<string, CellMeta>;
}>;

export type FilterState = Record<string, string>;

export type ContextMenuItem =
  | Partial<{
      onClick: () => void;
      label: string;
      shortcut: string;
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
 * A custom entry for the context menu.
 * `onClick` receives the table state at the moment the item is clicked.
 * Use `"---"` for a visual separator.
 */
export type CustomContextMenuItem =
  | {
      label: string;
      shortcut?: string;
      onClick: (state: TableContextState) => void;
    }
  | "---";

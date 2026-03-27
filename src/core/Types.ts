import React, { JSX } from "react";

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
   * Comment or description for the field.
   */
  comment?: string;
}

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
 * Meta information for a row (style, className, title).
 */
export interface RowMeta {
  style?: React.CSSProperties;
  className?: string;
  title?: string;
}

/**
 * Meta map keyed by row-key, then column-name.
 * The special key "__row" on the inner record applies RowMeta to the whole <tr>.
 */
export interface CellMetaMap {
  [rowKey: string]: {
    __row?: RowMeta;
    [columnName: string]: CellMeta | RowMeta | undefined;
  };
}

export type FilterState = Record<string, string>;

export type ContextMenuItem =
  | Partial<{
      onClick: () => void;
      label: string;
      shortcut: string;
    }>
  | "---";

import React from "react";

/**
 * All user-visible strings emitted by TableCraft and its built-in editors.
 * Pass a `Partial<TableTranslations>` via the `translations` prop to override
 * any subset of strings.
 */
export interface TableTranslations {
  /** Toolbar button that creates new rows. */
  "Create Rows": string;
  /** Placeholder shown in the single-select combobox input. */
  "Enter or select...": string;
  /** Placeholder shown in the multi-select combobox input. */
  "Filter or add value...": string;
  /** Fallback label when no option is selected and freeText is off. */
  "-- select --": string;
  /** Hint shown in the option list when the filter has no matches (single-select). */
  "Press Enter to save": string;
  /** Hint shown in the option list when the filter has no matches (multi-select). */
  "Press Enter to add": string;
  /** Context-menu item label. */
  "Insert row above": string;
  /** Context-menu item label. */
  "Insert row below": string;
  /** Context-menu item label. */
  "Remove rows": string;
  /** Context-menu item label. */
  "Copy content": string;
  /** Context-menu item label. */
  "Paste content": string;
  /** Context-menu item label. */
  "Delete content": string;
  /** Context-menu item label. */
  "Search & Replace": string;
  /** Context-menu item label. */
  Undo: string;
  /** Context-menu item label. */
  Redo: string;
  /** Context-menu item label. */
  "Filter by value": string;
  /** Context-menu item label. */
  "Clear filter": string;
  /** Boolean column filter option: truthy rows. */
  Yes: string;
  /** Boolean column filter option: falsy rows. */
  No: string;
}

export const DEFAULT_TRANSLATIONS: TableTranslations = {
  "Create Rows": "Create Rows",
  "Enter or select...": "Enter or select...",
  "Filter or add value...": "Filter or add value...",
  "-- select --": "-- select --",
  "Press Enter to save": "Press Enter to save",
  "Press Enter to add": "Press Enter to add",
  "Insert row above": "Insert row above",
  "Insert row below": "Insert row below",
  "Remove rows": "Remove rows",
  "Copy content": "Copy content",
  "Paste content": "Paste content",
  "Delete content": "Delete content",
  "Search & Replace": "Search & Replace",
  Undo: "Undo",
  Redo: "Redo",
  "Filter by value": "Filter by value",
  "Clear filter": "Clear filter",
  Yes: "Yes",
  No: "No",
};

export const TranslationsContext = React.createContext<TableTranslations>(DEFAULT_TRANSLATIONS);

export function resolveTranslations(t?: Partial<TableTranslations>): TableTranslations {
  if (!t) return DEFAULT_TRANSLATIONS;
  return { ...DEFAULT_TRANSLATIONS, ...t };
}

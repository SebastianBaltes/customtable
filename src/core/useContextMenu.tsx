import React, { useState } from "react";
import { ContextMenuItem, CustomContextMenuItem, TableContextState } from "./Types";
import { TableTranslations } from "./TranslationsContext";

export interface UseContextMenuOptions {
  copySelection: () => Promise<void>;
  pasteAtCursor: () => Promise<void>;
  deleteSelection: () => void;
  handleDeleteRows: () => void;
  handleInsertRowAbove: () => void;
  handleInsertRowBelow: () => void;
  extraItems: CustomContextMenuItem[];
  contextStateRef: React.MutableRefObject<() => TableContextState>;
  t: TableTranslations;
  enableSearchReplace?: boolean;
  onSearchReplace?: () => void;
  hasRows: () => boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  filterByValue: () => void;
  clearFilter: () => void;
  hasActiveFilter: () => boolean;
}

export function useContextMenu({
  copySelection,
  pasteAtCursor,
  deleteSelection,
  handleDeleteRows,
  handleInsertRowAbove,
  handleInsertRowBelow,
  extraItems,
  contextStateRef,
  t,
  enableSearchReplace,
  onSearchReplace,
  hasRows,
  handleUndo,
  handleRedo,
  canUndo,
  canRedo,
  filterByValue,
  clearFilter,
  hasActiveFilter,
}: UseContextMenuOptions) {
  const [contextMenu, setContextMenu] = useState({ visible: false, position: { x: 0, y: 0 } });

  const openContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setContextMenu({ visible: true, position: { x: event.clientX, y: event.clientY } });
  };

  const closeContextMenu = () => {
    setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  };

  const noRows = contextMenu.visible && !hasRows();
  const noUndo = contextMenu.visible && !canUndo();
  const noRedo = contextMenu.visible && !canRedo();
  const activeFilter = contextMenu.visible && hasActiveFilter();

  const builtInItems: ContextMenuItem[] = [
    { label: t.Undo, shortcut: "Ctrl + Z", onClick: handleUndo, disabled: noUndo },
    { label: t.Redo, shortcut: "Ctrl + Y", onClick: handleRedo, disabled: noRedo },
    "---",
    { label: t["Insert row above"], onClick: handleInsertRowAbove },
    { label: t["Insert row below"], onClick: handleInsertRowBelow },
    { label: t["Remove rows"], onClick: handleDeleteRows, disabled: noRows },
    "---",
    {
      label: t["Copy content"],
      shortcut: "Ctrl + C",
      onClick: () => { copySelection(); },
      disabled: noRows,
    },
    {
      label: t["Paste content"],
      shortcut: "Ctrl + V",
      onClick: () => { pasteAtCursor(); },
    },
    { label: t["Delete content"], shortcut: "Delete", onClick: deleteSelection, disabled: noRows },
    "---",
    { label: t["Filter by value"], onClick: filterByValue, disabled: noRows },
    { label: t["Clear filter"], onClick: clearFilter, disabled: !activeFilter },
    ...(enableSearchReplace && onSearchReplace
      ? ["---" as const, { label: t["Search & Replace"], shortcut: "Ctrl + H", onClick: onSearchReplace }]
      : []),
  ];

  const mappedExtraItems: ContextMenuItem[] = extraItems.map((item) => {
    if (item === "---") return "---";
    return {
      label: item.label,
      shortcut: item.shortcut,
      onClick: () => item.onClick(contextStateRef.current()),
    };
  });

  const contextMenuItems: ContextMenuItem[] =
    extraItems.length > 0 ? [...builtInItems, "---", ...mappedExtraItems] : builtInItems;

  return { contextMenu, openContextMenu, closeContextMenu, contextMenuItems };
}

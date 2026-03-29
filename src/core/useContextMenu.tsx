import React, { useState } from "react";
import { ContextMenuItem, Cursor, CustomContextMenuItem, TableContextState } from "./Types";
import { TableTranslations } from "./TranslationsContext";

export function useContextMenu(
  cursorRef: React.MutableRefObject<Cursor>,
  copySelection: () => Promise<void>,
  pasteAtCursor: () => Promise<void>,
  deleteSelection: () => void,
  handleDeleteRows: () => void,
  handleInsertRowAbove: () => void,
  handleInsertRowBelow: () => void,
  extraItems: CustomContextMenuItem[],
  contextStateRef: React.MutableRefObject<() => TableContextState>,
  t: TableTranslations,
) {
  const [contextMenu, setContextMenu] = useState({ visible: false, position: { x: 0, y: 0 } });
  const openContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setContextMenu({ visible: true, position: { x: event.clientX, y: event.clientY } });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, position: { x: 0, y: 0 } });
  };

  const builtInItems: ContextMenuItem[] = [
    {
      label: t["Insert row above"],
      onClick: handleInsertRowAbove,
    },
    {
      label: t["Insert row below"],
      onClick: handleInsertRowBelow,
    },
    {
      label: t["Remove rows"],
      onClick: handleDeleteRows,
    },
    "---",
    {
      label: t["Copy content"],
      shortcut: "Ctrl + C",
      onClick: () => {
        copySelection();
      },
    },
    {
      label: t["Paste content"],
      shortcut: "Ctrl + V",
      onClick: () => {
        pasteAtCursor();
      },
    },
    {
      label: t["Delete content"],
      shortcut: "Delete",
      onClick: deleteSelection,
    },
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

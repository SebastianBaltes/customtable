import React, { useState } from "react";
import { ContextMenuItem, Cursor } from "./Types";

export function useContextMenu(
  cursorRef: React.MutableRefObject<Cursor>,
  copySelection: () => Promise<void>,
  pasteAtCursor: () => Promise<void>,
  deleteSelection: () => void,
  handleDeleteRows: () => void,
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
  const contextMenuItems: ContextMenuItem[] = [
    {
      label: "insert row above",
      onClick: () => {},
    },
    {
      label: "insert row below",
      onClick: () => {},
    },
    {
      label: "remove rows",
      onClick: handleDeleteRows,
    },
    "---",
    {
      label: "copy content",
      shortcut: "Ctrl + C",
      onClick: () => { copySelection(); },
    },
    {
      label: "paste content",
      shortcut: "Ctrl + V",
      onClick: () => { pasteAtCursor(); },
    },
    {
      label: "delete content",
      shortcut: "Delete",
      onClick: deleteSelection,
    },
  ];
  return { contextMenu, openContextMenu, closeContextMenu, contextMenuItems };
}

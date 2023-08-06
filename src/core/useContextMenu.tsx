import React, { useState } from "react";
import { ContextMenuItem } from "./Types";

export function useContextMenu() {
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
      onClick: () => {},
    },
    "---",
    {
      label: "copy content",
      shortcut: "Ctrl + C",
      onClick: () => {},
    },
    {
      label: "paste content",
      onClick: () => {},
    },
    {
      label: "delete content",
      onClick: () => {},
    },
  ];
  return { contextMenu, openContextMenu, closeContextMenu, contextMenuItems };
}

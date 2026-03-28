import { ContextMenuItem } from "./Types";
import ReactDOM from "react-dom";
import React, { useEffect, useRef } from "react";
import { usePositionInsideViewport } from "./usePositionInsideViewport";

export const ContextMenu = ({
  position,
  items,
  hideMenu,
}: {
  position: { x: number; y: number };
  items: ContextMenuItem[];
  hideMenu: () => void;
}) => {
  const { menuRef, visibility, top, left } = usePositionInsideViewport(position.x, position.y);

  // Close on any mousedown outside the menu (left- or right-click).
  // Using a ref so the effect never needs to re-register.
  const hideMenuRef = useRef(hideMenu);
  hideMenuRef.current = hideMenu;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideMenuRef.current();
      }
    };
    // 'capture: true' so we see the event before React's synthetic handlers
    document.addEventListener("mousedown", handler, { capture: true });
    return () => document.removeEventListener("mousedown", handler, { capture: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return ReactDOM.createPortal(
    <div className="custom-table" style={{ display: "contents" }}>
      <div ref={menuRef} className="context-menu" style={{ top, left, visibility }}>
        {items.map((item, index) =>
          item === "---" ? (
            <hr key={index} />
          ) : (
            <div
              key={index}
              onMouseDown={(e) => e.stopPropagation()} // prevent outside-click handler from firing
              onClick={() => {
                hideMenu();
                item.onClick?.();
              }}
              className="context-menu-item"
            >
              <span className="context-menu-label">{item.label}</span>
              <span className="context-menu-shortcut">{item.shortcut}</span>
            </div>
          ),
        )}
      </div>
    </div>,
    document.body,
  );
};

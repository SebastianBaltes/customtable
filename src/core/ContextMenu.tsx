import { ContextMenuItem } from "./Types";
import ReactDOM from "react-dom";
import React from "react";
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

  return ReactDOM.createPortal(
    <>
      <div onClick={hideMenu} className="context-menu-modal-background"></div>
      <div ref={menuRef} className="context-menu" style={{ top, left, visibility }}>
        {items.map((item, index) =>
          item === "---" ? (
            <hr key={index} />
          ) : (
            <div
              key={index}
              onClick={(event) => {
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
    </>,
    document.body,
  );
};

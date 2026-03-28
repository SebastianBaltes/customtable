import React from "react";
import { Editor } from "../core/Types";

export const BooleanEditor: Editor<boolean> = ({ value, row, editing, columnConfig, onChange, initialEditValue }) => (
  <input
    type="checkbox"
    checked={!!value}
    onChange={() => onChange(!value)}
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => {
      // Tab and Enter must bubble to the table's keyboard handler.
      // All other keys are swallowed so they don't accidentally trigger table navigation.
      if (e.key === "Tab" || e.key === "Enter" || e.key === "Escape") return;
      e.stopPropagation();
    }}
    // Remove from browser's tab order – the table's own keyboard navigation controls focus.
    tabIndex={-1}
  />
);

import React from "react";
import { Editor } from "../core/Types";

export const BooleanEditor: Editor<boolean> = ({ value, row, editing, columnConfig, onChange }) => (
  <input
    type="checkbox"
    checked={!!value}
    onChange={() => onChange(!value)}
    onClick={(e) => e.stopPropagation()}
  />
);

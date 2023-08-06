import React from "react";
import { ColumnConfig, Editor } from "../core/Types";

export const BooleanEditor: Editor<boolean> = ({ value, row, editing, columnConfig }) => (
  <input type="checkbox" checked={value} disabled />
);

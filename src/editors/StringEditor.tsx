import React from "react";
import { Editor } from "../core/Types";

export const StringEditor: Editor<string> = ({ value, row, editing, columnConfig }) => (
  <span>{value}</span>
);

import React from "react";
import { Editor } from "../core/Types";

export const NumberEditor: Editor<number> = ({ value, row, editing, columnConfig }) => (
  <span>{value}</span>
);

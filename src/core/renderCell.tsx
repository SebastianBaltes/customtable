import { ColumnConfig, EditorParams } from "./Types";
import { JSX } from "react";
import { editorMap } from "./EditorMap";
import { StringEditor } from "../editors/StringEditor";

export const renderCell = (
  value: any,
  row: Record<string, any>,
  editing: boolean,
  columnConfig: ColumnConfig<any>,
  onChange: (value: any) => void,
  textEllipsisLength?: number,
  initialEditValue: string | null = null,
  onRequestClose?: () => void,
): JSX.Element => {
  const editor = columnConfig.editor ?? editorMap.get(columnConfig.type) ?? StringEditor;
  return editor({
    value,
    row,
    editing,
    columnConfig,
    onChange,
    onRequestClose,
    textEllipsisLength,
    initialEditValue,
  });
};

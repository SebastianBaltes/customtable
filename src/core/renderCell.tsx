import { ColumnConfig, Editor, EditorParams } from "./Types";
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
  const editor: Editor<any> =
    columnConfig.editor ?? editorMap.get(columnConfig.type) ?? StringEditor;
  const params: EditorParams<any> = { value, row, editing, columnConfig, onChange, onRequestClose, textEllipsisLength, initialEditValue };
  const result: JSX.Element = editor(params);
  return result;
};

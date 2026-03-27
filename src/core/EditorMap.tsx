import { BooleanEditor } from "../editors/BooleanEditor";
import { StringEditor } from "../editors/StringEditor";
import { NumberEditor } from "../editors/NumberEditor";
import { ComboboxEditor } from "../editors/ComboboxEditor";
import { MultiComboboxEditor } from "../editors/MultiComboboxEditor";
import { Editor } from "./Types";

const editorMap = new Map<string, Editor<any>>();

editorMap.set("String", StringEditor);
editorMap.set("Number", NumberEditor);
editorMap.set("Boolean", BooleanEditor);
editorMap.set("Combobox", ComboboxEditor);
editorMap.set("MultiCombobox", MultiComboboxEditor);

export { editorMap };

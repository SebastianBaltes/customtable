import { BooleanEditor } from "../editors/BooleanEditor";
import { StringEditor } from "../editors/StringEditor";
import { NumberEditor } from "../editors/NumberEditor";
import { Editor } from "./Types";

const editorMap = new Map<string, Editor<any>>();

editorMap.set("String", StringEditor);
editorMap.set("Number", NumberEditor);
editorMap.set("Boolean", BooleanEditor);

export { editorMap };

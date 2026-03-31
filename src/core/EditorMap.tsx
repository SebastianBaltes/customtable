import { BooleanEditor } from "../editors/BooleanEditor";
import { StringEditor } from "../editors/StringEditor";
import { NumberEditor } from "../editors/NumberEditor";
import { ComboboxEditor } from "../editors/ComboboxEditor";
import { MultiComboboxEditor } from "../editors/MultiComboboxEditor";
import { DateEditor } from "../editors/DateEditor";
import { DateTimeEditor } from "../editors/DateTimeEditor";
import { TimeEditor } from "../editors/TimeEditor";
import { DurationEditor } from "../editors/DurationEditor";
import { ColorEditor } from "../editors/ColorEditor";
import { Editor } from "./Types";

const editorMap = new Map<string, Editor<any>>();

editorMap.set("String", StringEditor);
editorMap.set("Number", NumberEditor);
editorMap.set("Boolean", BooleanEditor);
editorMap.set("Combobox", ComboboxEditor);
editorMap.set("MultiCombobox", MultiComboboxEditor);
editorMap.set("Date", DateEditor);
editorMap.set("DateTime", DateTimeEditor);
editorMap.set("Time", TimeEditor);
editorMap.set("Duration", DurationEditor);
editorMap.set("Color", ColorEditor);

export { editorMap };

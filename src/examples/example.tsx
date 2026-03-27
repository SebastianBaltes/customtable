import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { CellMetaMap, ColumnConfig, CustomTable, Row } from "../index";

// Define some sample data
const initialColumns: ColumnConfig<any>[] = [
  {
    name: "id",
    type: "Number",
    readOnly: true,
  },
  {
    name: "Key",
    type: "String",
    required: true,
  },
  {
    name: "Torpfostenart",
    type: "Combobox",
    selectOptions: ["Schloss", "Aufhängung"],
  },
  {
    name: "Active",
    type: "Boolean",
  },
  {
    name: "Tags",
    type: "MultiCombobox",
    selectOptions: ["Tag1", "Tag2", "Tag3", "Tag4"],
  },
];
for (let i = 0; i < 20; i++) {
  initialColumns.push({
    name: "dummy" + i,
    type: "String",
  });
}

const initialRows: Record<string, any>[] = [];
for (let i = 0; i < 300; i++) {
  const row: Record<string, any> = {};
  initialColumns.forEach((c) => {
    if (c.type === "Boolean") {
      row[c.name] = i % 2 === 0;
    } else if (c.type === "MultiCombobox") {
      row[c.name] = [];
    } else {
      row[c.name] = "dummy";
    }
  });
  row.id = "" + i;
  initialRows.push(row);
}

// Example: cellMeta with error-style for row "3" / column "Key", and a disabled cell
const exampleCellMeta: CellMetaMap = {
  "3": {
    Key: {
      style: { backgroundColor: "#fdd" },
      title: "Validation error: Key must not be 'dummy'",
      className: "cell-error",
    },
  },
  "5": {
    __row: {
      style: { backgroundColor: "#eee" },
      title: "This row is read-only",
    },
    Key: { disabled: true, title: "Disabled cell" },
    Torpfostenart: { disabled: true },
  },
};

const App = () => {
  const [rows, setRows] = useState(initialRows);

  return (
    <CustomTable
      rows={rows}
      columns={initialColumns}
      numberOfStickyColums={2}
      onRowsChange={setRows}
      rowKey={(_row: Row, idx: number) => "" + idx}
      cellMeta={exampleCellMeta}
      onUpdateRows={(updatedRows) => {
        console.log("onUpdateRows:", updatedRows);
      }}
      onCreateRows={(newRows) => {
        console.log("onCreateRows:", newRows);
      }}
      onDeleteRows={(deletedRows) => {
        console.log("onDeleteRows:", deletedRows);
      }}
    />
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

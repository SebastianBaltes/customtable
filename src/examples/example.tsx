import React from "react";
import * as ReactDOM from "react-dom";
import { ColumnConfig, CustomTable } from "../index";

// Define some sample data
const columns: ColumnConfig<any>[] = [
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
    type: "String",
    selectOptions: ["Schloss", "Aufhängung"],
  },
];
for (let i = 0; i < 30; i++) {
  columns.push({
    name: "dummy" + i,
    type: "String",
  });
}

const rows = [];
for (let i = 0; i < 300; i++) {
  const row: Record<string, any> = {};
  columns.forEach((c) => {
    row[c.name] = "dummy";
  });
  row.id = "" + i;
  rows.push(row);
}

ReactDOM.render(
  <CustomTable rows={rows} columns={columns} numberOfStickyColums={2} />,
  document.getElementById("root"),
);

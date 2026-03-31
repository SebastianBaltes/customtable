/**
 * Simple CustomTable Example
 *
 * Demonstrates the minimal setup: rows, columns, basic editing.
 * No async backend, no pagination, no column manager, no themes.
 */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ColumnConfig, CustomTable, Row } from "../index";

// --- Column definitions ---
const columns: ColumnConfig<any>[] = [
  { name: "id", type: "Number", label: "ID", readOnly: true },
  { name: "firstName", type: "String", label: "First Name", required: true },
  { name: "lastName", type: "String", label: "Last Name", required: true },
  { name: "email", type: "String", label: "Email" },
  {
    name: "department",
    type: "Combobox",
    label: "Department",
    selectOptions: ["HR", "IT", "Sales", "Marketing", "Finance"],
  },
  { name: "isActive", type: "Boolean", label: "Active" },
  {
    name: "salary",
    type: "Number",
    label: "Salary",
    numberFormat: { decimalPlaces: 2, suffix: " €" },
  },
  {
    name: "hireDate",
    type: "Date",
    label: "Hire Date",
    dateFormat: { dateStyle: "medium" },
  },
  { name: "phone", type: "String", label: "Phone", inputMask: "+## ### ########" },
  { name: "color", type: "Color", label: "Color" },
];

// --- Sample data ---
const sampleData: Row[] = [
  { id: 1, firstName: "Alice", lastName: "Schmidt", email: "alice@example.com", department: "IT", isActive: true, salary: 65000, hireDate: "2021-03-15", phone: "+49 123 45678901", color: "#3b82f6" },
  { id: 2, firstName: "Bob", lastName: "Mueller", email: "bob@example.com", department: "Sales", isActive: true, salary: 55000, hireDate: "2020-07-01", phone: "+49 234 56789012", color: "#ef4444" },
  { id: 3, firstName: "Clara", lastName: "Fischer", email: "clara@example.com", department: "HR", isActive: false, salary: 60000, hireDate: "2019-11-20", phone: "+49 345 67890123", color: "#10b981" },
  { id: 4, firstName: "David", lastName: "Weber", email: "david@example.com", department: "Finance", isActive: true, salary: 72000, hireDate: "2022-01-10", phone: "+49 456 78901234", color: "#f59e0b" },
  { id: 5, firstName: "Eva", lastName: "Klein", email: "eva@example.com", department: "Marketing", isActive: true, salary: 48000, hireDate: "2023-06-01", phone: "+49 567 89012345", color: "#8b5cf6" },
];

// --- App ---
const SimpleApp = () => {
  const [rows, setRows] = useState(sampleData);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <h2 style={{ margin: "12px 16px 0" }}>CustomTable — Simple Example</h2>
      <p style={{ margin: "4px 16px 12px", color: "#666", fontSize: "0.9rem" }}>
        Minimal setup: editable cells, keyboard navigation, sort, filter, undo/redo.
      </p>
      <div style={{ flex: 1, position: "relative" }}>
        <CustomTable
          rows={rows}
          columns={columns}
          onRowsChange={setRows}
          caption="Employees"
        />
      </div>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<SimpleApp />);

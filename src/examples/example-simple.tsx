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

// --- Sample data (50 rows) ---
const sampleData: Row[] = [
  { id: 1, firstName: "Alice", lastName: "Schmidt", email: "alice.schmidt@example.com", department: "IT", isActive: true, salary: 65200, hireDate: "2021-03-15", phone: "+49 151 10000001", color: "#3b82f6" },
  { id: 2, firstName: "Bob", lastName: "Mueller", email: "bob.mueller@example.com", department: "Sales", isActive: true, salary: 55250, hireDate: "2020-07-01", phone: "+49 151 10000002", color: "#ef4444" },
  { id: 3, firstName: "Clara", lastName: "Fischer", email: "clara.fischer@example.com", department: "HR", isActive: false, salary: 60100, hireDate: "2019-11-20", phone: "+49 151 10000003", color: "#10b981" },
  { id: 4, firstName: "David", lastName: "Weber", email: "david.weber@example.com", department: "Finance", isActive: true, salary: 72150, hireDate: "2022-01-10", phone: "+49 151 10000004", color: "#f59e0b" },
  { id: 5, firstName: "Eva", lastName: "Klein", email: "eva.klein@example.com", department: "Marketing", isActive: true, salary: 48200, hireDate: "2023-06-01", phone: "+49 151 10000005", color: "#8b5cf6" },
  { id: 6, firstName: "Frank", lastName: "Bauer", email: "frank.bauer@example.com", department: "IT", isActive: false, salary: 49000, hireDate: "2018-09-12", phone: "+49 151 10000006", color: "#06b6d4" },
  { id: 7, firstName: "Gina", lastName: "Neumann", email: "gina.neumann@example.com", department: "Sales", isActive: true, salary: 53000, hireDate: "2017-04-22", phone: "+49 151 10000007", color: "#f97316" },
  { id: 8, firstName: "Hans", lastName: "Keller", email: "hans.keller@example.com", department: "HR", isActive: true, salary: 47000, hireDate: "2016-02-05", phone: "+49 151 10000008", color: "#a78bfa" },
  { id: 9, firstName: "Ingrid", lastName: "Richter", email: "ingrid.richter@example.com", department: "Finance", isActive: false, salary: 68500, hireDate: "2015-12-11", phone: "+49 151 10000009", color: "#ef9a9a" },
  { id: 10, firstName: "Jens", lastName: "Schulz", email: "jens.schulz@example.com", department: "Marketing", isActive: true, salary: 51000, hireDate: "2019-05-30", phone: "+49 151 10000010", color: "#34d399" },
  { id: 11, firstName: "Karin", lastName: "Wolf", email: "karin.wolf@example.com", department: "IT", isActive: true, salary: 72000, hireDate: "2020-10-14", phone: "+49 151 10000011", color: "#60a5fa" },
  { id: 12, firstName: "Lukas", lastName: "Frank", email: "lukas.frank@example.com", department: "Sales", isActive: false, salary: 58000, hireDate: "2018-06-18", phone: "+49 151 10000012", color: "#f472b6" },
  { id: 13, firstName: "Michael", lastName: "Becker", email: "michael.becker@example.com", department: "HR", isActive: true, salary: 46500, hireDate: "2021-08-09", phone: "+49 151 10000013", color: "#f59e0b" },
  { id: 14, firstName: "Nina", lastName: "Hoffmann", email: "nina.hoffmann@example.com", department: "Finance", isActive: true, salary: 79500, hireDate: "2016-11-21", phone: "+49 151 10000014", color: "#60a5fa" },
  { id: 15, firstName: "Olaf", lastName: "Krause", email: "olaf.krause@example.com", department: "Marketing", isActive: false, salary: 43500, hireDate: "2017-07-07", phone: "+49 151 10000015", color: "#f97316" },
  { id: 16, firstName: "Petra", lastName: "Lang", email: "petra.lang@example.com", department: "IT", isActive: true, salary: 61200, hireDate: "2022-03-03", phone: "+49 151 10000016", color: "#34d399" },
  { id: 17, firstName: "Quentin", lastName: "Maier", email: "quentin.maier@example.com", department: "Sales", isActive: true, salary: 55800, hireDate: "2019-09-01", phone: "+49 151 10000017", color: "#8b5cf6" },
  { id: 18, firstName: "Rita", lastName: "Neubauer", email: "rita.neubauer@example.com", department: "HR", isActive: false, salary: 49500, hireDate: "2015-01-25", phone: "+49 151 10000018", color: "#10b981" },
  { id: 19, firstName: "Stefan", lastName: "Berg", email: "stefan.berg@example.com", department: "Finance", isActive: true, salary: 73500, hireDate: "2020-02-17", phone: "+49 151 10000019", color: "#3b82f6" },
  { id: 20, firstName: "Tina", lastName: "Schwarz", email: "tina.schwarz@example.com", department: "Marketing", isActive: true, salary: 46800, hireDate: "2023-04-12", phone: "+49 151 10000020", color: "#ef4444" },
  { id: 21, firstName: "Uwe", lastName: "Graf", email: "uwe.graf@example.com", department: "IT", isActive: false, salary: 49900, hireDate: "2018-08-30", phone: "+49 151 10000021", color: "#06b6d4" },
  { id: 22, firstName: "Vera", lastName: "Zimmer", email: "vera.zimmer@example.com", department: "Sales", isActive: true, salary: 52900, hireDate: "2017-03-19", phone: "+49 151 10000022", color: "#a78bfa" },
  { id: 23, firstName: "Walter", lastName: "Kuhn", email: "walter.kuhn@example.com", department: "HR", isActive: false, salary: 45500, hireDate: "2016-12-05", phone: "+49 151 10000023", color: "#ef9a9a" },
  { id: 24, firstName: "Xenia", lastName: "Paul", email: "xenia.paul@example.com", department: "Finance", isActive: true, salary: 81200, hireDate: "2019-01-29", phone: "+49 151 10000024", color: "#34d399" },
  { id: 25, firstName: "Yvonne", lastName: "Koch", email: "yvonne.koch@example.com", department: "Marketing", isActive: true, salary: 47100, hireDate: "2021-06-06", phone: "+49 151 10000025", color: "#f59e0b" },
  { id: 26, firstName: "Zach", lastName: "Reinhardt", email: "zach.reinhardt@example.com", department: "IT", isActive: false, salary: 58500, hireDate: "2015-05-17", phone: "+49 151 10000026", color: "#8b5cf6" },
  { id: 27, firstName: "Anna", lastName: "Voigt", email: "anna.voigt@example.com", department: "Sales", isActive: true, salary: 50750, hireDate: "2020-11-11", phone: "+49 151 10000027", color: "#60a5fa" },
  { id: 28, firstName: "Bastian", lastName: "Ott", email: "bastian.ott@example.com", department: "HR", isActive: true, salary: 43900, hireDate: "2018-01-08", phone: "+49 151 10000028", color: "#f472b6" },
  { id: 29, firstName: "Carina", lastName: "Hein", email: "carina.hein@example.com", department: "Finance", isActive: false, salary: 69800, hireDate: "2016-10-02", phone: "+49 151 10000029", color: "#3b82f6" },
  { id: 30, firstName: "Dirk", lastName: "Mayer", email: "dirk.mayer@example.com", department: "Marketing", isActive: true, salary: 45250, hireDate: "2019-03-27", phone: "+49 151 10000030", color: "#ef4444" },
  { id: 31, firstName: "Elke", lastName: "Foerster", email: "elke.foerster@example.com", department: "IT", isActive: true, salary: 59900, hireDate: "2022-05-05", phone: "+49 151 10000031", color: "#10b981" },
  { id: 32, firstName: "Florian", lastName: "Arnold", email: "florian.arnold@example.com", department: "Sales", isActive: false, salary: 54000, hireDate: "2017-09-09", phone: "+49 151 10000032", color: "#f97316" },
  { id: 33, firstName: "Greta", lastName: "Lorenz", email: "greta.lorenz@example.com", department: "HR", isActive: true, salary: 47800, hireDate: "2015-07-23", phone: "+49 151 10000033", color: "#a78bfa" },
  { id: 34, firstName: "Helmut", lastName: "Boehm", email: "helmut.boehm@example.com", department: "Finance", isActive: true, salary: 76500, hireDate: "2016-04-16", phone: "+49 151 10000034", color: "#34d399" },
  { id: 35, firstName: "Isabell", lastName: "Pohl", email: "isabell.pohl@example.com", department: "Marketing", isActive: false, salary: 44200, hireDate: "2018-11-03", phone: "+49 151 10000035", color: "#f59e0b" },
  { id: 36, firstName: "Jonas", lastName: "Brandt", email: "jonas.brandt@example.com", department: "IT", isActive: true, salary: 61000, hireDate: "2021-12-19", phone: "+49 151 10000036", color: "#8b5cf6" },
  { id: 37, firstName: "Katharina", lastName: "Schmitt", email: "katharina.schmitt@example.com", department: "Sales", isActive: true, salary: 52500, hireDate: "2019-02-28", phone: "+49 151 10000037", color: "#60a5fa" },
  { id: 38, firstName: "Leon", lastName: "Seidel", email: "leon.seidel@example.com", department: "HR", isActive: false, salary: 47150, hireDate: "2017-06-14", phone: "+49 151 10000038", color: "#f472b6" },
  { id: 39, firstName: "Monika", lastName: "Engel", email: "monika.engel@example.com", department: "Finance", isActive: true, salary: 70200, hireDate: "2015-10-20", phone: "+49 151 10000039", color: "#3b82f6" },
  { id: 40, firstName: "Norbert", lastName: "Kleinert", email: "norbert.kleinert@example.com", department: "Marketing", isActive: true, salary: 45900, hireDate: "2020-08-08", phone: "+49 151 10000040", color: "#ef4444" },
  { id: 41, firstName: "Oliver", lastName: "Seifert", email: "oliver.seifert@example.com", department: "IT", isActive: false, salary: 59300, hireDate: "2016-03-02", phone: "+49 151 10000041", color: "#10b981" },
  { id: 42, firstName: "Pauline", lastName: "Reuter", email: "pauline.reuter@example.com", department: "Sales", isActive: true, salary: 53600, hireDate: "2018-05-12", phone: "+49 151 10000042", color: "#a78bfa" },
  { id: 43, firstName: "Ralf", lastName: "Horn", email: "ralf.horn@example.com", department: "HR", isActive: false, salary: 44800, hireDate: "2017-01-01", phone: "+49 151 10000043", color: "#f59e0b" },
  { id: 44, firstName: "Sabine", lastName: "Dietz", email: "sabine.dietz@example.com", department: "Finance", isActive: true, salary: 77900, hireDate: "2019-11-15", phone: "+49 151 10000044", color: "#34d399" },
  { id: 45, firstName: "Thomas", lastName: "Neis", email: "thomas.neis@example.com", department: "Marketing", isActive: true, salary: 46300, hireDate: "2022-07-07", phone: "+49 151 10000045", color: "#f97316" },
  { id: 46, firstName: "Ursula", lastName: "Wagner", email: "ursula.wagner@example.com", department: "IT", isActive: false, salary: 50800, hireDate: "2015-09-29", phone: "+49 151 10000046", color: "#ef9a9a" },
  { id: 47, firstName: "Viktor", lastName: "Boeck", email: "viktor.boeck@example.com", department: "Sales", isActive: true, salary: 54700, hireDate: "2020-12-24", phone: "+49 151 10000047", color: "#60a5fa" },
  { id: 48, firstName: "Waltraud", lastName: "Hornung", email: "waltraud.hornung@example.com", department: "HR", isActive: false, salary: 44100, hireDate: "2016-06-06", phone: "+49 151 10000048", color: "#f472b6" },
  { id: 49, firstName: "Xaver", lastName: "Goll", email: "xaver.goll@example.com", department: "Finance", isActive: true, salary: 73450, hireDate: "2018-02-02", phone: "+49 151 10000049", color: "#8b5cf6" },
  { id: 50, firstName: "Yara", lastName: "Kosch", email: "yara.kosch@example.com", department: "Marketing", isActive: true, salary: 47500, hireDate: "2021-01-18", phone: "+49 151 10000050", color: "#3b82f6" },
];

// --- App ---
const SimpleApp = () => {
  const [rows, setRows] = useState(sampleData);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "12px", margin: "12px 16px 0" }}>
        <h2 style={{ margin: 0 }}>CustomTable — Simple Example</h2>
        <a
          href="https://github.com/SebastianBaltes/customtable/blob/master/src/examples/example-simple.tsx"
          target="_blank"
          rel="noopener noreferrer"
          className="view-source-link"
        >
          &lt;/&gt; View Source
        </a>
      </div>
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

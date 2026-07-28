// Script for generating example data and writing to src/examples/example-data.json
const fs = require("fs");

const firstNames = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Eva",
  "Frank",
  "Grace",
  "Hannah",
  "Ian",
  "Julia",
];
const lastNames = [
  "Müller",
  "Schmidt",
  "Schneider",
  "Fischer",
  "Weber",
  "Meyer",
  "Wagner",
  "Becker",
];
const loremWords =
  "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est.".split(
    " ",
  );

// Additional choice values
const departments = ["HR", "IT", "Sales", "Marketing", "Finance", "Legal"];
const skillsPool = ["React", "TypeScript", "Python", "Java", "SQL", "AWS", "Docker", "Figma"];
const offices = ["Berlin HQ", "Munich Office", "Remote", "Hamburg Office", "Cologne Office"];
const statuses = ["Active", "On Leave", "Terminated", "Probation"];
const contractTypes = ["Permanent", "Temporary", "Contractor", "Intern"];
const countries = ["Germany", "USA", "UK", "France", "Spain", "Netherlands"];
const checkInTimes = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00"];
const shiftDurations = ["PT8H", "PT7H30M", "PT6H", "PT4H", "PT8H30M", "PT9H", "PT5H45M"];
const brandColors = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#a78bfa",
];
const roles = [
  "Software Engineer",
  "Product Manager",
  "Designer",
  "QA Engineer",
  "DevOps Engineer",
  "Data Analyst",
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSubset(arr, maxItems) {
  const subsetSize = Math.floor(Math.random() * (maxItems + 1));
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, subsetSize);
}

function maybeEmpty(value, probability = 0.2) {
  return Math.random() < probability ? "" : value;
}

function generateRandomKey(minLength, maxLength) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateLoremText(maxLength) {
  if (Math.random() < 0.3) return "";
  const targetLength = Math.floor(Math.random() * maxLength);
  let result = "";
  while (result.length < targetLength) {
    result += getRandomItem(loremWords) + " ";
  }
  return result.substring(0, targetLength).trim();
}

function randomDateBetween(startYear = 1990, endYear = 2024) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  const d = new Date(start + Math.random() * (end - start));
  return d.toISOString();
}

function formatPhone() {
  // Simple German phone numbers or international
  if (Math.random() < 0.5) {
    return "+49" + Math.floor(100000000 + Math.random() * 900000000);
  }
  return "+1" + Math.floor(1000000000 + Math.random() * 9000000000);
}

function generateEmployeeNumber(idx) {
  return `EMP${String(idx).padStart(5, "0")}`;
}

function generateDemoData(count) {
  const rows = [];

  for (let i = 1; i <= count; i++) {
    const fName = getRandomItem(firstNames);
    const lName = getRandomItem(lastNames);
    const managerName = getRandomItem(firstNames) + " " + getRandomItem(lastNames);

    // The very first row is the "showcase" row and is guaranteed complete: every
    // field is populated. The e2e specs use row index 0 as their anchor, so a
    // random hole there would make whole test groups fail depending on the RNG.
    const complete = i === 1;
    const mE = (value, probability) => (complete ? value : maybeEmpty(value, probability));
    const description = complete
      ? loremWords.slice(0, 24).join(" ")
      : generateLoremText(1000);

    const row = {
      id: i,
      complexKey: mE(generateRandomKey(10, 50), 0.1), // 10% empty
      description,
      firstName: mE(fName, 0.05),
      lastName: mE(lName, 0.05),
      email: mE(`${fName.toLowerCase()}.${lName.toLowerCase()}@example.com`, 0.1),
      department: mE(getRandomItem(departments), 0.15),
      skills: complete ? skillsPool.slice(0, 3) : getRandomSubset(skillsPool, 4),
      isActive: complete ? true : Math.random() > 0.15,
      salary: mE(Math.floor(Math.random() * 60000) + 40000, 0.15),

      // additional (realistic) fields up to 30 fields
      hireDate: mE(randomDateBetween(2005, 2024).split("T")[0], 0.1),
      manager: mE(managerName, 0.2),
      officeLocation: mE(getRandomItem(offices), 0.2),
      phone: mE(formatPhone(), 0.25),
      employeeNumber: generateEmployeeNumber(i),
      status: mE(getRandomItem(statuses), 0.05),
      role: mE(getRandomItem(roles), 0.1),
      team: mE(
        getRandomItem(["Platform", "Growth", "Tools", "Core", "Mobile", "Web"]),
        0.2,
      ),
      lastLogin: mE(randomDateBetween(2020, 2024), 0.4),
      performanceScore: mE((Math.random() * 5).toFixed(2), 0.25),
      bonus: mE(Math.floor(Math.random() * 15000), 0.4),
      contractType: mE(getRandomItem(contractTypes), 0.15),
      country: mE(getRandomItem(countries), 0.05),
      city: mE(
        getRandomItem(["Berlin", "Munich", "Hamburg", "Cologne", "Stuttgart", "Frankfurt"]),
        0.2,
      ),
      postalCode: mE(String(Math.floor(10000 + Math.random() * 89999)), 0.2),
      address: mE(`${Math.floor(Math.random() * 200)} Example Street`, 0.3),
      linkedin: mE(
        `https://www.linkedin.com/in/example-user-${String(i).padStart(3, "0")}`,
        0.7,
      ),
      github: mE(`https://github.com/example-user-${String(i).padStart(3, "0")}`, 0.8),
      dateOfBirth: mE(randomDateBetween(1965, 2000).split("T")[0], 0.4),
      emergencyContact: mE(
        `${getRandomItem(firstNames)} ${getRandomItem(lastNames)} (${formatPhone()})`,
        0.6,
      ),
      // Time / Duration / Color demo columns — these must stay in sync with the
      // column definitions in src/examples/example.tsx, otherwise the demo (and
      // the e2e specs for those editors) see permanently empty cells.
      checkInTime: mE(getRandomItem(checkInTimes), 0.1),
      shiftDuration: mE(getRandomItem(shiftDurations), 0.1),
      brandColor: mE(getRandomItem(brandColors), 0.1),
    };

    // ensure we have exactly 30 fields (incl. id) — already planned above
    rows.push(row);
  }

  return rows;
}

// Generate 300 records
const initialRows = generateDemoData(300);
const outPath = "src/examples/example-data.json";
fs.writeFileSync(outPath, JSON.stringify(initialRows, null, 2), "utf8");
console.log(`Wrote ${initialRows.length} rows to ${outPath}`);

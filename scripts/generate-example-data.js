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

/*
 * Seeded PRNG (mulberry32) instead of rand(), so that two runs of this
 * script produce byte-identical output and a regeneration shows an empty diff
 * as long as the schema is unchanged.
 *
 * Note on history: src/examples/example-data.json predates this seed — it was
 * generated with rand() and later patched in place. So the file in the
 * repo is *not* the output of this script, and the first regeneration will
 * produce a large one-time diff. That is deliberate; the seed is meant to hold
 * from here on, not retroactively. Regenerating is a conscious act: it rerolls
 * all 300 rows, so it wants an e2e run afterwards. Row 1 stays the complete
 * "showcase" row either way (see `complete` below), which is what the specs
 * anchor on.
 */
const SEED = 0x5eed1234;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);

function getRandomItem(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function getRandomSubset(arr, maxItems) {
  const subsetSize = Math.floor(rand() * (maxItems + 1));
  return [...arr].sort(() => 0.5 - rand()).slice(0, subsetSize);
}

function maybeEmpty(value, probability = 0.2) {
  return rand() < probability ? "" : value;
}

function generateRandomKey(minLength, maxLength) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const length = Math.floor(rand() * (maxLength - minLength + 1)) + minLength;
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(rand() * chars.length));
  }
  return result;
}

function generateLoremText(maxLength) {
  if (rand() < 0.3) return "";
  const targetLength = Math.floor(rand() * maxLength);
  let result = "";
  while (result.length < targetLength) {
    result += getRandomItem(loremWords) + " ";
  }
  return result.substring(0, targetLength).trim();
}

function randomDateBetween(startYear = 1990, endYear = 2024) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  const d = new Date(start + rand() * (end - start));
  return d.toISOString();
}

function formatPhone() {
  // Simple German phone numbers or international
  if (rand() < 0.5) {
    return "+49" + Math.floor(100000000 + rand() * 900000000);
  }
  return "+1" + Math.floor(1000000000 + rand() * 9000000000);
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
      isActive: complete ? true : rand() > 0.15,
      salary: mE(Math.floor(rand() * 60000) + 40000, 0.15),

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
      performanceScore: mE((rand() * 5).toFixed(2), 0.25),
      bonus: mE(Math.floor(rand() * 15000), 0.4),
      contractType: mE(getRandomItem(contractTypes), 0.15),
      country: mE(getRandomItem(countries), 0.05),
      city: mE(
        getRandomItem(["Berlin", "Munich", "Hamburg", "Cologne", "Stuttgart", "Frankfurt"]),
        0.2,
      ),
      postalCode: mE(String(Math.floor(10000 + rand() * 89999)), 0.2),
      address: mE(`${Math.floor(rand() * 200)} Example Street`, 0.3),
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

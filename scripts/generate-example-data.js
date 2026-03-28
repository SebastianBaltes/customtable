// Script for generating example data and writing to src/examples/example-data.json
const fs = require('fs');

const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Eva", "Frank", "Grace", "Hannah", "Ian", "Julia"];
const lastNames = ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker"];
const loremWords = "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est.".split(" ");

// Additional choice values
const departments = ["HR", "IT", "Sales", "Marketing", "Finance", "Legal"];
const skillsPool = ["React", "TypeScript", "Python", "Java", "SQL", "AWS", "Docker", "Figma"];
const offices = ["Berlin HQ", "Munich Office", "Remote", "Hamburg Office", "Cologne Office"];
const statuses = ["Active", "On Leave", "Terminated", "Probation"];
const contractTypes = ["Permanent", "Temporary", "Contractor", "Intern"];
const countries = ["Germany", "USA", "UK", "France", "Spain", "Netherlands"];
const roles = ["Software Engineer", "Product Manager", "Designer", "QA Engineer", "DevOps Engineer", "Data Analyst"];

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
    return "+49" + (Math.floor(100000000 + Math.random() * 900000000));
  }
  return "+1" + (Math.floor(1000000000 + Math.random() * 9000000000));
}

function generateEmployeeNumber(idx) {
  return `EMP${String(idx).padStart(5, '0')}`;
}

function generateDemoData(count) {
  const rows = [];

  for (let i = 1; i <= count; i++) {
    const fName = getRandomItem(firstNames);
    const lName = getRandomItem(lastNames);
    const managerName = getRandomItem(firstNames) + ' ' + getRandomItem(lastNames);

    const row = {
      id: i,
      complexKey: maybeEmpty(generateRandomKey(10, 50), 0.1), // 10% empty
      description: generateLoremText(1000),
      firstName: maybeEmpty(fName, 0.05),
      lastName: maybeEmpty(lName, 0.05),
      email: maybeEmpty(`${fName.toLowerCase()}.${lName.toLowerCase()}@example.com`, 0.1),
      department: maybeEmpty(getRandomItem(departments), 0.15),
      skills: getRandomSubset(skillsPool, 4),
      isActive: Math.random() > 0.15,
      salary: maybeEmpty(Math.floor(Math.random() * 60000) + 40000, 0.15),

      // additional (realistic) fields up to 30 fields
      hireDate: maybeEmpty(randomDateBetween(2005, 2024).split('T')[0], 0.1),
      manager: maybeEmpty(managerName, 0.2),
      officeLocation: maybeEmpty(getRandomItem(offices), 0.2),
      phone: maybeEmpty(formatPhone(), 0.25),
      employeeNumber: generateEmployeeNumber(i),
      status: maybeEmpty(getRandomItem(statuses), 0.05),
      role: maybeEmpty(getRandomItem(roles), 0.1),
      team: maybeEmpty(getRandomItem(['Platform', 'Growth', 'Tools', 'Core', 'Mobile', 'Web']), 0.2),
      lastLogin: maybeEmpty(randomDateBetween(2020, 2024), 0.4),
      performanceScore: maybeEmpty((Math.random() * 5).toFixed(2), 0.25),
      bonus: maybeEmpty(Math.floor(Math.random() * 15000), 0.4),
      contractType: maybeEmpty(getRandomItem(contractTypes), 0.15),
      country: maybeEmpty(getRandomItem(countries), 0.05),
      city: maybeEmpty(getRandomItem(['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Stuttgart', 'Frankfurt']), 0.2),
      postalCode: maybeEmpty(String(Math.floor(10000 + Math.random() * 89999)), 0.2),
      address: maybeEmpty(`${Math.floor(Math.random() * 200)} Example Street` , 0.3),
      linkedin: maybeEmpty(`https://www.linkedin.com/in/${fName.toLowerCase()}${lName.toLowerCase()}`, 0.7),
      github: maybeEmpty(`https://github.com/${fName.toLowerCase()}${lName.toLowerCase()}`, 0.8),
      dateOfBirth: maybeEmpty(randomDateBetween(1965, 2000).split('T')[0], 0.4),
      emergencyContact: maybeEmpty(`${getRandomItem(firstNames)} ${getRandomItem(lastNames)} (${formatPhone()})`, 0.6),
    };

    // ensure we have exactly 30 fields (incl. id) — already planned above
    rows.push(row);
  }

  return rows;
}

// Generate 300 records
const initialRows = generateDemoData(300);
const outPath = 'src/examples/example-data.json';
fs.writeFileSync(outPath, JSON.stringify(initialRows, null, 2), 'utf8');
console.log(`Wrote ${initialRows.length} rows to ${outPath}`);


module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  // Only run unit tests in src/ to avoid running e2e/playwright tests under tests/
  testMatch: ["<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)"],
};

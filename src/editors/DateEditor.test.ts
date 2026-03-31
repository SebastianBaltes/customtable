import { describe, test, expect } from "@jest/globals";
import { formatDate, parseDateInput } from "./DateEditor";

describe("formatDate", () => {
  test("formats ISO date with default options", () => {
    const result = formatDate("2024-03-15");
    expect(result).toBeTruthy();
    expect(result).not.toBe("");
  });

  test("returns empty string for null/undefined", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });

  test("returns raw string for invalid date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  test("respects dateStyle option", () => {
    const short = formatDate("2024-03-15", { dateStyle: "short" });
    const long = formatDate("2024-03-15", { dateStyle: "long" });
    expect(short).toBeTruthy();
    expect(long).toBeTruthy();
    // Long format is typically longer than short
    expect(long.length).toBeGreaterThanOrEqual(short.length);
  });
});

describe("parseDateInput", () => {
  test("passes through ISO date unchanged", () => {
    expect(parseDateInput("2024-03-15")).toBe("2024-03-15");
  });

  test("returns empty for empty input", () => {
    expect(parseDateInput("")).toBe("");
    expect(parseDateInput("  ")).toBe("");
  });

  test("parses EU format DD.MM.YYYY", () => {
    expect(parseDateInput("15.03.2024")).toBe("2024-03-15");
  });

  test("parses EU format DD/MM/YYYY", () => {
    expect(parseDateInput("15/03/2024")).toBe("2024-03-15");
  });

  test("preserves free text on unknown format", () => {
    expect(parseDateInput("next Tuesday")).toBe("next Tuesday");
  });
});

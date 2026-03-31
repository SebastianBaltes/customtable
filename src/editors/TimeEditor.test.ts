import { describe, test, expect } from "@jest/globals";
import { formatTime, parseTimeInput } from "./TimeEditor";

describe("formatTime", () => {
  test("formats HH:mm", () => {
    const result = formatTime("14:30");
    expect(result).toBeTruthy();
    expect(result).not.toBe("");
  });

  test("formats HH:mm:ss with showSeconds", () => {
    const result = formatTime("14:30:45", { showSeconds: true });
    expect(result).toContain("45");
  });

  test("returns empty for null/undefined", () => {
    expect(formatTime(null)).toBe("");
    expect(formatTime(undefined)).toBe("");
  });

  test("returns raw string for invalid time", () => {
    expect(formatTime("invalid")).toBe("invalid");
  });
});

describe("parseTimeInput", () => {
  test("passes through HH:mm unchanged", () => {
    expect(parseTimeInput("14:30")).toBe("14:30");
  });

  test("passes through HH:mm:ss unchanged", () => {
    expect(parseTimeInput("14:30:45")).toBe("14:30:45");
  });

  test("parses 12h format with PM", () => {
    expect(parseTimeInput("2:30 PM")).toBe("14:30");
  });

  test("parses 12h format with am", () => {
    expect(parseTimeInput("9:15am")).toBe("09:15");
  });

  test("handles 12:00 PM", () => {
    expect(parseTimeInput("12:00 PM")).toBe("12:00");
  });

  test("handles 12:00 AM", () => {
    expect(parseTimeInput("12:00 AM")).toBe("00:00");
  });

  test("preserves free text on unknown format", () => {
    expect(parseTimeInput("afternoon")).toBe("afternoon");
  });
});

import { describe, test, expect } from "@jest/globals";
import { parseDuration, formatDuration, normalizeDuration } from "./DurationEditor";

describe("parseDuration", () => {
  test("parses ISO 8601 durations", () => {
    expect(parseDuration("PT2H30M")).toEqual({ hours: 2, minutes: 30, seconds: 0 });
    expect(parseDuration("PT45M")).toEqual({ hours: 0, minutes: 45, seconds: 0 });
    expect(parseDuration("PT1H")).toEqual({ hours: 1, minutes: 0, seconds: 0 });
    expect(parseDuration("PT0S")).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    expect(parseDuration("PT1H30M15S")).toEqual({ hours: 1, minutes: 30, seconds: 15 });
  });

  test("parses short form", () => {
    expect(parseDuration("2h 30m")).toEqual({ hours: 2, minutes: 30, seconds: 0 });
    expect(parseDuration("2h30m")).toEqual({ hours: 2, minutes: 30, seconds: 0 });
    expect(parseDuration("45m")).toEqual({ hours: 0, minutes: 45, seconds: 0 });
    expect(parseDuration("2h")).toEqual({ hours: 2, minutes: 0, seconds: 0 });
    expect(parseDuration("30s")).toEqual({ hours: 0, minutes: 0, seconds: 30 });
  });

  test("parses colon form", () => {
    expect(parseDuration("2:30")).toEqual({ hours: 2, minutes: 30, seconds: 0 });
    expect(parseDuration("0:45")).toEqual({ hours: 0, minutes: 45, seconds: 0 });
    expect(parseDuration("1:30:15")).toEqual({ hours: 1, minutes: 30, seconds: 15 });
  });

  test("returns null for invalid input", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
  });
});

describe("formatDuration", () => {
  test("formats as short by default", () => {
    expect(formatDuration("PT2H30M")).toBe("2h 30m");
    expect(formatDuration("PT45M")).toBe("45m");
    expect(formatDuration("PT1H")).toBe("1h");
  });

  test("formats as long", () => {
    expect(formatDuration("PT2H30M", { style: "long" })).toBe("2 hours 30 minutes");
    expect(formatDuration("PT1H", { style: "long" })).toBe("1 hour");
  });

  test("formats as iso", () => {
    expect(formatDuration("2h 30m", { style: "iso" })).toBe("PT2H30M");
  });

  test("returns empty for null/undefined", () => {
    expect(formatDuration(null)).toBe("");
    expect(formatDuration(undefined)).toBe("");
  });
});

describe("normalizeDuration", () => {
  test("normalizes to ISO", () => {
    expect(normalizeDuration("2h 30m")).toBe("PT2H30M");
    expect(normalizeDuration("2:30")).toBe("PT2H30M");
    expect(normalizeDuration("PT2H30M")).toBe("PT2H30M");
  });

  test("preserves free text on unknown format", () => {
    expect(normalizeDuration("about 2 hours")).toBe("about 2 hours");
  });
});

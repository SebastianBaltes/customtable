import { describe, test, expect } from "@jest/globals";
import { normalizeHex } from "./ColorEditor";

describe("normalizeHex", () => {
  test("normalizes 6-digit hex with #", () => {
    expect(normalizeHex("#FF0000")).toBe("#ff0000");
    expect(normalizeHex("#3b82f6")).toBe("#3b82f6");
  });

  test("adds # prefix if missing", () => {
    expect(normalizeHex("ff0000")).toBe("#ff0000");
  });

  test("expands 3-digit shorthand", () => {
    expect(normalizeHex("#f00")).toBe("#ff0000");
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(normalizeHex("f00")).toBe("#ff0000");
  });

  test("returns empty for empty input", () => {
    expect(normalizeHex("")).toBe("");
  });

  test("preserves invalid input as-is", () => {
    expect(normalizeHex("red")).toBe("red");
    expect(normalizeHex("#xyz123")).toBe("#xyz123");
  });
});

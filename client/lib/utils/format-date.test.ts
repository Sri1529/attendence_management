import { describe, it, expect } from "vitest";
import { formatDurationDate } from "./format-date";

describe("formatDurationDate", () => {
  it("formats date strings into DD-MMM-YYYY format", () => {
    expect(formatDurationDate("2026-09-12")).toBe("12-SEPT-2026");
    expect(formatDurationDate("2026-12-18")).toBe("18-DEC-2026");
    expect(formatDurationDate("2026-01-05")).toBe("05-JAN-2026");
  });

  it("handles null or undefined input gracefully", () => {
    expect(formatDurationDate(null)).toBe("");
    expect(formatDurationDate(undefined)).toBe("");
  });
});

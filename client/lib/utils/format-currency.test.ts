import { describe, it, expect } from "vitest";
import { formatCurrency } from "./format-currency";

describe("formatCurrency", () => {
  it("formats string monetary values correctly", () => {
    expect(formatCurrency("49000.00")).toBe("₹49,000.00");
    expect(formatCurrency("1250.5")).toBe("₹1,250.50");
    expect(formatCurrency("0")).toBe("₹0.00");
  });

  it("handles empty or null values gracefully", () => {
    expect(formatCurrency(null)).toBe("₹0.00");
    expect(formatCurrency(undefined)).toBe("₹0.00");
    expect(formatCurrency("")).toBe("₹0.00");
  });

  it("supports custom currency symbols", () => {
    expect(formatCurrency("100.00", "$")).toBe("$100.00");
  });
});

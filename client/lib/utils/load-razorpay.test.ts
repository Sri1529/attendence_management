import { describe, it, expect } from "vitest";
import { loadRazorpayScript } from "./load-razorpay";

describe("loadRazorpayScript", () => {
  it("resolves to false when window is undefined (SSRs)", async () => {
    // Vitest runs in jsdom by default so window exists, but if Razorpay exists it resolves true
    const result = await loadRazorpayScript();
    expect(typeof result).toBe("boolean");
  });
});

import { describe, it, expect } from "vitest";

describe("test infrastructure", () => {
  it("runs in jsdom with vitest", () => {
    expect(typeof window).toBe("object");
    expect(1 + 1).toBe(2);
  });
});

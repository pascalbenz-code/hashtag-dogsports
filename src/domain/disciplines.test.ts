import { describe, expect, it } from "vitest";
import { hurdleReferenceClass } from "./disciplines";

describe("discipline reference courses", () => {
  it("uses the four-hurdle VK2 reference for VDH-DK", () => {
    expect(hurdleReferenceClass("VDH-DK")).toBe("FCI-VK2");
  });

  it("keeps the six-hurdle VK3 reference for the sprint competition", () => {
    expect(hurdleReferenceClass("VDH-S-VK")).toBe("FCI-VK3");
  });
});

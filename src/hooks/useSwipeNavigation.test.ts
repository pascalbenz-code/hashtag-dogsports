import { describe, expect, it, vi } from "vitest";
import {
  isAppSwipeInteractiveTarget,
  resolveAppSwipe,
} from "./useSwipeNavigation";

describe("app swipe navigation", () => {
  it("recognizes deliberate horizontal swipes and fast flicks", () => {
    expect(
      resolveAppSwipe(
        { x: 180, y: 40, time: 0 },
        { x: 90, y: 44, time: 400 },
      ),
    ).toBe("left");
    expect(
      resolveAppSwipe(
        { x: 90, y: 40, time: 0 },
        { x: 132, y: 42, time: 60 },
      ),
    ).toBe("right");
  });

  it("rejects short, slow and predominantly vertical gestures", () => {
    expect(
      resolveAppSwipe(
        { x: 100, y: 20, time: 0 },
        { x: 145, y: 22, time: 500 },
      ),
    ).toBeNull();
    expect(
      resolveAppSwipe(
        { x: 180, y: 20, time: 0 },
        { x: 90, y: 100, time: 150 },
      ),
    ).toBeNull();
  });

  it("protects interactive and horizontally scrollable descendants", () => {
    const closest = vi.fn(() => ({ tagName: "INPUT" }));
    expect(
      isAppSwipeInteractiveTarget({ closest } as unknown as EventTarget),
    ).toBe(true);
    expect(closest).toHaveBeenCalledOnce();
    expect(
      isAppSwipeInteractiveTarget({ closest: () => null } as unknown as EventTarget),
    ).toBe(false);
  });
});

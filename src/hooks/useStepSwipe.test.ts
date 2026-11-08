import { describe, expect, it, vi } from "vitest";
import {
  isInteractiveSwipeTarget,
  resolveSwipeStep,
} from "./useStepSwipe";

describe("step swipe", () => {
  it("moves only to an adjacent step on a deliberate horizontal gesture", () => {
    expect(resolveSwipeStep({ x: 200, y: 20 }, { x: 100, y: 25 }, 1)).toBe(2);
    expect(resolveSwipeStep({ x: 100, y: 20 }, { x: 200, y: 25 }, 3)).toBe(2);
    expect(resolveSwipeStep({ x: 200, y: 20 }, { x: 100, y: 25 }, 2)).toBe(3);
    expect(resolveSwipeStep({ x: 100, y: 20 }, { x: 200, y: 25 }, 2)).toBe(1);
  });

  it("ignores boundaries, short gestures and vertical scrolling", () => {
    expect(resolveSwipeStep({ x: 100, y: 0 }, { x: 200, y: 0 }, 1)).toBeNull();
    expect(resolveSwipeStep({ x: 200, y: 0 }, { x: 100, y: 0 }, 3)).toBeNull();
    expect(resolveSwipeStep({ x: 100, y: 0 }, { x: 150, y: 0 }, 2)).toBeNull();
    expect(resolveSwipeStep({ x: 100, y: 0 }, { x: 20, y: 100 }, 2)).toBeNull();
  });

  it("recognizes interactive descendants that must keep their native gestures", () => {
    const closest = vi.fn(() => ({ tagName: "INPUT" }));
    expect(isInteractiveSwipeTarget({ closest } as unknown as EventTarget)).toBe(true);
    expect(closest).toHaveBeenCalledOnce();
    expect(isInteractiveSwipeTarget({ closest: () => null } as unknown as EventTarget)).toBe(false);
    expect(isInteractiveSwipeTarget(null)).toBe(false);
  });
});

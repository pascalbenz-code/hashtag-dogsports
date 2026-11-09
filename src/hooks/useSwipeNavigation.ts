import { useRef, type TouchEventHandler } from "react";

interface SwipePoint {
  x: number;
  y: number;
  time: number;
}

export type SwipeDirection = "left" | "right";

const INTERACTIVE_SELECTOR = [
  "input",
  "select",
  "textarea",
  "button",
  "a",
  "canvas",
  "svg",
  "table",
  "[role='button']",
  "[role='dialog']",
  "[role='slider']",
  "[role='combobox']",
  "[contenteditable='true']",
  "[data-no-app-swipe]",
  ".recharts-wrapper",
  ".overflow-x-auto",
].join(",");

export function isAppSwipeInteractiveTarget(target: EventTarget | null) {
  if (!target || typeof target !== "object") return false;
  const closest = (target as { closest?: (selector: string) => unknown }).closest;
  return typeof closest === "function"
    ? Boolean(closest.call(target, INTERACTIVE_SELECTOR))
    : false;
}

export function resolveAppSwipe(
  start: SwipePoint,
  end: SwipePoint,
  minimumDistance = 72,
  minimumFlickDistance = 36,
  minimumVelocity = 0.55,
): SwipeDirection | null {
  const horizontal = end.x - start.x;
  const vertical = end.y - start.y;
  const duration = Math.max(1, end.time - start.time);
  const velocity = Math.abs(horizontal) / duration;
  const deliberateDistance = Math.abs(horizontal) >= minimumDistance;
  const deliberateFlick =
    Math.abs(horizontal) >= minimumFlickDistance && velocity >= minimumVelocity;

  if (
    (!deliberateDistance && !deliberateFlick) ||
    Math.abs(vertical) > Math.abs(horizontal) * 0.65
  )
    return null;
  return horizontal < 0 ? "left" : "right";
}

function resetSurface(element: HTMLElement, animated: boolean) {
  element.classList.remove("is-swiping");
  if (animated) {
    element.classList.add("is-swipe-returning");
    window.requestAnimationFrame(() =>
      element.style.removeProperty("--swipe-offset"),
    );
    window.setTimeout(
      () => element.classList.remove("is-swipe-returning"),
      240,
    );
  } else {
    element.style.removeProperty("--swipe-offset");
  }
}

export function useSwipeNavigation({
  disabled = false,
  onSwipeLeft,
  onSwipeRight,
}: {
  disabled?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}): {
  onTouchStart: TouchEventHandler<HTMLElement>;
  onTouchMove: TouchEventHandler<HTMLElement>;
  onTouchEnd: TouchEventHandler<HTMLElement>;
  onTouchCancel: TouchEventHandler<HTMLElement>;
} {
  const start = useRef<SwipePoint | null>(null);
  const axis = useRef<"horizontal" | "vertical" | null>(null);

  const onTouchStart: TouchEventHandler<HTMLElement> = (event) => {
    const touch = event.touches[0];
    const viewportWidth = window.innerWidth;
    const isNativeGestureEdge =
      Boolean(touch) &&
      (touch.clientX <= 24 || touch.clientX >= viewportWidth - 24);
    start.current =
      disabled ||
      !touch ||
      isNativeGestureEdge ||
      isAppSwipeInteractiveTarget(event.target)
        ? null
        : { x: touch.clientX, y: touch.clientY, time: performance.now() };
    axis.current = null;
  };

  const onTouchMove: TouchEventHandler<HTMLElement> = (event) => {
    const origin = start.current;
    const touch = event.touches[0];
    if (!origin || !touch || disabled) return;
    const horizontal = touch.clientX - origin.x;
    const vertical = touch.clientY - origin.y;
    if (!axis.current && Math.max(Math.abs(horizontal), Math.abs(vertical)) > 8)
      axis.current =
        Math.abs(horizontal) > Math.abs(vertical) * 1.15
          ? "horizontal"
          : "vertical";
    if (axis.current !== "horizontal") return;

    const offset = Math.max(-96, Math.min(96, horizontal * 0.34));
    event.currentTarget.classList.add("is-swiping");
    event.currentTarget.style.setProperty("--swipe-offset", `${offset}px`);
  };

  const onTouchEnd: TouchEventHandler<HTMLElement> = (event) => {
    const origin = start.current;
    const touch = event.changedTouches[0];
    const wasHorizontal = axis.current === "horizontal";
    start.current = null;
    axis.current = null;
    if (!origin || !touch || disabled) {
      resetSurface(event.currentTarget, wasHorizontal);
      return;
    }
    const direction = resolveAppSwipe(origin, {
      x: touch.clientX,
      y: touch.clientY,
      time: performance.now(),
    });
    resetSurface(event.currentTarget, direction === null && wasHorizontal);
    if (direction === "left") onSwipeLeft?.();
    if (direction === "right") onSwipeRight?.();
  };

  const onTouchCancel: TouchEventHandler<HTMLElement> = (event) => {
    const shouldAnimate = axis.current === "horizontal";
    start.current = null;
    axis.current = null;
    resetSurface(event.currentTarget, shouldAnimate);
  };

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
}

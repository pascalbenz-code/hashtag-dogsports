import { useEffect, useRef, type MouseEventHandler, type TouchEventHandler } from "react";

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
  "button:not([data-swipe-card])",
  "a",
  "canvas",
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
  onClickCapture: MouseEventHandler<HTMLElement>;
} {
  const start = useRef<SwipePoint | null>(null);
  const axis = useRef<"horizontal" | "vertical" | null>(null);
  const committing = useRef(false);
  const suppressClickUntil = useRef(0);
  const swipeCard = useRef<Element | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (commitTimer.current !== null) clearTimeout(commitTimer.current);
  }, []);

  const onTouchStart: TouchEventHandler<HTMLElement> = (event) => {
    const touch = event.touches[0];
    const viewportWidth = window.innerWidth;
    const isNativeGestureEdge =
      Boolean(touch) &&
      (touch.clientX <= 24 || touch.clientX >= viewportWidth - 24);
    swipeCard.current = event.target instanceof Element
      ? event.target.closest("[data-swipe-card]") : null;
    start.current =
      disabled ||
      committing.current ||
      event.touches.length !== 1 ||
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

    const canNavigate = horizontal < 0 ? onSwipeLeft : onSwipeRight;
    const offset = Math.max(-120, Math.min(120, horizontal * (canNavigate ? 0.7 : 0.15)));
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
    const direction = wasHorizontal ? resolveAppSwipe(origin, {
      x: touch.clientX,
      y: touch.clientY,
      time: performance.now(),
    }) : null;
    const canNavigate = direction === "left" ? onSwipeLeft : direction === "right" ? onSwipeRight : undefined;
    if (!canNavigate) {
      resetSurface(event.currentTarget, wasHorizontal);
      return;
    }
    const element = event.currentTarget;
    committing.current = true;
    suppressClickUntil.current = performance.now() + 700;
    element.classList.remove("is-swiping", "is-swipe-returning");
    element.classList.add("is-swipe-committing");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion)
      requestAnimationFrame(() => {
        if (committing.current)
          element.style.setProperty("--swipe-offset", `${direction === "left" ? -window.innerWidth : window.innerWidth}px`);
      });
    commitTimer.current = setTimeout(() => {
      element.classList.remove("is-swipe-committing");
      element.style.removeProperty("--swipe-offset");
      committing.current = false;
      commitTimer.current = null;
      canNavigate();
    }, reducedMotion ? 0 : 160);
  };

  const onTouchCancel: TouchEventHandler<HTMLElement> = (event) => {
    const shouldAnimate = axis.current === "horizontal";
    start.current = null;
    axis.current = null;
    resetSurface(event.currentTarget, shouldAnimate);
  };

  const onClickCapture: MouseEventHandler<HTMLElement> = (event) => {
    if (event.detail !== 0 && event.target instanceof Node && swipeCard.current?.contains(event.target) && performance.now() < suppressClickUntil.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickUntil.current = 0;
    }
  };

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, onClickCapture };
}

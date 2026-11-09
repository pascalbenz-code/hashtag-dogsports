import { useRef, type TouchEventHandler } from "react";
import type { ResultFormStep } from "../domain/resultForm";

interface SwipePoint {
  x: number;
  y: number;
}

const INTERACTIVE_SELECTOR =
  "input, select, textarea, button, a, [role='button'], [contenteditable='true'], [data-no-step-swipe]";

export function isInteractiveSwipeTarget(target: EventTarget | null) {
  if (!target || typeof target !== "object") return false;
  const closest = (target as { closest?: (selector: string) => unknown }).closest;
  return typeof closest === "function"
    ? Boolean(closest.call(target, INTERACTIVE_SELECTOR))
    : false;
}

export function resolveSwipeStep(
  start: SwipePoint,
  end: SwipePoint,
  step: ResultFormStep,
  minimumDistance = 64,
): ResultFormStep | null {
  const horizontal = end.x - start.x;
  const vertical = end.y - start.y;
  if (
    Math.abs(horizontal) < minimumDistance ||
    Math.abs(vertical) > Math.abs(horizontal) * 0.65
  )
    return null;
  if (horizontal < 0 && step < 3) return (step + 1) as ResultFormStep;
  if (horizontal > 0 && step > 1) return (step - 1) as ResultFormStep;
  return null;
}

export function useStepSwipe({
  step,
  onStepChange,
  disabled = false,
  onPreviousPage,
  onNextPage,
}: {
  step: ResultFormStep;
  onStepChange: (step: ResultFormStep) => void;
  disabled?: boolean;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
}): {
  onTouchStart: TouchEventHandler<HTMLElement>;
  onTouchMove: TouchEventHandler<HTMLElement>;
  onTouchEnd: TouchEventHandler<HTMLElement>;
  onTouchCancel: TouchEventHandler<HTMLElement>;
} {
  const start = useRef<SwipePoint | null>(null);
  const horizontalGesture = useRef(false);

  const onTouchStart: TouchEventHandler<HTMLElement> = (event) => {
    const touch = event.touches[0];
    start.current =
      disabled || event.touches.length !== 1 || !touch || touch.clientX <= 24 || touch.clientX >= window.innerWidth - 24 || isInteractiveSwipeTarget(event.target)
        ? null
        : { x: touch.clientX, y: touch.clientY };
    horizontalGesture.current = false;
  };
  const onTouchMove: TouchEventHandler<HTMLElement> = (event) => {
    const origin = start.current;
    const touch = event.touches[0];
    if (!origin || !touch || disabled) return;
    const horizontal = touch.clientX - origin.x;
    const vertical = touch.clientY - origin.y;
    if (
      Math.abs(horizontal) < 8 ||
      Math.abs(vertical) > Math.abs(horizontal) * 0.65
    )
      return;
    horizontalGesture.current = true;
    const offset = Math.max(-100, Math.min(100, horizontal * 0.65));
    event.currentTarget.classList.add("is-swiping");
    event.currentTarget.style.setProperty("--swipe-offset", `${offset}px`);
  };
  const onTouchEnd: TouchEventHandler<HTMLElement> = (event) => {
    const origin = start.current;
    start.current = null;
    const touch = event.changedTouches[0];
    const element = event.currentTarget;
    if (!origin || !touch || disabled) {
      element.classList.remove("is-swiping");
      element.style.removeProperty("--swipe-offset");
      horizontalGesture.current = false;
      return;
    }
    const next = resolveSwipeStep(
      origin,
      { x: touch.clientX, y: touch.clientY },
      step,
    );
    if (next === null && horizontalGesture.current) {
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
    element.classList.remove("is-swiping");
    horizontalGesture.current = false;
    if (next !== null) onStepChange(next);
    else if (resolveSwipeStep(origin, { x: touch.clientX, y: touch.clientY }, 2) === 1 && step === 1)
      onPreviousPage?.();
    else if (resolveSwipeStep(origin, { x: touch.clientX, y: touch.clientY }, 2) === 3 && step === 3)
      onNextPage?.();
  };
  const onTouchCancel: TouchEventHandler<HTMLElement> = (event) => {
    const element = event.currentTarget;
    start.current = null;
    element.classList.toggle(
      "is-swipe-returning",
      horizontalGesture.current,
    );
    element.classList.remove("is-swiping");
    element.style.removeProperty("--swipe-offset");
    if (horizontalGesture.current)
      window.setTimeout(
        () => element.classList.remove("is-swipe-returning"),
        240,
      );
    horizontalGesture.current = false;
  };

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
}

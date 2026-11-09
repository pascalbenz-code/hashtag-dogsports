import { flushSync } from "react-dom";

export type ViewTransitionDirection = "forward" | "backward" | "lateral";

export function runViewTransition(
  direction: ViewTransitionDirection,
  update: () => void,
) {
  void direction;
  flushSync(update);
}

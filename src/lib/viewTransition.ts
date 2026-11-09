import { flushSync } from "react-dom";

export type ViewTransitionDirection = "forward" | "backward" | "lateral";

interface BrowserViewTransition {
  finished: Promise<void>;
}

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => BrowserViewTransition;
};

export function runViewTransition(
  direction: ViewTransitionDirection,
  update: () => void,
) {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const startViewTransition = (document as TransitionDocument)
    .startViewTransition;

  root.dataset.navigationDirection = direction;
  if (!startViewTransition || prefersReducedMotion) {
    flushSync(update);
    window.setTimeout(() => delete root.dataset.navigationDirection, 300);
    return;
  }

  root.classList.add("view-transitions-supported");
  try {
    const transition = startViewTransition.call(document, () => {
      flushSync(update);
    });
    const cleanup = () => {
      delete root.dataset.navigationDirection;
    };
    void transition.finished.then(cleanup, cleanup);
  } catch {
    flushSync(update);
    window.setTimeout(() => delete root.dataset.navigationDirection, 300);
  }
}

import { createContext, useContext } from "react";
import type { FeedbackEvent } from "./feedbackQueue";

export const FeedbackContext = createContext<{
  notify: (event: FeedbackEvent) => string;
  dismiss: () => void;
} | null>(null);

export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (!value)
    throw new Error("useFeedback muss innerhalb des FeedbackProvider verwendet werden.");
  return value;
}

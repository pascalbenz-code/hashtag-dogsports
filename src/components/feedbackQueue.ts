import type { Qualification } from "../domain/types";

export type FeedbackKind =
  | "saved"
  | "cleared"
  | "profile-handler"
  | "profile-dog"
  | "record"
  | "first"
  | "qualifications"
  | "error";

export interface FeedbackEvent {
  kind: FeedbackKind;
  title: string;
  message?: string;
  qualifications?: readonly Qualification[];
  durationMs?: number;
}

export interface QueuedFeedback extends FeedbackEvent {
  id: string;
}

export const appendFeedback = (
  queue: readonly QueuedFeedback[],
  event: FeedbackEvent,
  id: string,
): QueuedFeedback[] => [...queue, { ...event, id }];

export const removeActiveFeedback = (
  queue: readonly QueuedFeedback[],
): QueuedFeedback[] => queue.slice(1);

export const getActiveFeedback = (
  queue: readonly QueuedFeedback[],
): QueuedFeedback | null => queue[0] ?? null;

import {
  AlertTriangle,
  CheckCircle2,
  Dog,
  Eraser,
  Medal,
  Sparkles,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FeedbackContext } from "./feedbackContext";
import {
  appendFeedback,
  getActiveFeedback,
  removeActiveFeedback,
  type FeedbackEvent,
  type FeedbackKind,
  type QueuedFeedback,
} from "./feedbackQueue";

const DEFAULT_DURATION: Record<FeedbackKind, number> = {
  saved: 1800,
  cleared: 1800,
  "profile-handler": 2200,
  "profile-dog": 2200,
  record: 3000,
  first: 3000,
  qualifications: 3200,
  error: 4000,
};

function FeedbackIcon({ kind }: { kind: FeedbackKind }) {
  const icon =
    kind === "cleared" ? (
      <Eraser />
    ) : kind === "profile-handler" ? (
      <UserRound />
    ) : kind === "profile-dog" ? (
      <Dog />
    ) : kind === "record" ? (
      <Trophy />
    ) : kind === "first" ? (
      <Sparkles />
    ) : kind === "qualifications" ? (
      <Medal />
    ) : kind === "error" ? (
      <AlertTriangle />
    ) : (
      <CheckCircle2 />
    );
  return <span className="feedback-icon" aria-hidden="true">{icon}</span>;
}

export function FeedbackCenter({
  feedback,
  onDismiss,
}: {
  feedback: QueuedFeedback | null;
  onDismiss: () => void;
}) {
  return (
    <div
      className="feedback-viewport pointer-events-none fixed inset-x-4 bottom-24 z-[80] mx-auto max-w-md"
      aria-live="polite"
      aria-atomic="true"
    >
      {feedback ? (
        <section
          className={`feedback-card feedback-${feedback.kind} pointer-events-auto`}
          role="status"
        >
          <FeedbackIcon kind={feedback.kind} />
          <div className="feedback-copy">
            <strong>{feedback.title}</strong>
            {feedback.message ? <p>{feedback.message}</p> : null}
            {feedback.qualifications?.length ? (
              <div
                className="feedback-qualifications"
                aria-label="Neu erreichte Qualifikationen"
              >
                {feedback.qualifications.map((qualification) => (
                  <span
                    className={`badge q-${qualification.color}`}
                    key={qualification.key}
                  >
                    {qualification.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="feedback-close"
            aria-label="Meldung schließen"
            onClick={onDismiss}
          >
            <X aria-hidden="true" />
          </button>
        </section>
      ) : null}
    </div>
  );
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueuedFeedback[]>([]);
  const nextId = useRef(0);
  const active = getActiveFeedback(queue);
  const dismiss = useCallback(
    () => setQueue((current) => removeActiveFeedback(current)),
    [],
  );
  const notify = useCallback((event: FeedbackEvent) => {
    nextId.current += 1;
    const id = `feedback-${nextId.current}`;
    setQueue((current) => appendFeedback(current, event, id));
    return id;
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(
      dismiss,
      active.durationMs ?? DEFAULT_DURATION[active.kind],
    );
    return () => window.clearTimeout(timer);
  }, [active, dismiss]);

  return (
    <FeedbackContext.Provider value={{ notify, dismiss }}>
      {children}
      <FeedbackCenter feedback={active} onDismiss={dismiss} />
    </FeedbackContext.Provider>
  );
}


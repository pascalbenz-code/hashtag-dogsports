import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FeedbackCenter } from "./FeedbackCenter";
import {
  appendFeedback,
  getActiveFeedback,
  removeActiveFeedback,
  type QueuedFeedback,
} from "./feedbackQueue";

const saved: QueuedFeedback = {
  id: "saved",
  kind: "saved",
  title: "Ergebnis gespeichert",
};

describe("feedback queue", () => {
  it("keeps events ordered and exposes only the first event as active", () => {
    const queue = appendFeedback(
      appendFeedback([], saved, "saved-copy"),
      { kind: "record", title: "Neue Bestleistung" },
      "record",
    );

    expect(queue.map((event) => event.id)).toEqual(["saved-copy", "record"]);
    expect(getActiveFeedback(queue)?.id).toBe("saved-copy");
    expect(getActiveFeedback(removeActiveFeedback(queue))?.id).toBe("record");
  });
});

describe("FeedbackCenter", () => {
  it("renders simultaneous qualifications in one accessible status card", () => {
    const html = renderToStaticMarkup(
      <FeedbackCenter
        feedback={{
          id: "qualifications",
          kind: "qualifications",
          title: "Qualifikationen erreicht",
          qualifications: [
            { key: "swhv", label: "swhv-Quali", color: "green" },
            { key: "dhv", label: "dhv-Quali", color: "blue" },
            { key: "vdh", label: "VDH-Quali", color: "red" },
          ],
        }}
        onDismiss={vi.fn()}
      />,
    );

    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).toContain("swhv-Quali");
    expect(html).toContain("dhv-Quali");
    expect(html).toContain("VDH-Quali");
    expect(html).toContain('aria-label="Meldung schließen"');
  });

  it("keeps the live region mounted when the queue is empty", () => {
    const html = renderToStaticMarkup(
      <FeedbackCenter feedback={null} onDismiss={vi.fn()} />,
    );
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('role="status"');
  });
});

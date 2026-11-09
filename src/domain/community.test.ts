import { expect, it } from "vitest";
import { resultPublication } from "./community";
import { createBlankResult } from "./resultForm";
it("does not publish incomplete drafts", () => {
  expect(() => resultPublication(createBlankResult())).toThrow(/vollständige/);
});
it("only publishes the explicit result summary, without private profile data or notes", () => {
  const result = {
    ...createBlankResult(),
    date: "2026-11-09",
    event: "Vereinsprüfung",
    handlerId: "h",
    dogId: "d",
    handler: "Name",
    dog: "Dog",
    handlerBirthDate: "1990-01-01",
    notes: "private",
    obedience: 55,
    hurdles: { time: 12, faults: 0 },
    slalom: { time: 14, faults: 0 },
    obstacle: { time: 10, faults: 0 },
  };
  const publication = resultPublication(result);
  expect(publication.total).toBe(269);
  expect(Object.keys(publication).sort()).toEqual(
    [
      "result_id",
      "author_name",
      "dog_name",
      "event_name",
      "result_date",
      "discipline",
      "total",
      "source_updated_at",
    ].sort(),
  );
  expect(JSON.stringify(publication)).not.toContain("private");
  expect(JSON.stringify(publication)).not.toContain("1990-01-01");
});

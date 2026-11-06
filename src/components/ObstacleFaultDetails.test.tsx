import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ObstacleFaultDetail } from "../domain/types";
import { ObstacleFaultDetails } from "./ObstacleFaultDetails";

const renderDetails = (details: ObstacleFaultDetail[]) =>
  renderToStaticMarkup(
    <ObstacleFaultDetails details={details} onChange={() => undefined} />,
  );

describe("ObstacleFaultDetails course image", () => {
  it("uses the eight-obstacle reference image without marking an obstacle initially", () => {
    const positionIndependentFault: ObstacleFaultDetail = {
      id: "fault-independent",
      position: "position-independent",
      code: "held-after-start",
      points: 2,
    };

    const markup = renderDetails([positionIndependentFault]);

    expect(markup).toContain("obstacle-course-ths.svg");
    expect(markup.match(/obstacle-reference-hotspot/g)).toHaveLength(8);
    expect(markup).not.toContain('data-faulted="true"');
  });

  it("marks only the obstacle with a stored fault", () => {
    const markup = renderDetails([
      {
        id: "fault-tunnel",
        position: "tunnel",
        code: "obstacle-omitted",
        points: 4,
      },
    ]);

    expect(markup).toContain(
      'data-position="tunnel" data-faulted="true"',
    );
    expect(markup.match(/data-faulted="true"/g)).toHaveLength(1);
    expect(markup).toContain("Tunnel auswählen, Fehler erfasst");
  });

  it("shows one visual marker for several faults at the same obstacle", () => {
    const markup = renderDetails([
      {
        id: "fault-oxer-1",
        position: "oxer",
        code: "oxer-bar-1-dropped",
        points: 1,
      },
      {
        id: "fault-oxer-2",
        position: "oxer",
        code: "oxer-bar-2-dropped",
        points: 1,
      },
    ]);

    expect(markup).toContain(
      'data-position="oxer" data-faulted="true"',
    );
    expect(markup.match(/data-faulted="true"/g)).toHaveLength(1);
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  CompetitionClass,
  SlalomFaultDetail,
} from "../domain/types";
import { SlalomFaultDetails } from "./SlalomFaultDetails";

const SUPPORTED_CLASSES: readonly CompetitionClass[] = [
  "FCI-VK1",
  "FCI-VK2",
  "FCI-VK3",
  "VDH-S-VK",
  "VDH-DK",
];

const omittedGate = (
  id: string,
  position: SlalomFaultDetail["position"],
): SlalomFaultDetail => ({
  id,
  position,
  code: "gate-omitted",
  points: 4,
});

const renderDetails = (
  className: CompetitionClass,
  details: SlalomFaultDetail[],
) =>
  renderToStaticMarkup(
    <SlalomFaultDetails
      className={className}
      details={details}
      onChange={() => undefined}
    />,
  );

describe("SlalomFaultDetails course image", () => {
  it("uses the five-gate reference image for every supported discipline", () => {
    const positionIndependentFault: SlalomFaultDetail = {
      id: "fault-independent",
      position: "position-independent",
      code: "held-after-start",
      points: 2,
    };

    for (const className of SUPPORTED_CLASSES) {
      const markup = renderDetails(className, [positionIndependentFault]);
      expect(markup).toContain("slalom-course-vk-dk.svg");
      expect(markup.match(/slalom-reference-hotspot/g)).toHaveLength(5);
      expect(markup).not.toContain('data-faulted="true"');
    }
  });

  it("marks only the gate with a stored fault", () => {
    const markup = renderDetails("FCI-VK3", [
      omittedGate("fault-2", "gate-2"),
    ]);

    expect(markup).toContain(
      'data-position="gate-2" data-faulted="true"',
    );
    expect(markup.match(/data-faulted="true"/g)).toHaveLength(1);
  });

  it("also supports and marks the fifth slalom gate", () => {
    const markup = renderDetails("VDH-DK", [
      omittedGate("fault-5", "gate-5"),
    ]);

    expect(markup).toContain(
      'data-position="gate-5" data-faulted="true"',
    );
    expect(markup).toContain("Slalomtor 5 auswählen, Fehler erfasst");
  });
});

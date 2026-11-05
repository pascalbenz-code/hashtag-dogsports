import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { HurdleFaultDetail } from "../domain/types";
import { HurdleFaultDetails } from "./HurdleFaultDetails";

const droppedBar = (id: string, position: HurdleFaultDetail["position"]): HurdleFaultDetail => ({
  id,
  position,
  code: position === "turn-pole" ? "turn-pole-omitted" : "bar-dropped",
  points: position === "turn-pole" ? 10 : 2,
});

const renderDetails = (
  className: "FCI-VK1" | "FCI-VK2" | "FCI-VK3",
  details: HurdleFaultDetail[] = [],
) =>
  renderToStaticMarkup(
    <HurdleFaultDetails
      className={className}
      details={details}
      onChange={() => undefined}
    />,
  );

describe("HurdleFaultDetails course image", () => {
  it("uses the black-and-white reference image for VK1 and VK2", () => {
    const positionIndependentFault: HurdleFaultDetail = {
      id: "fault-independent",
      position: "position-independent",
      code: "held-after-start",
      points: 2,
    };
    for (const className of ["FCI-VK1", "FCI-VK2"] as const) {
      const markup = renderDetails(className, [positionIndependentFault]);
      expect(markup).toContain("hurdle-course-vk1-vk2-dk.svg");
      expect(markup).not.toContain('data-faulted="true"');
    }
  });

  it("marks one hurdle once even when several faults are stored there", () => {
    const markup = renderDetails("FCI-VK2", [
      droppedBar("fault-1", "hurdle-2"),
      { ...droppedBar("fault-2", "hurdle-2"), code: "early-or-late" },
    ]);

    expect(markup).toContain(
      'data-position="hurdle-2" data-faulted="true"',
    );
    expect(markup.match(/data-faulted="true"/g)).toHaveLength(1);
  });

  it("marks a stored error at the turn pole", () => {
    const markup = renderDetails("FCI-VK1", [
      droppedBar("fault-1", "turn-pole"),
    ]);

    expect(markup).toContain(
      'data-position="turn-pole" data-faulted="true"',
    );
  });

  it("keeps the six-hurdle VK3 schematic", () => {
    const markup = renderDetails("FCI-VK3", [
      droppedBar("fault-1", "hurdle-1"),
    ]);

    expect(markup).not.toContain("hurdle-course-vk1-vk2-dk.svg");
    expect(markup).toContain("Schaubild H-VK3");
  });
});

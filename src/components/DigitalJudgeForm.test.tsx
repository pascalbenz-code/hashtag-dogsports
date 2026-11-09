import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JUDGING_DEFINITIONS, JUDGING_LEVELS } from "../domain/judging";
import { DigitalJudgeForm } from "./DigitalJudgeForm";

describe("DigitalJudgeForm", () => {
  it("shows fixed point deductions instead of Mangelhaft rule buttons", () => {
    const html = renderToStaticMarkup(
      <DigitalJudgeForm
        level="VDH-VK1"
        levels={JUDGING_LEVELS}
        definition={JUDGING_DEFINITIONS["VDH-VK1"]}
        onLevelChange={vi.fn()}
        note="Test"
      />,
    );
    const text = html.replace(/<[^>]+>/g, "");

    expect(text).toContain("−3,5 Punkte");
    expect(text).toContain("−5 Punkte");
    expect(text).toContain("0 FP");
    expect(text).toContain("60 Punkte");
    expect(html).not.toContain(">Mangelhaft</span>");
    expect(html).toContain("numeric-value--hero");
    expect(html).toContain("numeric-value--score");
    expect(html).toContain("numeric-value--compact");
    expect(html).toContain('class="numeric-input"');
  });
});

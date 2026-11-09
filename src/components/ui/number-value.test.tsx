import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MeasurementValue, NumberValue } from "./number-value";

describe("NumberValue", () => {
  it("omits unnecessary decimals and retains required German decimals", () => {
    expect(renderToStaticMarkup(<NumberValue value={12} />)).toContain(
      ">12</span>",
    );
    expect(renderToStaticMarkup(<NumberValue value={3.5} />)).toContain(
      ">3,5</span>",
    );
  });

  it("renders semantic variants, affixes and the requested element", () => {
    const html = renderToStaticMarkup(
      <NumberValue
        as="strong"
        value={5}
        variant="hero"
        prefix="−"
        suffix=" Punkte"
        className="custom-number"
      />,
    );

    expect(html).toContain("numeric-value");
    expect(html).toContain("numeric-value--hero");
    expect(html).toContain("custom-number");
    expect(html).toContain('data-numeric-variant="hero"');
    expect(html.replace(/<[^>]+>/g, "")).toContain("−5 Punkte");
  });

  it("distinguishes faults, achieved points and deductions centrally", () => {
    const text = (value: number, kind: "faults" | "points" | "deduction") =>
      renderToStaticMarkup(<MeasurementValue value={value} kind={kind} />)
        .replace(/<[^>]+>/g, "");
    expect(text(0, "faults")).toBe("0 FP");
    expect(text(55, "points")).toBe("55 Punkte");
    expect(text(7, "deduction")).toBe("−7 Punkte");
    expect(text(7.5, "points")).toBe("7,5 Punkte");
  });
});

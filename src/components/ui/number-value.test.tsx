import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NumberValue } from "./number-value";

describe("NumberValue", () => {
  it("formats German numbers with one decimal place by default", () => {
    expect(renderToStaticMarkup(<NumberValue value={12} />)).toContain(
      ">12,0</span>",
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
    expect(html).toContain(">−5,0 Punkte</strong>");
  });
});

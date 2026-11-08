import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { Card } from "./card";

describe("UI primitives", () => {
  it("uses semantic button variants and sizes", () => {
    const html = renderToStaticMarkup(
      <Button variant="danger" size="sm">
        Löschen
      </Button>,
    );
    expect(html).toContain("app-button");
    expect(html).toContain("app-button-danger");
    expect(html).toContain("app-button-sm");
  });

  it("uses the semantic app card surface", () => {
    const html = renderToStaticMarkup(<Card>Inhalt</Card>);
    expect(html).toContain('class="app-card"');
  });
});

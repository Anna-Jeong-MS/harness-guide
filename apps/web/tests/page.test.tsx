import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Page from "../app/page";

describe("dashboard page query handling", () => {
  it("uses the first q value when duplicate query params are provided", async () => {
    const html = renderToStaticMarkup(
      await Page({ searchParams: Promise.resolve({ q: ["삼성", "AAPL"] }) }),
    );

    expect(html).toContain('value="삼성"');
    expect(html).toContain("Samsung Electronics");
  });
});

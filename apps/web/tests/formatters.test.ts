import { describe, expect, it } from "vitest";
import { formatPercent, formatPrice, formatPriceRange, formatRisk } from "../src/modules/formatters";

describe("professional numeric formatters", () => {
  it("formats confidence and AI contribution as percentages", () => {
    expect(formatPercent(0.82)).toBe("82%");
    expect(formatPercent(0.405)).toBe("41%");
  });

  it("formats price levels as localized numbers without forced currency symbols", () => {
    expect(formatPrice(118)).toBe("118");
    expect(formatPrice(71000)).toBe("71,000");
    expect(formatPriceRange({ low: 118, high: 124 })).toBe("118 - 124");
  });

  it("formats risk with professional labels and numeric support", () => {
    expect(formatRisk(0.2)).toEqual({ label: "Low", display: "Low (20%)" });
    expect(formatRisk(0.5)).toEqual({ label: "Moderate", display: "Moderate (50%)" });
    expect(formatRisk(0.8)).toEqual({ label: "High", display: "High (80%)" });
  });
});

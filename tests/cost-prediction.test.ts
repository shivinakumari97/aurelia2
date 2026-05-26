import { describe, it, expect } from "vitest";
import { predictCostsBaseline } from "@/lib/ai/cost-prediction";

describe("cost prediction baseline", () => {
  it("distributes a wedding budget across categories", () => {
    const p = predictCostsBaseline({ eventType: "WEDDING", budget: 100000 });
    expect(p.lines.length).toBeGreaterThan(3);
    const venue = p.lines.find((l) => l.category === "VENUE");
    expect(venue).toBeDefined();
    // Total should be close to the budget (profiles sum to ~1).
    expect(p.total).toBeGreaterThan(80000);
    expect(p.total).toBeLessThanOrEqual(105000);
  });

  it("falls back to a default profile for unknown event types", () => {
    const p = predictCostsBaseline({ eventType: "MYSTERY", budget: 50000 });
    expect(p.lines.length).toBeGreaterThan(0);
  });

  it("blends past averages and raises confidence", () => {
    const p = predictCostsBaseline({
      eventType: "CORPORATE",
      budget: 100000,
      pastAverages: { CATERING: 30000 },
    });
    const catering = p.lines.find((l) => l.category === "CATERING")!;
    expect(catering.confidence).toBeGreaterThan(0.6);
    expect(catering.note).toMatch(/past/i);
  });
});

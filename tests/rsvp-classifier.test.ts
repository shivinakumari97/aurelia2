import { describe, it, expect } from "vitest";
import { classifyHeuristic } from "@/lib/ai/rsvp-classifier";

describe("RSVP heuristic classifier", () => {
  it("detects a clear yes and extracts plus-ones", () => {
    const r = classifyHeuristic("Yes, count me in! I'll bring my wife.");
    expect(r.status).toBe("YES");
    expect(r.plusOnes).toBe(1);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("detects a clear no", () => {
    const r = classifyHeuristic("So sorry, I can't make it that weekend.");
    expect(r.status).toBe("NO");
  });

  it("detects maybe", () => {
    const r = classifyHeuristic("Not sure yet, I'll try to come.");
    expect(r.status).toBe("MAYBE");
  });

  it("extracts dietary restrictions", () => {
    const r = classifyHeuristic("Yes! Note that I'm vegan and have a nut allergy.");
    expect(r.dietary).toContain("vegan");
    expect(r.dietary).toContain("nut allergy");
  });

  it("flags conflicting/ambiguous replies and suggests follow-up", () => {
    const r = classifyHeuristic("Yes but maybe no, depends if I can make it");
    expect(r.status).toBe("AMBIGUOUS");
    expect(r.ambiguous).toBe(true);
    expect(r.suggestedFollowUp).toBeTruthy();
  });
});

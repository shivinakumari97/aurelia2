import { describe, it, expect } from "vitest";
import { optimizeSeating, type SeatGuest, type SeatTable } from "@/lib/ai/seating";

function guest(id: string, group: string | null, rank: number | null, plusOnes = 0): SeatGuest {
  return { id, name: id, groupTag: group, seatRank: rank, dietary: null, plusOnes };
}

describe("seating optimizer", () => {
  it("keeps a group together at one table when capacity allows", () => {
    const guests = [guest("a", "team", 1), guest("b", "team", 2), guest("c", "team", 3)];
    const tables: SeatTable[] = [
      { id: "t1", name: "Table 1", capacity: 8 },
      { id: "t2", name: "Table 2", capacity: 8 },
    ];
    const plan = optimizeSeating(guests, tables);
    const t1 = plan.assignments.find((a) => a.tableId === "t1")!;
    expect(t1.guestIds.sort()).toEqual(["a", "b", "c"]);
    expect(plan.unseated).toHaveLength(0);
    expect(plan.score).toBeGreaterThan(0.9);
  });

  it("respects capacity and counts plus-ones", () => {
    const guests = [guest("a", null, 1, 1), guest("b", null, 2, 1)]; // 4 seats total
    const tables: SeatTable[] = [{ id: "t1", name: "Small", capacity: 3 }];
    const plan = optimizeSeating(guests, tables);
    const seated = plan.assignments[0]!.seats;
    expect(seated).toBeLessThanOrEqual(3);
    expect(plan.unseated.length).toBeGreaterThan(0);
  });

  it("seats more senior groups first (lower table index)", () => {
    const guests = [guest("vip", "exec", 1), guest("junior", "interns", 9)];
    const tables: SeatTable[] = [
      { id: "t1", name: "Head", capacity: 1 },
      { id: "t2", name: "Back", capacity: 1 },
    ];
    const plan = optimizeSeating(guests, tables);
    expect(plan.assignments.find((a) => a.tableId === "t1")!.guestIds).toContain("vip");
  });

  it("returns all unseated when there are no tables", () => {
    const plan = optimizeSeating([guest("a", null, null)], []);
    expect(plan.unseated).toEqual(["a"]);
    expect(plan.score).toBe(0);
  });
});

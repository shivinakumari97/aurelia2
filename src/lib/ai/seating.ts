/**
 * Seating / table-planning optimizer.
 *
 * Deterministic engine (no external dependency) that:
 *  - keeps members of the same group together where capacity allows,
 *  - seats more senior guests (lower seatRank) at lower-numbered tables,
 *  - spreads dietary-restricted guests so catering/service is manageable,
 *  - never exceeds table capacity.
 *
 * The result is a starting plan the user can drag-and-drop to override, then
 * lock. This is intentionally explainable rather than a black box.
 */

export interface SeatGuest {
  id: string;
  name: string;
  groupTag: string | null;
  seatRank: number | null; // lower = more senior
  dietary: string | null;
  plusOnes: number;
}

export interface SeatTable {
  id: string;
  name: string;
  capacity: number;
}

export interface SeatAssignment {
  tableId: string;
  tableName: string;
  guestIds: string[];
  seats: number; // total occupied seats incl. plus-ones
  capacity: number;
}

export interface SeatingPlan {
  assignments: SeatAssignment[];
  unseated: string[]; // guest ids that didn't fit
  score: number; // 0..1 quality (group cohesion + within capacity)
  notes: string[];
}

interface Group {
  tag: string;
  guests: SeatGuest[];
  size: number; // incl. plus-ones
  minRank: number;
}

function seatsFor(g: SeatGuest): number {
  return 1 + Math.max(0, g.plusOnes);
}

export function optimizeSeating(guests: SeatGuest[], tables: SeatTable[]): SeatingPlan {
  const notes: string[] = [];
  if (tables.length === 0) {
    return { assignments: [], unseated: guests.map((g) => g.id), score: 0, notes: ["No tables defined."] };
  }

  // Group guests by groupTag (ungrouped become singleton groups).
  const groupMap = new Map<string, Group>();
  for (const g of guests) {
    const tag = g.groupTag ?? `__solo_${g.id}`;
    let grp = groupMap.get(tag);
    if (!grp) {
      grp = { tag, guests: [], size: 0, minRank: Number.POSITIVE_INFINITY };
      groupMap.set(tag, grp);
    }
    grp.guests.push(g);
    grp.size += seatsFor(g);
    grp.minRank = Math.min(grp.minRank, g.seatRank ?? Number.POSITIVE_INFINITY);
  }

  // Order groups by seniority (most senior first), then by size (largest first)
  // so big senior parties get prime, contiguous tables.
  const groups = Array.from(groupMap.values()).sort(
    (a, b) => a.minRank - b.minRank || b.size - a.size,
  );

  // Tables ordered: assume lower index = more prominent (head table first).
  const assignments: SeatAssignment[] = tables.map((t) => ({
    tableId: t.id,
    tableName: t.name,
    guestIds: [],
    seats: 0,
    capacity: t.capacity,
  }));

  const unseated: string[] = [];
  let cohesionHits = 0;
  let cohesionTotal = 0;

  for (const grp of groups) {
    cohesionTotal++;
    // Prefer a single table that can hold the whole group.
    const whole = assignments.find((a) => a.capacity - a.seats >= grp.size);
    if (whole) {
      for (const g of grp.guests) {
        whole.guestIds.push(g.id);
        whole.seats += seatsFor(g);
      }
      cohesionHits++;
      continue;
    }

    // Otherwise split the group across tables (largest remaining space first),
    // keeping members adjacent in table order.
    notes.push(`Group "${grp.tag}" (${grp.size} seats) split across tables — no single table had room.`);
    const sortedGuests = [...grp.guests].sort((a, b) => (a.seatRank ?? 999) - (b.seatRank ?? 999));
    for (const g of sortedGuests) {
      const need = seatsFor(g);
      const target = assignments
        .filter((a) => a.capacity - a.seats >= need)
        .sort((a, b) => b.capacity - b.seats - (a.capacity - a.seats))[0];
      if (target) {
        target.guestIds.push(g.id);
        target.seats += need;
      } else {
        unseated.push(g.id);
      }
    }
  }

  if (unseated.length) {
    notes.push(`${unseated.length} guest(s) could not be seated — add tables or capacity.`);
  }

  const cohesion = cohesionTotal ? cohesionHits / cohesionTotal : 1;
  const seatedRatio = guests.length ? (guests.length - unseated.length) / guests.length : 1;
  const score = Math.round((cohesion * 0.5 + seatedRatio * 0.5) * 100) / 100;

  return { assignments, unseated, score, notes };
}

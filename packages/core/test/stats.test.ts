import { describe, expect, it } from "vitest";
import { computeStats, countEntriesPerDay, createEntry, localDayKey, tombstone, type EntryDraft, type EntryId } from "../src";

let n = 0;
/** Eintrag zu lokaler Uhrzeit (Monat 1-basiert, wie man es liest). */
function at(year: number, month: number, day: number, hour = 12, draft: Partial<EntryDraft> = {}) {
  return createEntry(`e${++n}` as EntryId, { title: "x", ...draft }, new Date(year, month - 1, day, hour).getTime());
}
const now = new Date(2026, 10, 21, 18).getTime(); // 21.11.2026, 18 Uhr

describe("localDayKey", () => {
  it("nutzt den lokalen Kalendertag", () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe("2026-01-05");
    expect(localDayKey(new Date(2026, 0, 6, 0, 0).getTime())).toBe("2026-01-06");
  });
});

describe("countEntriesPerDay", () => {
  it("zählt pro Tag und ignoriert Gelöschte", () => {
    const deleted = tombstone(at(2026, 11, 20), now);
    const counts = countEntriesPerDay([at(2026, 11, 20, 9), at(2026, 11, 20, 22), at(2026, 11, 21), deleted]);
    expect(Object.fromEntries(counts)).toEqual({ "2026-11-20": 2, "2026-11-21": 1 });
  });
});

describe("computeStats", () => {
  it("zählt Einträge, verschiedene Tags und Minuten", () => {
    const stats = computeStats(
      [
        at(2026, 11, 21, 9, { tags: ["react", "css"], durationMinutes: 30 }),
        at(2026, 11, 21, 10, { tags: ["react"], durationMinutes: 45 }),
        at(2026, 11, 1),
      ],
      now,
    );
    expect(stats).toMatchObject({ entries: 3, skills: 2, totalMinutes: 75 });
  });

  it("zählt die Serie bis heute", () => {
    const stats = computeStats([at(2026, 11, 21), at(2026, 11, 20), at(2026, 11, 19), at(2026, 11, 17)], now);
    expect(stats.streakDays).toBe(3);
  });

  it("zählt ab gestern, wenn heute noch nichts eingetragen ist", () => {
    expect(computeStats([at(2026, 11, 20), at(2026, 11, 19)], now).streakDays).toBe(2);
  });

  it("ist 0, wenn gestern und heute nichts eingetragen wurde", () => {
    expect(computeStats([at(2026, 11, 19)], now).streakDays).toBe(0);
  });

  it("überspringt den Monatswechsel korrekt", () => {
    const stats = computeStats([at(2026, 12, 1), at(2026, 11, 30)], new Date(2026, 11, 1, 20).getTime());
    expect(stats.streakDays).toBe(2);
  });

  it("ignoriert gelöschte Einträge", () => {
    expect(computeStats([tombstone(at(2026, 11, 21, 12, { tags: ["x"] }), now)], now)).toEqual({
      entries: 0,
      skills: 0,
      totalMinutes: 0,
      streakDays: 0,
    });
  });
});

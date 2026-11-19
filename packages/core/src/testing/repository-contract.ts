/**
 * CONTRACT-TESTS für die Repository-Ports.
 *
 * Ein Interface beschreibt nur Signaturen, nicht das Verhalten. Diese Suite
 * legt das Verhalten fest: Jeder Adapter (In-Memory, SQLite, später IndexedDB)
 * ruft sie mit seiner eigenen Fabrik auf und muss dieselben Tests bestehen.
 * So kann man Adapter austauschen, ohne Überraschungen.
 *
 * Nur für Tests gedacht: importiert über "@devlog/core/testing".
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createEntry, type Entry, type EntryDraft } from "../domain/entry";
import { createProject } from "../domain/project";
import { parseTag } from "../domain/tag";
import { tombstone, type EntryId, type ProjectId } from "../domain/types";
import type { EntryRepository, ProjectRepository } from "../ports";

export interface RepositoryUnderTest {
  entries: EntryRepository;
  projects: ProjectRepository;
}

export function describeRepositoryContract(
  name: string,
  setup: () => Promise<RepositoryUnderTest>,
): void {
  describe(`Repository-Contract: ${name}`, () => {
    let repo: RepositoryUnderTest;
    let n = 0;

    beforeEach(async () => {
      repo = await setup();
      n = 0;
    });

    async function addEntry(draft: EntryDraft, createdAt: number): Promise<Entry> {
      const entry = createEntry(`entry-${++n}` as EntryId, draft, createdAt);
      await repo.entries.save(entry);
      return entry;
    }

    describe("EntryRepository", () => {
      it("speichert und lädt einen Eintrag unverändert (Round-Trip)", async () => {
        const entry = await addEntry(
          {
            title: "Alles gesetzt",
            body: "```ts\nconst x = 1;\n```",
            learned: "Etwas Neues",
            tags: ["typescript", "c++"],
            mood: "great",
            durationMinutes: 90,
            projectId: "p1" as ProjectId,
          },
          1_000,
        );
        expect(await repo.entries.get(entry.id)).toEqual(entry);
      });

      it("liefert null für unbekannte IDs", async () => {
        expect(await repo.entries.get("nope" as EntryId)).toBeNull();
      });

      it("überschreibt beim erneuten Speichern (Upsert)", async () => {
        const entry = await addEntry({ title: "Alt" }, 1_000);
        const updated = { ...entry, title: "Neu", updatedAt: 2_000 };
        await repo.entries.save(updated);
        expect(await repo.entries.get(entry.id)).toEqual(updated);
        expect(await repo.entries.find({})).toHaveLength(1);
      });

      it("sortiert neueste zuerst und blendet Gelöschte aus", async () => {
        await addEntry({ title: "alt" }, 1_000);
        const middle = await addEntry({ title: "mitte" }, 2_000);
        await addEntry({ title: "neu" }, 3_000);
        await repo.entries.save(tombstone(middle, 4_000));

        expect((await repo.entries.find({})).map((e) => e.title)).toEqual(["neu", "alt"]);
        expect(await repo.entries.find({ includeDeleted: true })).toHaveLength(3);
      });

      it("filtert nach Projekt, Tag, Zeitraum und Limit", async () => {
        const p = "p1" as ProjectId;
        await addEntry({ title: "a", projectId: p, tags: ["react"] }, 1_000);
        await addEntry({ title: "b", tags: ["react", "testing"] }, 2_000);
        await addEntry({ title: "c", projectId: p }, 3_000);

        const titles = async (q: Parameters<EntryRepository["find"]>[0]) =>
          (await repo.entries.find(q)).map((e) => e.title);

        expect(await titles({ projectId: p })).toEqual(["c", "a"]);
        expect(await titles({ tag: parseTag("react") })).toEqual(["b", "a"]);
        expect(await titles({ tag: parseTag("rea") })).toEqual([]); // Tags matchen exakt
        expect(await titles({ from: 2_000, to: 3_000 })).toEqual(["b"]);
        expect(await titles({ limit: 2 })).toEqual(["c", "b"]);
      });

      it("sucht Text in Titel, Body, 'Gelernt' und Tags ohne Rücksicht auf Groß/Klein", async () => {
        await addEntry({ title: "Parser BUG" }, 1_000);
        await addEntry({ title: "x", body: "Ein Off-By-One Fehler" }, 2_000);
        await addEntry({ title: "y", learned: "Vitest ist schnell" }, 3_000);
        await addEntry({ title: "z", tags: ["rustlang"] }, 4_000);

        const titles = async (text: string) => (await repo.entries.find({ text })).map((e) => e.title);
        expect(await titles("bug")).toEqual(["Parser BUG"]);
        expect(await titles("off-by-one")).toEqual(["x"]);
        expect(await titles("VITEST")).toEqual(["y"]);
        expect(await titles("rust")).toEqual(["z"]);
        expect(await titles("   ")).toHaveLength(4); // leere Suche = kein Filter
      });

      it("behandelt % und _ in der Suche wörtlich", async () => {
        await addEntry({ title: "100% fertig" }, 1_000);
        await addEntry({ title: "1000 Zeilen" }, 2_000);
        await addEntry({ title: "snake_case" }, 3_000);
        await addEntry({ title: "snakeXcase" }, 4_000);

        expect((await repo.entries.find({ text: "100%" })).map((e) => e.title)).toEqual(["100% fertig"]);
        expect((await repo.entries.find({ text: "e_c" })).map((e) => e.title)).toEqual(["snake_case"]);
      });

      it("changedSince liefert alles mit updatedAt > since, inklusive Tombstones", async () => {
        const a = await addEntry({ title: "a" }, 1_000);
        await addEntry({ title: "b" }, 2_000);
        await repo.entries.save(tombstone(a, 3_000));

        const changed = await repo.entries.changedSince(2_000);
        expect(changed.map((e) => e.id)).toEqual([a.id]);
        expect(changed[0]?.deletedAt).toBe(3_000);
      });
    });

    describe("ProjectRepository", () => {
      it("speichert, lädt und sortiert alphabetisch (Groß/Klein egal)", async () => {
        const b = createProject("b" as ProjectId, "beta", 1_000);
        const a = createProject("a" as ProjectId, "Alpha", 2_000);
        await repo.projects.save(b);
        await repo.projects.save(a);

        expect(await repo.projects.get(a.id)).toEqual(a);
        expect((await repo.projects.list()).map((p) => p.name)).toEqual(["Alpha", "beta"]);
      });

      it("blendet gelöschte Projekte aus, außer auf Wunsch", async () => {
        const p = createProject("p" as ProjectId, "Weg", 1_000);
        await repo.projects.save(tombstone(p, 2_000));

        expect(await repo.projects.list()).toEqual([]);
        expect(await repo.projects.list({ includeDeleted: true })).toHaveLength(1);
        expect((await repo.projects.changedSince(1_500)).map((x) => x.id)).toEqual([p.id]);
      });
    });
  });
}

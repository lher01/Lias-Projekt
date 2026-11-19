import { beforeEach, describe, expect, it } from "vitest";
import {
  DevlogService,
  InMemoryEntryRepository,
  InMemoryProjectRepository,
  NotFoundError,
  ValidationError,
  type Clock,
  type EntryId,
  type IdGenerator,
} from "../src";

/** Steuerbare Uhr: Tests bestimmen selbst, wie spät es ist. */
class FakeClock implements Clock {
  constructor(public time = 1_000) {}
  now() {
    return this.time;
  }
  advance(ms: number) {
    this.time += ms;
  }
}

class SequentialIds implements IdGenerator {
  private n = 0;
  next() {
    return `id-${++this.n}`;
  }
}

describe("DevlogService", () => {
  let clock: FakeClock;
  let entries: InMemoryEntryRepository;
  let service: DevlogService;

  beforeEach(() => {
    clock = new FakeClock();
    entries = new InMemoryEntryRepository();
    service = new DevlogService({
      entries,
      projects: new InMemoryProjectRepository(),
      clock,
      ids: new SequentialIds(),
    });
  });

  describe("Einträge", () => {
    it("legt einen Eintrag an und liest ihn wieder", async () => {
      const created = await service.createEntry({ title: "Login gebaut", tags: ["Auth"] });
      expect(await service.getEntry(created.id)).toEqual(created);
      expect(created.tags).toEqual(["auth"]);
    });

    it("aktualisiert einen Eintrag", async () => {
      const { id } = await service.createEntry({ title: "Alt" });
      clock.advance(500);
      const updated = await service.updateEntry(id, { title: "Neu" });
      expect(updated).toMatchObject({ title: "Neu", createdAt: 1_000, updatedAt: 1_500 });
    });

    it("löscht weich: Eintrag verschwindet aus der Liste, bleibt aber als Tombstone", async () => {
      const { id } = await service.createEntry({ title: "Weg damit" });
      clock.advance(100);
      await service.deleteEntry(id);

      expect(await service.listEntries()).toEqual([]);
      await expect(service.getEntry(id)).rejects.toThrow(NotFoundError);
      expect(await entries.get(id)).toMatchObject({ deletedAt: 1_100, updatedAt: 1_100 });
    });

    it("kann gelöschte Einträge nicht bearbeiten", async () => {
      const { id } = await service.createEntry({ title: "x" });
      await service.deleteEntry(id);
      await expect(service.updateEntry(id, { title: "y" })).rejects.toThrow(NotFoundError);
    });

    it("meldet unbekannte IDs", async () => {
      await expect(service.getEntry("gibt-es-nicht" as EntryId)).rejects.toThrow(NotFoundError);
    });
  });

  describe("Suche und Filter", () => {
    beforeEach(async () => {
      await service.createEntry({ title: "React Hooks verstanden", tags: ["react"] });
      clock.advance(1_000);
      await service.createEntry({ title: "Bug im Parser", body: "Off-by-one in der Schleife", tags: ["bugfix"] });
      clock.advance(1_000);
      await service.createEntry({ title: "Tests geschrieben", learned: "Vitest ist schnell", tags: ["react", "testing"] });
    });

    it("sortiert neueste zuerst", async () => {
      const titles = (await service.listEntries()).map((e) => e.title);
      expect(titles).toEqual(["Tests geschrieben", "Bug im Parser", "React Hooks verstanden"]);
    });

    it("filtert nach Tag (Eingabe wird normalisiert)", async () => {
      const result = await service.listEntries({ tag: "#React" });
      expect(result.map((e) => e.title)).toEqual(["Tests geschrieben", "React Hooks verstanden"]);
    });

    it("durchsucht Text, Body und 'Gelernt' ohne Rücksicht auf Groß/Klein", async () => {
      expect((await service.listEntries({ text: "OFF-BY-ONE" })).map((e) => e.title)).toEqual(["Bug im Parser"]);
      expect((await service.listEntries({ text: "vitest" })).map((e) => e.title)).toEqual(["Tests geschrieben"]);
    });

    it("filtert nach Zeitraum und begrenzt die Anzahl", async () => {
      expect(await service.listEntries({ from: 2_000, to: 3_000 })).toHaveLength(1);
      expect(await service.listEntries({ limit: 2 })).toHaveLength(2);
    });
  });

  describe("Projekte", () => {
    it("ordnet Einträge einem Projekt zu und filtert danach", async () => {
      const project = await service.createProject("DevLog");
      await service.createEntry({ title: "Mit Projekt", projectId: project.id });
      await service.createEntry({ title: "Ohne Projekt" });

      const result = await service.listEntries({ projectId: project.id });
      expect(result.map((e) => e.title)).toEqual(["Mit Projekt"]);
    });

    it("lehnt doppelte Projektnamen ab (Groß/Klein egal)", async () => {
      await service.createProject("DevLog");
      await expect(service.createProject(" devlog ")).rejects.toThrow(ValidationError);
    });

    it("erlaubt Umbenennen auf den eigenen Namen in anderer Schreibweise", async () => {
      const project = await service.createProject("devlog");
      await expect(service.renameProject(project.id, "DevLog")).resolves.toMatchObject({ name: "DevLog" });
    });

    it("verhindert Zuordnung zu gelöschten Projekten", async () => {
      const project = await service.createProject("Alt");
      await service.deleteProject(project.id);

      expect(await service.listProjects()).toEqual([]);
      await expect(service.createEntry({ title: "x", projectId: project.id })).rejects.toThrow(NotFoundError);
    });
  });

  describe("Sync-Vorbereitung", () => {
    it("changedSince liefert neue, geänderte und gelöschte Einträge", async () => {
      const a = await service.createEntry({ title: "A" }); // t=1000
      const b = await service.createEntry({ title: "B" }); // t=1000
      const syncPoint = clock.now();

      clock.advance(10);
      await service.updateEntry(a.id, { title: "A2" });
      await service.deleteEntry(b.id);
      const c = await service.createEntry({ title: "C" });

      const changed = await entries.changedSince(syncPoint);
      expect(changed.map((e) => e.id).sort()).toEqual([a.id, b.id, c.id].sort());
      expect(changed.find((e) => e.id === b.id)?.deletedAt).not.toBeNull();
    });
  });
});

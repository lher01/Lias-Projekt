import { describe, expect, it } from "vitest";
import {
  createEntry,
  createProject,
  openKeyValueRepositories,
  StorageReadError,
  type EntryId,
  type KeyValueStore,
  type ProjectId,
} from "../src";
import { describeRepositoryContract } from "../src/testing/repository-contract";

/** Verhält sich wie localStorage, lebt aber nur im Test. */
class MapStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  failWrites = false;
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error("QuotaExceededError");
    this.data.set(key, value);
  }
}

// Dasselbe Verhalten wie In-Memory und SQLite:
describeRepositoryContract("Key-Value (localStorage)", () => openKeyValueRepositories(new MapStore()));

describe("Key-Value-Persistenz", () => {
  const entry = createEntry("e1" as EntryId, { title: "Bleibt erhalten", tags: ["react"] }, 1_000);
  const project = createProject("p1" as ProjectId, "DevLog", 1_000);

  it("liest nach dem erneuten Öffnen alles wieder ein (wie nach einem Neuladen)", async () => {
    const store = new MapStore();
    const first = await openKeyValueRepositories(store);
    await first.entries.save(entry);
    await first.projects.save(project);

    const second = await openKeyValueRepositories(store);
    expect(await second.entries.get(entry.id)).toEqual(entry);
    expect(await second.projects.list()).toEqual([project]);
  });

  it("startet leer, wenn noch nichts gespeichert ist", async () => {
    const repos = await openKeyValueRepositories(new MapStore());
    expect(await repos.entries.find({})).toEqual([]);
  });

  it("trennt Daten über das Präfix", async () => {
    const store = new MapStore();
    await (await openKeyValueRepositories(store, "a")).entries.save(entry);
    expect(await (await openKeyValueRepositories(store, "b")).entries.find({})).toEqual([]);
  });

  it("wirft bei kaputten Daten, statt sie zu überschreiben", async () => {
    const store = new MapStore();
    store.setItem("devlog:entries", "{kaputt");
    await expect(openKeyValueRepositories(store)).rejects.toThrow(StorageReadError);
    expect(store.getItem("devlog:entries")).toBe("{kaputt");
  });

  it("wirft bei unbekannter Formatversion", async () => {
    const store = new MapStore();
    store.setItem("devlog:entries", JSON.stringify({ version: 99, items: [] }));
    await expect(openKeyValueRepositories(store)).rejects.toThrow(/Version 99/);
  });

  it("rollt zurück, wenn das Schreiben fehlschlägt (z. B. Speicher voll)", async () => {
    const store = new MapStore();
    const repos = await openKeyValueRepositories(store);
    await repos.entries.save(entry);

    store.failWrites = true;
    const changed = { ...entry, title: "Geändert", updatedAt: 2_000 };
    const fresh = createEntry("e2" as EntryId, { title: "Neu" }, 2_000);
    await expect(repos.entries.save(changed)).rejects.toThrow("QuotaExceededError");
    await expect(repos.entries.save(fresh)).rejects.toThrow("QuotaExceededError");

    expect(await repos.entries.get(entry.id)).toEqual(entry);
    expect(await repos.entries.get(fresh.id)).toBeNull();
  });
});

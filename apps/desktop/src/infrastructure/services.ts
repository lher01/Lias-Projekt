/**
 * COMPOSITION ROOT
 *
 * Die einzige Stelle der App, die konkrete Adapter kennt. Hier wird
 * entschieden, was in die Ports "eingesteckt" wird:
 *   - in Tauri:            SQLite über das SQL-Plugin
 *   - im Browser:          localStorage (bleibt nach dem Neuladen erhalten)
 *   - im Browser + ?demo:  In-Memory mit Beispieldaten, z. B. zum Ausprobieren
 * Alle Komponenten bekommen nur den fertigen DevlogService.
 */
import {
  DevlogService,
  InMemoryEntryRepository,
  InMemoryProjectRepository,
  openKeyValueRepositories,
  systemClock,
  uuidGenerator,
  type EntryRepository,
  type ProjectRepository,
} from "@devlog/core";
import { openSqliteRepositories } from "@devlog/storage-sqlite";
import { isTauri } from "@tauri-apps/api/core";
import { seedDemoData } from "./demo-data";

export type StorageKind = "sqlite" | "browser" | "memory";

export interface AppServices {
  readonly devlog: DevlogService;
  readonly storage: StorageKind;
}

function compose(repos: { entries: EntryRepository; projects: ProjectRepository }) {
  return new DevlogService({ ...repos, clock: systemClock, ids: uuidGenerator });
}

export async function createServices(): Promise<AppServices> {
  if (isTauri()) {
    // Dynamischer Import: Der Tauri-Treiber wird im Browser gar nicht erst geladen.
    const { openTauriSqlDriver } = await import("./tauri-sql-driver");
    return { devlog: compose(await openSqliteRepositories(await openTauriSqlDriver())), storage: "sqlite" };
  }

  if (new URLSearchParams(window.location.search).has("demo")) {
    const entries = new InMemoryEntryRepository();
    const projects = new InMemoryProjectRepository();
    await seedDemoData(entries, projects);
    return { devlog: compose({ entries, projects }), storage: "memory" };
  }

  const store = browserStorage();
  if (!store) {
    // z. B. Speicher im Browser blockiert: lieber laufen als gar nicht starten.
    return {
      devlog: compose({ entries: new InMemoryEntryRepository(), projects: new InMemoryProjectRepository() }),
      storage: "memory",
    };
  }
  return { devlog: compose(await openKeyValueRepositories(store)), storage: "browser" };
}

/** localStorage, falls der Browser ihn erlaubt (in manchen privaten Fenstern wirft schon der Zugriff). */
function browserStorage(): Storage | null {
  try {
    const store = window.localStorage;
    const probe = "devlog:probe";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

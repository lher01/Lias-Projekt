/**
 * COMPOSITION ROOT
 *
 * Die einzige Stelle der App, die konkrete Adapter kennt. Hier wird
 * entschieden, was in die Ports "eingesteckt" wird:
 *   - in Tauri:      SQLite über das SQL-Plugin (Daten bleiben dauerhaft)
 *   - im Browser:    In-Memory mit Demo-Daten (zum schnellen UI-Entwickeln)
 * Alle Komponenten bekommen nur den fertigen DevlogService.
 */
import {
  DevlogService,
  InMemoryEntryRepository,
  InMemoryProjectRepository,
  systemClock,
  uuidGenerator,
} from "@devlog/core";
import { openSqliteRepositories } from "@devlog/storage-sqlite";
import { isTauri } from "@tauri-apps/api/core";
import { seedDemoData } from "./demo-data";

export type StorageKind = "sqlite" | "memory";

export interface AppServices {
  readonly devlog: DevlogService;
  readonly storage: StorageKind;
}

export async function createServices(): Promise<AppServices> {
  if (isTauri()) {
    // Dynamischer Import: Der Tauri-Treiber wird im Browser gar nicht erst geladen.
    const { openTauriSqlDriver } = await import("./tauri-sql-driver");
    const repos = await openSqliteRepositories(await openTauriSqlDriver());
    return {
      devlog: new DevlogService({ ...repos, clock: systemClock, ids: uuidGenerator }),
      storage: "sqlite",
    };
  }

  const entries = new InMemoryEntryRepository();
  const projects = new InMemoryProjectRepository();
  await seedDemoData(entries, projects);
  return {
    devlog: new DevlogService({ entries, projects, clock: systemClock, ids: uuidGenerator }),
    storage: "memory",
  };
}

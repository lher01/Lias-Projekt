import {
  createEntry,
  createProject,
  type EntryDraft,
  type EntryId,
  type EntryRepository,
  type ProjectId,
  type ProjectRepository,
} from "@devlog/core";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Beispieldaten für den Browser-Modus, damit man sofort etwas sieht. */
export async function seedDemoData(entries: EntryRepository, projects: ProjectRepository): Promise<void> {
  const now = Date.now();
  const devlog = createProject("demo-devlog" as ProjectId, "DevLog", now - 3 * DAY);
  const website = createProject("demo-website" as ProjectId, "Website", now - 10 * DAY);
  await projects.save(devlog);
  await projects.save(website);

  const drafts: [number, EntryDraft][] = [
    [
      1 * HOUR,
      {
        title: "SQLite-Adapter mit Contract-Tests abgesichert",
        projectId: devlog.id,
        tags: ["sqlite", "testing", "architektur"],
        mood: "great",
        durationMinutes: 120,
        body: "Eine Testsuite für alle Repositories geschrieben.\nIn-Memory und SQLite müssen dieselben Tests bestehen.",
        learned: "Interfaces beschreiben nur Signaturen, Contract-Tests das Verhalten.",
      },
    ],
    [
      5 * HOUR,
      {
        title: "Branded Types für IDs eingeführt",
        projectId: devlog.id,
        tags: ["typescript"],
        mood: "ok",
        durationMinutes: 45,
        body: "type EntryId = Brand<string, \"EntryId\">\n\nJetzt meckert der Compiler, wenn ich IDs verwechsle.",
      },
    ],
    [
      1 * DAY + 2 * HOUR,
      {
        title: "Monorepo aufgesetzt",
        projectId: devlog.id,
        tags: ["npm", "monorepo"],
        mood: "great",
        durationMinutes: 60,
        learned: "npm-Workspaces verlinken lokale Pakete automatisch.",
      },
    ],
    [
      3 * DAY,
      {
        title: "CSS-Grid-Layout kaputt auf dem Handy",
        projectId: website.id,
        tags: ["css", "bugfix"],
        mood: "frustrated",
        durationMinutes: 90,
        body: "minmax(0, 1fr) statt 1fr – sonst sprengt langer Text die Spalte.",
        learned: "1fr hat als Minimum 'auto', nicht 0.",
      },
    ],
  ];

  for (const [i, [ago, draft]] of drafts.entries()) {
    await entries.save(createEntry(`demo-${i}` as EntryId, draft, now - ago));
  }
}

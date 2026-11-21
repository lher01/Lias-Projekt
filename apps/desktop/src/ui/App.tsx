import {
  computeStats,
  countEntriesPerDay,
  DomainError,
  type Entry,
  type EntryDraft,
  type Project,
  type ProjectId,
} from "@devlog/core";
import { MagnifyingGlassIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppServices } from "../infrastructure/services";
import { EntryEditor } from "./EntryEditor";
import { EntryList } from "./EntryList";
import { formatShortDate, nextDay } from "./format";
import { Heatmap } from "./Heatmap";
import { useMediaQuery, useTheme } from "./hooks";
import { Sidebar } from "./Sidebar";
import { StatCards } from "./StatCards";

export interface Filter {
  projectId?: ProjectId;
  tag?: string;
  text: string;
  /** Beginn eines Kalendertags (aus der Heatmap). */
  day?: number;
}

/** Ab dieser Breite steht das Formular dauerhaft rechts (wie in DevTrack). */
const WIDE_LAYOUT = "(min-width: 1200px)";

/** "new" = neuer Eintrag, Entry = bestehender, null = nichts ausgewählt. */
type EditorState = Entry | "new" | null;

export function App({ services }: { services: AppServices }) {
  const { devlog, storage } = services;
  const { theme, setTheme } = useTheme();
  const wide = useMediaQuery(WIDE_LAYOUT);

  const [projects, setProjects] = useState<Project[]>([]);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<Filter>({ text: "" });
  const [editor, setEditor] = useState<EditorState>(null);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const showError = useCallback((e: unknown) => {
    setError(e instanceof DomainError ? e.message : `Unerwarteter Fehler: ${String(e)}`);
    if (!(e instanceof DomainError)) console.error(e);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      devlog.listProjects(),
      devlog.listEntries(),
      devlog.listEntries({
        ...(filter.projectId && { projectId: filter.projectId }),
        ...(filter.tag && { tag: filter.tag }),
        ...(filter.day !== undefined && { from: filter.day, to: nextDay(filter.day) }),
        text: filter.text,
      }),
    ])
      .then(([p, all, filtered]) => {
        if (cancelled) return;
        setProjects(p);
        setAllEntries(all);
        setEntries(filtered);
      })
      .catch(showError);
    return () => {
      cancelled = true;
    };
  }, [devlog, filter, version, showError]);

  const stats = useMemo(() => computeStats(allEntries, Date.now()), [allEntries]);
  const perDay = useMemo(() => countEntriesPerDay(allEntries), [allEntries]);
  const projectNames = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of allEntries) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [allEntries]);

  // Ein Aufruf in die Application-Schicht, danach neu laden. Fehler landen im Banner.
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
        setError(null);
        reload();
        return true;
      } catch (e) {
        showError(e);
        return false;
      }
    },
    [reload, showError],
  );

  function closeEditor() {
    setEditor(null);
    setFormKey((k) => k + 1); // leeres Formular für den nächsten Eintrag
  }

  async function saveEntry(draft: EntryDraft): Promise<void> {
    // Fehler hier nicht abfangen: Das Formular zeigt sie direkt an.
    if (editor && editor !== "new") await devlog.updateEntry(editor.id, draft);
    else await devlog.createEntry(draft);
    closeEditor();
    setError(null);
    reload();
  }

  function deleteEntry(entry: Entry) {
    if (!window.confirm(`Eintrag "${entry.title}" löschen?`)) return;
    void run(() => devlog.deleteEntry(entry.id)).then((ok) => {
      if (ok && editor !== "new" && editor?.id === entry.id) closeEditor();
    });
  }

  const editing = editor !== null && editor !== "new" ? editor : null;
  const panelVisible = wide || editor !== null;

  return (
    <div className={`layout${panelVisible ? " layout--panel" : ""}`}>
      <Sidebar
        storage={storage}
        theme={theme}
        onThemeChange={setTheme}
        projects={projects}
        tags={tagCounts}
        totalEntries={allEntries.length}
        filter={filter}
        onFilter={setFilter}
        onCreateProject={(name) => run(() => devlog.createProject(name))}
        onDeleteProject={(project) => {
          if (!window.confirm(`Projekt "${project.name}" löschen? Die Einträge bleiben erhalten.`)) return;
          if (filter.projectId === project.id) setFilter({ ...filter, projectId: undefined });
          void run(() => devlog.deleteProject(project.id));
        }}
      />

      <main className="main">
        <header className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <label className="search">
            <MagnifyingGlassIcon size={18} />
            <input
              type="search"
              placeholder="Einträge durchsuchen …"
              title="Durchsucht Titel, Notizen, „Heute gelernt“ und Tags"
              value={filter.text}
              onChange={(e) => setFilter({ ...filter, text: e.target.value })}
            />
          </label>
          {!wide && (
            <button className="btn btn--primary" onClick={() => setEditor("new")}>
              <PlusIcon size={18} weight="bold" /> Neuer Eintrag
            </button>
          )}
        </header>

        {error && (
          <div className="alert" role="alert">
            <span>{error}</span>
            <button className="icon-btn" onClick={() => setError(null)} aria-label="Meldung schließen">
              <XIcon size={16} />
            </button>
          </div>
        )}

        <StatCards stats={stats} />

        <Heatmap
          perDay={perDay}
          selectedDay={filter.day}
          onSelectDay={(day) => setFilter({ ...filter, day })}
        />

        <section className="entries-section">
          <div className="section-head">
            <h2 className="section-title">Aktuelle Einträge</h2>
            <ActiveFilters filter={filter} projectNames={projectNames} onFilter={setFilter} />
          </div>
          <EntryList
            entries={entries}
            projectNames={projectNames}
            selectedId={editing?.id ?? null}
            hasFilter={Boolean(filter.projectId || filter.tag || filter.day !== undefined || filter.text.trim())}
            onSelect={setEditor}
            onDelete={deleteEntry}
            onTagClick={(tag) => setFilter({ ...filter, tag })}
          />
        </section>
      </main>

      {panelVisible && (
        <EntryEditor
          // key sorgt dafür, dass das Formular beim Wechsel des Eintrags neu startet.
          key={editing ? editing.id : `new-${formKey}`}
          entry={editing}
          overlay={!wide}
          projects={projects}
          defaultProjectId={filter.projectId ?? null}
          onSave={saveEntry}
          onCancel={closeEditor}
          onDelete={editing ? () => deleteEntry(editing) : undefined}
        />
      )}
    </div>
  );
}

function ActiveFilters({
  filter,
  projectNames,
  onFilter,
}: {
  filter: Filter;
  projectNames: Map<ProjectId, string>;
  onFilter: (f: Filter) => void;
}) {
  const chips: { label: string; clear: Partial<Filter> }[] = [];
  if (filter.projectId) chips.push({ label: projectNames.get(filter.projectId) ?? "Projekt", clear: { projectId: undefined } });
  if (filter.tag) chips.push({ label: `#${filter.tag}`, clear: { tag: undefined } });
  if (filter.day !== undefined) chips.push({ label: formatShortDate(filter.day), clear: { day: undefined } });
  if (chips.length === 0) return null;

  return (
    <div className="active-filters">
      {chips.map((chip) => (
        <button key={chip.label} className="filter-chip" onClick={() => onFilter({ ...filter, ...chip.clear })}>
          {chip.label} <XIcon size={12} weight="bold" />
        </button>
      ))}
    </div>
  );
}

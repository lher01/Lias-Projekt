import type { Entry, EntryDraft, Project, ProjectId } from "@devlog/core";
import { DomainError } from "@devlog/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppServices } from "../infrastructure/services";
import { EntryEditor } from "./EntryEditor";
import { EntryList } from "./EntryList";
import { Sidebar } from "./Sidebar";

export interface Filter {
  projectId?: ProjectId;
  tag?: string;
  text: string;
}

/** "new" = neuer Eintrag, Entry = bestehender, null = Editor geschlossen. */
type EditorState = Entry | "new" | null;

export function App({ services }: { services: AppServices }) {
  const { devlog, storage } = services;

  const [projects, setProjects] = useState<Project[]>([]);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<Filter>({ text: "" });
  const [editor, setEditor] = useState<EditorState>(null);
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

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of allEntries) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [allEntries]);

  const projectNames = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

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

  async function saveEntry(draft: EntryDraft): Promise<void> {
    const current = editor;
    // Fehler hier nicht abfangen: Der Editor zeigt sie direkt am Formular an.
    if (current === "new") await devlog.createEntry(draft);
    else if (current) await devlog.updateEntry(current.id, draft);
    setEditor(null);
    setError(null);
    reload();
  }

  return (
    <div className={`layout${editor ? " layout--editing" : ""}`}>
      <Sidebar
        storage={storage}
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
        <header className="toolbar">
          <input
            className="search"
            type="search"
            placeholder="Suchen …"
            title="Durchsucht Titel, Notizen, „Heute gelernt“ und Tags"
            value={filter.text}
            onChange={(e) => setFilter({ ...filter, text: e.target.value })}
          />
          <button className="button button--primary" onClick={() => setEditor("new")}>
            + Neuer Eintrag
          </button>
        </header>

        {error && (
          <div className="banner banner--error" role="alert">
            {error}
            <button className="banner__close" onClick={() => setError(null)} aria-label="Schließen">
              ×
            </button>
          </div>
        )}

        <ActiveFilters filter={filter} projectNames={projectNames} onFilter={setFilter} />

        <EntryList
          entries={entries}
          projectNames={projectNames}
          selectedId={editor && editor !== "new" ? editor.id : null}
          hasFilter={Boolean(filter.projectId || filter.tag || filter.text.trim())}
          onSelect={setEditor}
          onTagClick={(tag) => setFilter({ ...filter, tag })}
          onCreate={() => setEditor("new")}
        />
      </main>

      {editor && (
        <EntryEditor
          // key sorgt dafür, dass das Formular beim Wechsel des Eintrags neu startet.
          key={editor === "new" ? "new" : editor.id}
          entry={editor === "new" ? null : editor}
          projects={projects}
          defaultProjectId={filter.projectId ?? null}
          onSave={saveEntry}
          onCancel={() => setEditor(null)}
          onDelete={
            editor === "new"
              ? undefined
              : () => {
                  if (!window.confirm(`Eintrag "${editor.title}" löschen?`)) return;
                  void run(() => devlog.deleteEntry(editor.id)).then((ok) => ok && setEditor(null));
                }
          }
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
  if (!filter.projectId && !filter.tag) return null;
  return (
    <div className="active-filters">
      {filter.projectId && (
        <button className="chip chip--active" onClick={() => onFilter({ ...filter, projectId: undefined })}>
          Projekt: {projectNames.get(filter.projectId) ?? "?"} ×
        </button>
      )}
      {filter.tag && (
        <button className="chip chip--active" onClick={() => onFilter({ ...filter, tag: undefined })}>
          #{filter.tag} ×
        </button>
      )}
    </div>
  );
}

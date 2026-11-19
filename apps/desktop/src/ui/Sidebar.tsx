import type { Project } from "@devlog/core";
import { useState, type FormEvent } from "react";
import type { StorageKind } from "../infrastructure/services";
import type { Filter } from "./App";

interface Props {
  storage: StorageKind;
  projects: Project[];
  tags: [string, number][];
  totalEntries: number;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  onCreateProject: (name: string) => Promise<boolean>;
  onDeleteProject: (project: Project) => void;
}

export function Sidebar({ storage, projects, tags, totalEntries, filter, onFilter, onCreateProject, onDeleteProject }: Props) {
  const [newProject, setNewProject] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!newProject.trim()) return;
    if (await onCreateProject(newProject)) setNewProject("");
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand__logo" aria-hidden>
          {"{ }"}
        </span>
        <span className="brand__name">DevLog</span>
      </div>

      <div
        className={`storage storage--${storage}`}
        title={storage === "memory" ? "Im Browser gestartet: Änderungen gehen beim Neuladen verloren." : undefined}
      >
        {storage === "sqlite" ? "● Lokal gespeichert (SQLite)" : "● Demo-Modus – nur im Speicher"}
      </div>

      <nav className="nav">
        <button
          className={`nav__item${!filter.projectId ? " nav__item--active" : ""}`}
          onClick={() => onFilter({ ...filter, projectId: undefined })}
        >
          <span>Alle Einträge</span>
          <span className="nav__count">{totalEntries}</span>
        </button>
      </nav>

      <section className="sidebar__section">
        <h2 className="sidebar__heading">Projekte</h2>
        <ul className="project-list">
          {projects.map((p) => (
            <li key={p.id} className="project-list__row">
              <button
                className={`nav__item${filter.projectId === p.id ? " nav__item--active" : ""}`}
                onClick={() => onFilter({ ...filter, projectId: p.id })}
              >
                <span className="truncate">{p.name}</span>
              </button>
              <button className="icon-button" onClick={() => onDeleteProject(p)} aria-label={`Projekt ${p.name} löschen`}>
                ×
              </button>
            </li>
          ))}
        </ul>
        <form className="inline-form" onSubmit={submit}>
          <input
            className="input input--small"
            placeholder="Neues Projekt …"
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
          />
        </form>
      </section>

      {tags.length > 0 && (
        <section className="sidebar__section">
          <h2 className="sidebar__heading">Tags</h2>
          <div className="tag-cloud">
            {tags.map(([tag, count]) => (
              <button
                key={tag}
                className={`chip${filter.tag === tag ? " chip--active" : ""}`}
                onClick={() => onFilter({ ...filter, tag: filter.tag === tag ? undefined : tag })}
              >
                #{tag} <span className="chip__count">{count}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}

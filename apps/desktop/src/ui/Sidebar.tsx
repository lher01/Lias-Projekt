import type { Project } from "@devlog/core";
import {
  DatabaseIcon,
  FolderSimpleIcon,
  ListBulletsIcon,
  MoonIcon,
  NotePencilIcon,
  PlusIcon,
  SunIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import type { StorageKind } from "../infrastructure/services";
import type { Filter } from "./App";
import type { Theme } from "./hooks";

const STORAGE_LABELS: Record<StorageKind, { label: string; hint: string }> = {
  sqlite: { label: "Lokal gespeichert", hint: "Daten liegen in einer SQLite-Datei auf diesem PC." },
  browser: {
    label: "Im Browser gespeichert",
    hint: "Daten liegen im Speicher dieses Browsers. Ein anderer Browser oder das Löschen der Website-Daten sieht sie nicht.",
  },
  memory: { label: "Nicht gespeichert", hint: "Demo-Modus: Änderungen gehen beim Neuladen verloren." },
};

export interface NavigationProps {
  storage: StorageKind;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  projects: Project[];
  tags: [string, number][];
  totalEntries: number;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  onCreateProject: (name: string) => Promise<boolean>;
  onDeleteProject: (project: Project) => void;
}

/** Seitenleiste für breite Fenster. Der Inhalt wird mit dem Burger-Menü geteilt. */
export function Sidebar(props: NavigationProps) {
  return (
    <aside className="sidebar">
      <Brand />
      <NavigationContent {...props} />
    </aside>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <span className="brand__logo">
        <NotePencilIcon size={20} weight="bold" />
      </span>
      <span className="brand__name">DevLog</span>
    </div>
  );
}

/**
 * Navigation, Projekte, Skills, Status und Theme-Schalter.
 * Eine Komponente für zwei Orte (Seitenleiste und Burger-Menü):
 * Änderungen müssen so nur an einer Stelle passieren.
 */
export function NavigationContent(props: NavigationProps) {
  const { storage, theme, onThemeChange, projects, tags, totalEntries, filter, onFilter } = props;
  const [newProject, setNewProject] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!newProject.trim()) return;
    if (await props.onCreateProject(newProject)) setNewProject("");
  }

  const isDark = theme === "dark";

  return (
    <div className="navigation">
      <div className="navigation__top">
        <nav className="nav">
          <button
            className={`nav-link${!filter.projectId ? " nav-link--active" : ""}`}
            onClick={() => onFilter({ ...filter, projectId: undefined })}
          >
            <ListBulletsIcon size={18} />
            <span className="nav-link__label">Alle Einträge</span>
            <span className="nav-link__count">{totalEntries}</span>
          </button>
        </nav>

        <section className="sidebar__section">
          <h2 className="sidebar__heading">Projekte</h2>
          <ul className="nav">
            {projects.map((p) => (
              <li key={p.id} className="nav-row">
                <button
                  className={`nav-link${filter.projectId === p.id ? " nav-link--active" : ""}`}
                  onClick={() => onFilter({ ...filter, projectId: p.id })}
                >
                  <FolderSimpleIcon size={18} />
                  <span className="nav-link__label">{p.name}</span>
                </button>
                <button
                  className="icon-btn nav-row__delete"
                  onClick={() => props.onDeleteProject(p)}
                  aria-label={`Projekt ${p.name} löschen`}
                >
                  <XIcon size={14} />
                </button>
              </li>
            ))}
          </ul>
          <form className="add-project" onSubmit={submit}>
            <PlusIcon size={16} />
            <input
              placeholder="Neues Projekt"
              aria-label="Neues Projekt"
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
            />
          </form>
        </section>

        {tags.length > 0 && (
          <section className="sidebar__section">
            <h2 className="sidebar__heading">Skills</h2>
            <div className="tag-cloud">
              {tags.map(([tag, count]) => (
                <button
                  key={tag}
                  className={`pill pill--blue pill--button${filter.tag === tag ? " pill--active" : ""}`}
                  onClick={() => onFilter({ ...filter, tag: filter.tag === tag ? undefined : tag })}
                >
                  {tag} <span className="pill__count">{count}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="navigation__bottom">
        <div
          className={`storage-status storage-status--${storage}`}
          title={STORAGE_LABELS[storage].hint}
        >
          <DatabaseIcon size={18} />
          <span>{STORAGE_LABELS[storage].label}</span>
        </div>
        <div className="switch-row">
          {isDark ? <MoonIcon size={18} /> : <SunIcon size={18} />}
          <span>Dark Mode</span>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label="Dark Mode"
            className="switch"
            onClick={() => onThemeChange(isDark ? "light" : "dark")}
          >
            <span className="switch__thumb" />
          </button>
        </div>
      </div>
    </div>
  );
}

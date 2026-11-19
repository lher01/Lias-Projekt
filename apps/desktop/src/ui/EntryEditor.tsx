import { DomainError, MOODS, type Entry, type EntryDraft, type Mood, type Project, type ProjectId } from "@devlog/core";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { formatDayHeading, formatTime, MOOD_LABELS } from "./format";

interface Props {
  entry: Entry | null;
  projects: Project[];
  defaultProjectId: ProjectId | null;
  onSave: (draft: EntryDraft) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}

/**
 * Das Formular hält bewusst nur Strings. Erst beim Speichern wird daraus ein
 * EntryDraft. Die eigentliche Validierung macht der Core: Die UI zeigt nur
 * dessen Fehlermeldung an, statt die Regeln doppelt zu implementieren.
 */
export function EntryEditor({ entry, projects, defaultProjectId, onSave, onCancel, onDelete }: Props) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [projectId, setProjectId] = useState<string>(entry?.projectId ?? defaultProjectId ?? "");
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const [mood, setMood] = useState<Mood | null>(entry?.mood ?? null);
  const [duration, setDuration] = useState(entry?.durationMinutes?.toString() ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [learned, setLearned] = useState(entry?.learned ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => titleRef.current?.focus(), []);

  // Projekt existiert evtl. nicht mehr (gelöscht) – dann trotzdem als Option anzeigen.
  const projectMissing = projectId !== "" && !projects.some((p) => p.id === projectId);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title,
        projectId: projectId === "" ? null : (projectId as ProjectId),
        tags: tags.split(/[,\s]+/).filter(Boolean),
        mood,
        durationMinutes: duration.trim() === "" ? null : Number(duration),
        body,
        learned,
      });
    } catch (err) {
      setError(err instanceof DomainError ? err.message : `Speichern fehlgeschlagen: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void submit();
  }

  return (
    <aside className="editor" onKeyDown={onKeyDown} aria-label="Eintrag bearbeiten">
      <form className="editor__form" onSubmit={submit}>
        <header className="editor__header">
          <h2>{entry ? "Eintrag bearbeiten" : "Neuer Eintrag"}</h2>
          {entry && (
            <span className="editor__date">
              {formatDayHeading(entry.createdAt)}, {formatTime(entry.createdAt)}
            </span>
          )}
        </header>

        {error && (
          <div className="banner banner--error" role="alert">
            {error}
          </div>
        )}

        <label className="field">
          <span className="field__label">Titel</span>
          <input
            ref={titleRef}
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Woran hast du gearbeitet?"
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field__label">Projekt</span>
            <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— kein Projekt —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              {projectMissing && <option value={projectId}>Gelöschtes Projekt</option>}
            </select>
          </label>
          <label className="field field--narrow">
            <span className="field__label">Dauer (min)</span>
            <input
              className="input"
              type="number"
              min={0}
              max={1440}
              step={5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
            />
          </label>
        </div>

        <div className="field">
          <span className="field__label">Wie lief es?</span>
          <div className="mood-picker" role="radiogroup" aria-label="Stimmung">
            {MOODS.map((m) => (
              <button
                type="button"
                key={m}
                role="radio"
                aria-checked={mood === m}
                className={`mood${mood === m ? " mood--active" : ""}`}
                onClick={() => setMood(mood === m ? null : m)}
              >
                <span aria-hidden>{MOOD_LABELS[m].emoji}</span> {MOOD_LABELS[m].label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field__label">Tags</span>
          <input
            className="input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="typescript, bugfix, react"
          />
        </label>

        <label className="field field--grow">
          <span className="field__label">Notizen (Markdown)</span>
          <textarea
            className="input input--code"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"Was hast du gemacht? Code-Schnipsel gern mit ```"}
          />
        </label>

        <label className="field">
          <span className="field__label">💡 Heute gelernt</span>
          <textarea
            className="input input--short"
            value={learned}
            onChange={(e) => setLearned(e.target.value)}
            placeholder="Eine Sache, die du mitnimmst"
          />
        </label>

        <footer className="editor__footer">
          {onDelete && (
            <button type="button" className="button button--danger" onClick={onDelete}>
              Löschen
            </button>
          )}
          <span className="editor__hint">Strg + Enter speichert</span>
          <button type="button" className="button" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="submit" className="button button--primary" disabled={saving}>
            {saving ? "Speichert …" : "Speichern"}
          </button>
        </footer>
      </form>
    </aside>
  );
}

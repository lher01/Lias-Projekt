import { DomainError, MOODS, type Entry, type EntryDraft, type Mood, type Project, type ProjectId } from "@devlog/core";
import { CaretDownIcon, LightbulbIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { formatDayHeading, formatTime, MOOD_LABELS } from "./format";
import { MoodIcon } from "./icons";

interface Props {
  entry: Entry | null;
  /** true = schmales Fenster: Panel liegt über dem Inhalt und kann geschlossen werden. */
  overlay: boolean;
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
export function EntryEditor({ entry, overlay, projects, defaultProjectId, onSave, onCancel, onDelete }: Props) {
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

  // Fokus nur, wenn das Panel bewusst geöffnet wurde (nicht beim dauerhaft sichtbaren Formular).
  useEffect(() => {
    if (entry || overlay) titleRef.current?.focus();
  }, [entry, overlay]);

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
      setSaving(false);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void submit();
  }

  const showClose = overlay || entry !== null;

  return (
    <aside className={`editor${overlay ? " editor--overlay" : ""}`} onKeyDown={onKeyDown} aria-label="Eintrag">
      <form className="panel editor__card" onSubmit={submit}>
        <header className="editor__header">
          <div>
            <h2 className="panel__title">{entry ? "Eintrag bearbeiten" : "Was hast du heute programmiert?"}</h2>
            {entry && (
              <p className="muted">
                {formatDayHeading(entry.createdAt)}, {formatTime(entry.createdAt)}
              </p>
            )}
          </div>
          {showClose && (
            <button type="button" className="icon-btn icon-btn--round" onClick={onCancel} aria-label="Schließen">
              <XIcon size={16} />
            </button>
          )}
        </header>

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        <input
          ref={titleRef}
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel – woran hast du gearbeitet?"
          aria-label="Titel"
        />

        <textarea
          className="field field--area field--code"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"Notizen (Markdown) – Code-Schnipsel gern mit ```"}
          aria-label="Notizen"
        />

        <div className="field-with-icon">
          <LightbulbIcon size={18} />
          <textarea
            className="field field--area field--short"
            value={learned}
            onChange={(e) => setLearned(e.target.value)}
            placeholder="Heute gelernt …"
            aria-label="Heute gelernt"
          />
        </div>

        <div className="select-wrap">
          <select
            className="field"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            aria-label="Projekt"
          >
            <option value="">Kein Projekt</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            {projectMissing && <option value={projectId}>Gelöschtes Projekt</option>}
          </select>
          <CaretDownIcon size={16} />
        </div>

        <div className="field-row">
          <input
            className="field"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Skills: react, css …"
            aria-label="Skills (Tags)"
          />
          <input
            className="field field--narrow"
            type="number"
            min={0}
            max={1440}
            step={5}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Minuten"
            aria-label="Dauer in Minuten"
          />
        </div>

        <div className="mood-picker" role="radiogroup" aria-label="Wie lief es?">
          {MOODS.map((m) => (
            <button
              type="button"
              key={m}
              role="radio"
              aria-checked={mood === m}
              className={`mood-option${mood === m ? " mood-option--active" : ""}`}
              onClick={() => setMood(mood === m ? null : m)}
              title={MOOD_LABELS[m].label}
            >
              <MoodIcon mood={m} size={20} weight={mood === m ? "fill" : "regular"} />
              <span>{MOOD_LABELS[m].label}</span>
            </button>
          ))}
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
          {saving ? "Speichert …" : "Eintrag speichern"}
        </button>

        <footer className="editor__footer">
          <span className="muted">Strg + Enter speichert</span>
          {onDelete && (
            <button type="button" className="btn btn--danger-soft" onClick={onDelete}>
              <TrashIcon size={16} /> Löschen
            </button>
          )}
        </footer>
      </form>
    </aside>
  );
}

import type { Entry, ProjectId } from "@devlog/core";
import { dayKey, excerpt, formatDayHeading, formatDuration, formatTime, MOOD_LABELS } from "./format";

interface Props {
  entries: Entry[];
  projectNames: Map<ProjectId, string>;
  selectedId: string | null;
  hasFilter: boolean;
  onSelect: (entry: Entry) => void;
  onTagClick: (tag: string) => void;
  onCreate: () => void;
}

export function EntryList({ entries, projectNames, selectedId, hasFilter, onSelect, onTagClick, onCreate }: Props) {
  if (entries.length === 0) {
    return (
      <div className="empty">
        {hasFilter ? (
          <p>Keine Einträge für diesen Filter.</p>
        ) : (
          <>
            <p>Noch keine Einträge. Was hast du heute programmiert?</p>
            <button className="button button--primary" onClick={onCreate}>
              Ersten Eintrag schreiben
            </button>
          </>
        )}
      </div>
    );
  }

  // Einträge kommen schon sortiert (neueste zuerst) – hier nur nach Tag gruppieren.
  const groups: { key: number; entries: Entry[] }[] = [];
  for (const entry of entries) {
    const key = dayKey(entry.createdAt);
    const last = groups.at(-1);
    if (last?.key === key) last.entries.push(entry);
    else groups.push({ key, entries: [entry] });
  }

  return (
    <div className="entry-list">
      {groups.map((group) => (
        <section key={group.key} className="day">
          <h2 className="day__heading">{formatDayHeading(group.key)}</h2>
          {group.entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              projectName={entry.projectId ? (projectNames.get(entry.projectId) ?? "Gelöschtes Projekt") : null}
              selected={entry.id === selectedId}
              onSelect={() => onSelect(entry)}
              onTagClick={onTagClick}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function EntryCard({
  entry,
  projectName,
  selected,
  onSelect,
  onTagClick,
}: {
  entry: Entry;
  projectName: string | null;
  selected: boolean;
  onSelect: () => void;
  onTagClick: (tag: string) => void;
}) {
  const preview = excerpt(entry.body);
  return (
    <article
      className={`card${selected ? " card--selected" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect())}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
    >
      <div className="card__meta">
        <time>{formatTime(entry.createdAt)}</time>
        {projectName && <span className="card__project">{projectName}</span>}
        {entry.durationMinutes !== null && <span>⏱ {formatDuration(entry.durationMinutes)}</span>}
        {entry.mood && (
          <span className="card__mood" title={MOOD_LABELS[entry.mood].label}>
            {MOOD_LABELS[entry.mood].emoji}
          </span>
        )}
      </div>
      <h3 className="card__title">{entry.title}</h3>
      {preview && <p className="card__body">{preview}</p>}
      {entry.learned && <p className="card__learned">💡 {entry.learned}</p>}
      {entry.tags.length > 0 && (
        <div className="card__tags">
          {entry.tags.map((tag) => (
            <button
              key={tag}
              className="chip chip--small"
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag);
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

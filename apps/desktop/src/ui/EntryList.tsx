import type { Entry, ProjectId } from "@devlog/core";
import { LightbulbIcon, TimerIcon, TrashIcon } from "@phosphor-icons/react";
import { dayKey, excerpt, formatDayHeading, formatDuration, formatTime } from "./format";
import { MoodIcon } from "./icons";

interface Props {
  entries: Entry[];
  projectNames: Map<ProjectId, string>;
  selectedId: string | null;
  hasFilter: boolean;
  onSelect: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onTagClick: (tag: string) => void;
}

export function EntryList({ entries, projectNames, selectedId, hasFilter, onSelect, onDelete, onTagClick }: Props) {
  if (entries.length === 0) {
    return (
      <div className="panel empty">
        {hasFilter ? "Keine Einträge für diesen Filter." : "Noch keine Einträge. Was hast du heute programmiert?"}
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
          <h3 className="day__heading">{formatDayHeading(group.key)}</h3>
          {group.entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              projectName={entry.projectId ? (projectNames.get(entry.projectId) ?? "Gelöschtes Projekt") : null}
              selected={entry.id === selectedId}
              onSelect={() => onSelect(entry)}
              onDelete={() => onDelete(entry)}
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
  onDelete,
  onTagClick,
}: {
  entry: Entry;
  projectName: string | null;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTagClick: (tag: string) => void;
}) {
  const preview = excerpt(entry.body);
  return (
    <article
      className={`panel card${selected ? " card--selected" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
    >
      <div className="card__content">
        <h4 className="card__title">{entry.title}</h4>
        {preview && <p className="card__body">{preview}</p>}
        {entry.learned && (
          <p className="card__learned">
            <LightbulbIcon size={16} weight="fill" />
            <span>{entry.learned}</span>
          </p>
        )}
        <div className="card__meta">
          {projectName && <span className="pill pill--purple">{projectName}</span>}
          {entry.tags.map((tag) => (
            <button
              key={tag}
              className="pill pill--blue pill--button"
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag);
              }}
            >
              {tag}
            </button>
          ))}
          <span className="card__time">{formatTime(entry.createdAt)}</span>
          {entry.durationMinutes !== null && (
            <span className="card__time">
              <TimerIcon size={14} /> {formatDuration(entry.durationMinutes)}
            </span>
          )}
        </div>
      </div>
      <div className="card__side">
        {entry.mood && <MoodIcon mood={entry.mood} size={22} />}
        <button
          className="icon-btn icon-btn--danger card__delete"
          title="Eintrag löschen"
          aria-label={`Eintrag ${entry.title} löschen`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <TrashIcon size={18} />
        </button>
      </div>
    </article>
  );
}

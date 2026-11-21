import type { DevlogStats } from "@devlog/core";
import { FireIcon, MedalIcon, NotebookIcon, TimerIcon, type Icon } from "@phosphor-icons/react";
import { formatHours } from "./format";

export function StatCards({ stats }: { stats: DevlogStats }) {
  const cards: { label: string; value: string; icon: Icon }[] = [
    { label: "Einträge", value: String(stats.entries), icon: NotebookIcon },
    { label: "Skills", value: String(stats.skills), icon: MedalIcon },
    { label: "Zeit investiert", value: formatHours(stats.totalMinutes), icon: TimerIcon },
    { label: "Serie", value: `${stats.streakDays} ${stats.streakDays === 1 ? "Tag" : "Tage"}`, icon: FireIcon },
  ];
  return (
    <div className="stats">
      {cards.map(({ label, value, icon: Icon }) => (
        <div key={label} className="panel stat">
          <div className="stat__head">
            <span>{label}</span>
            <Icon size={18} />
          </div>
          <div className="stat__value">{value}</div>
        </div>
      ))}
    </div>
  );
}

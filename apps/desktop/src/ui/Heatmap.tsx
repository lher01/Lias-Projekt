import { localDayKey } from "@devlog/core";
import { useMemo, type CSSProperties } from "react";
import { formatShortDate } from "./format";

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

interface Props {
  perDay: Map<string, number>;
  selectedDay: number | undefined;
  onSelectDay: (dayStart: number | undefined) => void;
}

/** Aktivität des laufenden Jahres, eine Spalte pro Woche (Montag oben). Klick auf einen Tag filtert. */
export function Heatmap({ perDay, selectedDay, onSelectDay }: Props) {
  const year = new Date().getFullYear();
  const todayKey = localDayKey(Date.now());

  const { offset, days, months } = useMemo(() => {
    const first = new Date(year, 0, 1);
    const offset = (first.getDay() + 6) % 7; // Leere Felder bis zum ersten Montag
    const days: number[] = [];
    const months: { name: string; column: number }[] = [];
    for (const d = new Date(first); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
      if (d.getDate() === 1) {
        months.push({ name: MONTHS[d.getMonth()]!, column: Math.floor((offset + days.length) / 7) + 1 });
      }
      days.push(d.getTime());
    }
    return { offset, days, months };
  }, [year]);

  const weeks = Math.ceil((offset + days.length) / 7);
  const total = days.reduce((sum, ts) => sum + (perDay.get(localDayKey(ts)) ?? 0), 0);

  return (
    <section className="panel heatmap-panel">
      <header className="panel__head">
        <h2 className="panel__title">Aktivitäts-Heatmap</h2>
        <span className="muted">
          {total} {total === 1 ? "Eintrag" : "Einträge"} in {year}
        </span>
      </header>

      <div className="heatmap-scroll">
        <div className="heatmap" style={{ "--weeks": weeks } as CSSProperties}>
          <div className="heatmap__months" aria-hidden>
            {months.map((m) => (
              <span key={m.name} style={{ gridColumn: m.column }}>
                {m.name}
              </span>
            ))}
          </div>
          <div className="heatmap__weekdays" aria-hidden>
            <span style={{ gridRow: 1 }}>Mo</span>
            <span style={{ gridRow: 3 }}>Mi</span>
            <span style={{ gridRow: 5 }}>Fr</span>
          </div>
          <div className="heatmap__grid">
            {Array.from({ length: offset }, (_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {days.map((ts) => {
              const key = localDayKey(ts);
              const count = perDay.get(key) ?? 0;
              const label = `${count === 0 ? "Keine" : count} ${count === 1 ? "Eintrag" : "Einträge"} am ${formatShortDate(ts)}`;
              return (
                <button
                  key={ts}
                  type="button"
                  className="heatmap__cell"
                  data-level={Math.min(count, 4)}
                  data-today={key === todayKey || undefined}
                  aria-pressed={selectedDay === ts}
                  aria-label={label}
                  title={label}
                  onClick={() => onSelectDay(selectedDay === ts ? undefined : ts)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <footer className="heatmap__legend">
        <span>Klick auf einen Tag filtert die Einträge</span>
        <span className="heatmap__scale">
          Weniger
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className="heatmap__cell heatmap__cell--static" data-level={level} />
          ))}
          Mehr
        </span>
      </footer>
    </section>
  );
}

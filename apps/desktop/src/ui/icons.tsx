import type { Mood } from "@devlog/core";
import { SmileyAngryIcon, SmileyIcon, SmileyMehIcon, type IconProps } from "@phosphor-icons/react";
import { MOOD_LABELS } from "./format";

const MOOD_ICONS = { great: SmileyIcon, ok: SmileyMehIcon, frustrated: SmileyAngryIcon } as const;

/** Stimmungs-Icon in der passenden Farbe (grün / gelb / rot). */
export function MoodIcon({ mood, ...props }: { mood: Mood } & IconProps) {
  const Icon = MOOD_ICONS[mood];
  return <Icon className={`mood-icon mood-icon--${mood}`} aria-label={MOOD_LABELS[mood].label} {...props} />;
}

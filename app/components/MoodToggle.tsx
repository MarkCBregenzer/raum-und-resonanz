"use client";

/* Atmosphären-Schalter
   Echter Besucher-Umschalter zwischen "Licht" und "Geborgen".
   Der Wert wird vom Parent geführt; dieser Component ist rein präsentational.
   Persistenz in localStorage passiert im Parent (siehe app/page.tsx). */

export type Mood = "licht" | "geborgen";

type MoodToggleProps = {
  mood: Mood;
  setMood: (m: Mood) => void;
  className?: string;
};

const OPTS: { value: Mood; label: string }[] = [
  { value: "licht", label: "Licht" },
  { value: "geborgen", label: "Geborgen" },
];

export function MoodToggle({ mood, setMood, className = "" }: MoodToggleProps) {
  return (
    <div
      className={"mood-switch " + className}
      role="radiogroup"
      aria-label="Atmosphäre der Seite wählen"
    >
      {OPTS.map((o) => (
        <button
          key={o.value}
          type="button"
          className={"mood-opt" + (mood === o.value ? " active" : "")}
          role="radio"
          aria-checked={mood === o.value}
          onClick={() => setMood(o.value)}
        >
          <span className={"mood-dot " + o.value} aria-hidden="true"></span>
          {o.label}
        </button>
      ))}
    </div>
  );
}

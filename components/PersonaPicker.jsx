import { PERSONAS } from "../lib/personas.js";

/**
 * One-click sample households, so anyone can try the assistant without typing.
 * @param {{ onPick: (persona: (typeof PERSONAS)[number]) => void, disabled?: boolean }} props
 */
export default function PersonaPicker({ onPick, disabled }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {PERSONAS.map((persona) => (
        <li key={persona.id}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(persona)}
            className="h-full w-full rounded-lg border border-line bg-surface p-4 text-left hover:border-teal-mid disabled:opacity-60"
          >
            <span className="block font-bold text-ink">{persona.name}</span>
            <span className="mt-1 block text-sm text-ink-soft">{persona.blurb}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

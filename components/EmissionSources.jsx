import { EMISSION_SOURCES } from "../lib/constants.js";

/** The footnote that says where the CO₂ figures come from, with links to the sources. */
export default function EmissionSources() {
  return (
    <p className="max-w-prose text-sm text-ink-soft">
      CO₂ figures are estimates from average Indian emission factors (WRI India):{" "}
      {EMISSION_SOURCES.map((source, i) => (
        <span key={source.url}>
          {i > 0 && "; "}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-teal underline"
          >
            {source.label}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </span>
      ))}
      .
    </p>
  );
}

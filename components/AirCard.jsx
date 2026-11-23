import { formatClock } from "../lib/time.js";
import { Badge, Notice, Panel } from "./ui.jsx";

const oneDecimal = (n) => (Number.isFinite(n) ? String(Math.round(n * 10) / 10) : "n/a");

function ageText(minutes) {
  if (minutes < 2) return "just now";
  if (minutes < 90) return `${minutes} minutes ago`;
  return `${Math.round(minutes / 60)} hours ago`;
}

/** The live reading, with where it came from and how old it is. */
export default function AirCard({ advice }) {
  const { reading, band, verdictText, place } = advice;
  return (
    <Panel aria-labelledby="air-heading" className="reveal-once">
      <h2 id="air-heading" className="text-xl">
        Air right now in {place}
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <p className="num text-5xl font-extrabold">
          <span className="sr-only">US AQI </span>
          {reading.usAqi}
        </p>
        <div>
          <Badge tone={band.tone}>{band.label}</Badge>
          <p className="mt-1 text-sm text-ink-soft">US AQI</p>
        </div>
      </div>
      <p className="mt-3 font-semibold">For your household: {verdictText}.</p>
      <dl className="mt-3 grid max-w-sm grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-ink-soft">PM2.5</dt>
        <dd className="num">{oneDecimal(reading.pm25)} µg/m³</dd>
        <dt className="text-ink-soft">PM10</dt>
        <dd className="num">{oneDecimal(reading.pm10)} µg/m³</dd>
      </dl>
      {reading.stale && (
        <div className="mt-4">
          <Notice tone="warn" role="alert">
            This reading is {ageText(reading.ageMinutes)}, so it may not match the air outside now.
            Check again before you decide.
          </Notice>
        </div>
      )}
      <p className="mt-4 text-sm text-ink-soft">
        Source:{" "}
        <a
          href={reading.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-teal underline"
        >
          {reading.source.name}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        . Reading for {formatClock(reading.dataTimeMs)} IST ({ageText(reading.ageMinutes)}).{" "}
        {reading.source.note}
      </p>
    </Panel>
  );
}

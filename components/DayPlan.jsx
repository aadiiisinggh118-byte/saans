import { Badge, Notice, Panel } from "./ui.jsx";

const VERDICT = {
  ok: { tone: "ok", text: "Fine" },
  limit: { tone: "warn", text: "Keep it short and light" },
  avoid: { tone: "bad", text: "Best indoors" },
};

/** Morning, afternoon and evening, with the cleanest window to go out. */
export default function DayPlan({ advice }) {
  const { dayLabel, slots, bestWindow, worst } = advice;
  return (
    <Panel aria-labelledby="day-heading" className="reveal-once">
      <h2 id="day-heading" className="text-xl">
        {dayLabel}: when to go out
      </h2>
      {slots.length === 0 ? (
        <p className="mt-3 text-ink-soft">
          There is no hourly forecast for this place right now, so we can&apos;t suggest a time of
          day. The advice below still applies.
        </p>
      ) : (
        <>
          {bestWindow && (
            <div className="mt-3">
              <Notice tone="info">
                Cleanest forecast window: <strong>{bestWindow.label}</strong> (about AQI{" "}
                {bestWindow.avgAqi}).
                {worst && ` Worst hour: ${worst.label} (about AQI ${worst.aqi}).`}
              </Notice>
            </div>
          )}
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {slots.map((slot) => (
              <li key={slot.id} className="rounded-md border border-line p-3">
                <h3 className="text-base">{slot.label}</h3>
                <p className="text-sm text-ink-soft">{slot.span}</p>
                <p className="num mt-2 text-2xl font-extrabold">
                  <span className="sr-only">Average AQI </span>
                  {slot.avgAqi}
                </p>
                <p className="mt-1 text-sm">{slot.band.label}</p>
                <div className="mt-2">
                  <Badge tone={VERDICT[slot.verdict].tone}>{VERDICT[slot.verdict].text}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

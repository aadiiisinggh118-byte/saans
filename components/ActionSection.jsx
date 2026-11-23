import { Panel } from "./ui.jsx";

/**
 * A ranked list of actions. Each one shows the code's reason and impact, and, once Gemini has
 * written it, a plain-language explanation for this household.
 */
export default function ActionSection({ id, title, intro, actions, explanations }) {
  if (actions.length === 0) return null;
  return (
    <Panel aria-labelledby={`${id}-heading`} className="reveal-once">
      <h2 id={`${id}-heading`} className="text-xl">
        {title}
      </h2>
      <p className="mt-1 max-w-prose text-ink-soft">{intro}</p>
      <ul className="mt-4 space-y-4">
        {actions.map((item) => (
          <li key={item.id}>
            <article className="rounded-md border border-line p-4">
              <h3 className="text-base">{item.title}</h3>
              <p className="mt-2 text-sm">
                <strong>Why: </strong>
                {item.why}
              </p>
              <p className="mt-1 text-sm">
                <strong>What it changes: </strong>
                {item.impact}
              </p>
              {explanations.get(item.id) && (
                <p className="mt-2 rounded-md bg-info-bg px-3 py-2 text-sm text-info">
                  <strong>In plain words: </strong>
                  {explanations.get(item.id)}
                </p>
              )}
            </article>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

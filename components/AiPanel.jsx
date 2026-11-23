import { btnAccent, Field, inputCls, Notice, Panel } from "./ui.jsx";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी (Hindi)" },
];

/** Asks Gemini to explain the plan in plain words and to answer one question about it. */
export default function AiPanel({
  ai,
  outdated,
  language,
  onLanguage,
  question,
  onQuestion,
  onAsk,
}) {
  const loading = ai.status === "loading";
  const narration = ai.status === "ready" ? ai.data.narration : null;

  return (
    <Panel aria-labelledby="ai-heading" className="reveal-once">
      <h2 id="ai-heading" className="text-xl">
        Explain my plan with Gemini
      </h2>
      <p className="mt-1 max-w-prose text-ink-soft">
        The actions above come from tested rules. Gemini only puts them in plain words for your
        household and can answer one question. It is not allowed to change them or quote readings
        that aren&apos;t in the data.
      </p>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onAsk();
        }}
      >
        <Field id="language" label="Explain in">
          {(props) => (
            <select
              {...props}
              className={inputCls}
              value={language}
              onChange={(event) => onLanguage(event.target.value)}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          id="question"
          label="A question (optional)"
          hint="For example: can my son play cricket at 5 pm?"
        >
          {(props) => (
            <input
              {...props}
              type="text"
              className={inputCls}
              value={question}
              maxLength={200}
              onChange={(event) => onQuestion(event.target.value)}
            />
          )}
        </Field>
        <div className="sm:col-span-2">
          <button type="submit" className={btnAccent} disabled={loading}>
            {loading ? "Thinking…" : "Explain with Gemini"}
          </button>
        </div>
      </form>

      <div aria-live="polite" className="mt-4">
        {ai.status === "error" && (
          <Notice tone="bad" role="alert">
            {ai.error} Your plan above is still correct, because it doesn&apos;t depend on Gemini.
          </Notice>
        )}
        {narration && (
          <div className="space-y-3">
            {outdated && (
              <Notice tone="warn">
                You changed your household answers after this was written. Ask again to refresh it.
              </Notice>
            )}
            <p className="max-w-prose text-lg font-semibold">{narration.headline}</p>
            {narration.answer && (
              <p className="max-w-prose rounded-md bg-info-bg px-4 py-3 text-info">
                <strong>Your question: </strong>
                {narration.answer}
              </p>
            )}
            <p className="text-sm text-ink-soft">
              Written for the reading of {ai.data.basedOn.dataTime.replace("T", " ")} IST (US AQI{" "}
              {ai.data.basedOn.usAqi}). The explanations appear under each action above.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}

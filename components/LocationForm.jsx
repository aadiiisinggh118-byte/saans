import { btnGhost, btnPrimary, Field, inputCls } from "./ui.jsx";

/** Cities offered as one-click choices. */
const QUICK_CITIES = [
  "Delhi",
  "Mumbai",
  "Kolkata",
  "Chennai",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Lucknow",
  "Patna",
  "Ahmedabad",
];

/**
 * The place search: a text box, a submit button and quick city choices.
 * @param {{ query: string, onQueryChange: (text: string) => void, onSubmit: (text: string) => void, loading: boolean, error: string }} props
 */
export default function LocationForm({ query, onQueryChange, onSubmit, loading, error }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(query);
      }}
      noValidate
    >
      <Field
        id="place"
        label="Your city or area in India"
        hint="For example Noida, Andheri Mumbai or Salt Lake Kolkata."
        error={error}
      >
        {(props) => (
          <input
            {...props}
            type="text"
            className={inputCls}
            value={query}
            maxLength={80}
            autoComplete="off"
            onChange={(event) => onQueryChange(event.target.value)}
          />
        )}
      </Field>
      <button type="submit" className={`${btnPrimary} mt-3`} disabled={loading}>
        {loading ? "Checking the air…" : "Check the air now"}
      </button>
      <div role="group" aria-label="Quick city choices" className="mt-4 flex flex-wrap gap-2">
        {QUICK_CITIES.map((city) => (
          <button
            key={city}
            type="button"
            className={`${btnGhost} px-3 py-1.5 text-sm`}
            disabled={loading}
            onClick={() => onSubmit(city)}
          >
            {city}
          </button>
        ))}
      </div>
    </form>
  );
}

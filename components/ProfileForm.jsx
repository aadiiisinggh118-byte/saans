import {
  ACTIVITY_OPTIONS,
  COMMUTE_OPTIONS,
  DISTANCE_OPTIONS,
  FUEL_OPTIONS,
  GROUP_OPTIONS,
} from "../lib/profile.js";
import { Field, inputCls } from "./ui.jsx";

/** A labelled drop-down built from a list of `{ value, label }` options. */
function Select({ options, ...props }) {
  return (
    <select {...props} className={inputCls}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** A labelled checkbox that reports its new state. */
function Check({ id, label, checked, onChange }) {
  return (
    <label htmlFor={id} className="flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4"
      />
      <span>{label}</span>
    </label>
  );
}

/**
 * The household questions. Every change is reported at once, so the plan updates instantly.
 * @param {{ profile: import("../lib/profile.js").Profile, onChange: (profile: import("../lib/profile.js").Profile) => void }} props
 */
export default function ProfileForm({ profile, onChange }) {
  const set = (patch) => onChange({ ...profile, ...patch });
  const toggleGroup = (value, checked) =>
    set({
      groups: checked ? [...profile.groups, value] : profile.groups.filter((g) => g !== value),
    });

  return (
    <form className="grid gap-5 sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1 font-semibold">Who lives in your home?</legend>
        <p className="mb-2 text-sm text-ink-soft">
          Tick anyone who is affected more by polluted air. Advice gets stricter for them.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {GROUP_OPTIONS.map((option) => (
            <Check
              key={option.value}
              id={`group-${option.value}`}
              label={option.label}
              checked={profile.groups.includes(option.value)}
              onChange={(checked) => toggleGroup(option.value, checked)}
            />
          ))}
        </div>
      </fieldset>

      <Field id="commute" label="How do you usually get to work or school?">
        {(props) => (
          <Select
            {...props}
            options={COMMUTE_OPTIONS}
            value={profile.commute}
            onChange={(event) => set({ commute: event.target.value })}
          />
        )}
      </Field>

      {profile.commute !== "none" && (
        <Field id="distance" label="How far is it, one way?">
          {(props) => (
            <Select
              {...props}
              options={DISTANCE_OPTIONS}
              value={profile.commuteKm}
              onChange={(event) => set({ commuteKm: Number(event.target.value) })}
            />
          )}
        </Field>
      )}

      <Field id="activity" label="What do you or your family do outdoors?">
        {(props) => (
          <Select
            {...props}
            options={ACTIVITY_OPTIONS}
            value={profile.outdoorActivity}
            onChange={(event) => set({ outdoorActivity: event.target.value })}
          />
        )}
      </Field>

      <Field id="fuel" label="What do you cook on?">
        {(props) => (
          <Select
            {...props}
            options={FUEL_OPTIONS}
            value={profile.cookingFuel}
            onChange={(event) => set({ cookingFuel: event.target.value })}
          />
        )}
      </Field>

      <fieldset className="sm:col-span-2">
        <legend className="mb-2 font-semibold">At home</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <Check
            id="purifier"
            label="We have an air purifier"
            checked={profile.purifier}
            onChange={(checked) => set({ purifier: checked })}
          />
          <Check
            id="smoke-sources"
            label="Incense, mosquito coils or smoking indoors"
            checked={profile.smokeSources}
            onChange={(checked) => set({ smokeSources: checked })}
          />
        </div>
      </fieldset>
    </form>
  );
}

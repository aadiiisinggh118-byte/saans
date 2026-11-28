import Link from "next/link";
import { btnAccent, Panel } from "../components/ui.jsx";

/** The three things Saans gives a household, shown as cards on the home page. */
const FEATURES = [
  {
    title: "Low-emission daily routines",
    body: "When to go out, whether children should play outside, and how to make your commute cleaner, for today's air and your household.",
  },
  {
    title: "Cleaner air at home",
    body: "Seal, filter and vent in the right order. Advice depends on whether you have a purifier, what you cook on and who is at risk.",
  },
  {
    title: "Greener alternatives, with the numbers",
    body: "Carpool, switch to the metro or cut a trip, and see the CO₂ each choice saves in a week.",
  },
];

/** The steps of "how it works", in order. */
const STEPS = [
  {
    title: "Live data",
    body: "Today's reading and hourly forecast come from a public air-quality service, shown with its source and time.",
  },
  {
    title: "Code decides",
    body: "Tested rules turn the reading and your household into a ranked list of actions, with the reason and impact of each.",
  },
  {
    title: "Gemini explains",
    body: "Gemini puts the plan in plain words, in English or Hindi, and answers a question. Its answer is checked before you see it.",
  },
];

/** The landing page: what Saans does, why it is not just a chatbot, and how it works. */
export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-page px-5 py-14">
        <h1 className="max-w-prose text-4xl sm:text-5xl">Smog season, made manageable.</h1>
        <p className="mt-4 max-w-prose text-lg text-ink-soft">
          Saans turns today&apos;s live air quality in your city into a plan for your household:
          when to go out, how to keep indoor air clean, and greener choices that show their impact.
        </p>
        <Link href="/assistant" className={`${btnAccent} mt-6`}>
          Check my air
        </Link>
      </section>

      <section aria-labelledby="features-heading" className="mx-auto max-w-page px-5 pb-12">
        <h2 id="features-heading" className="mb-4 text-2xl">
          What you get
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <Panel className="h-full">
                <h3 className="text-lg">{feature.title}</h3>
                <p className="mt-2 text-ink-soft">{feature.body}</p>
              </Panel>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="why-heading" className="on-dark bg-teal-dark text-on-dark">
        <div className="mx-auto max-w-page px-5 py-12">
          <h2 id="why-heading" className="text-2xl text-white">
            Why not just ask a chatbot?
          </h2>
          <p className="mt-3 max-w-prose">
            A chatbot cannot see today&apos;s air, so it guesses. Saans reads a live reading, tells
            you where it came from and how old it is, and ties every suggestion to it. The advice is
            decided by code you can test, and Gemini is only trusted to explain it.
          </p>
        </div>
      </section>

      <section aria-labelledby="how-heading" className="mx-auto max-w-page px-5 py-12">
        <h2 id="how-heading" className="mb-4 text-2xl">
          How it works
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Panel className="h-full">
                <h3 className="text-lg">
                  {i + 1}. {step.title}
                </h3>
                <p className="mt-2 text-ink-soft">{step.body}</p>
              </Panel>
            </li>
          ))}
        </ol>
        <Link href="/assistant" className={`${btnAccent} mt-8`}>
          Try it for your city
        </Link>
      </section>
    </>
  );
}

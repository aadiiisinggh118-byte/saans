import Link from "next/link";

/** The site header with the home link and the main call to action. */
export default function Header() {
  return (
    <header className="on-dark bg-teal-dark text-white">
      <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-amber" />
          Saans
        </Link>
        <nav aria-label="Main">
          <Link
            href="/assistant"
            className="rounded-md bg-amber px-4 py-2 font-semibold text-ink hover:bg-amber-light"
          >
            Check my air
          </Link>
        </nav>
      </div>
    </header>
  );
}

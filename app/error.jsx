"use client";

import { btnPrimary, PageHeading } from "../components/ui.jsx";

/**
 * Shown when something unexpected breaks while a page is drawing. The rest of the site
 * (header, footer) stays up, and the person can try again without losing the page.
 * @param {{ reset: () => void }} props `reset` re-renders the part of the page that failed
 */
export default function ErrorPage({ reset }) {
  return (
    <div className="mx-auto max-w-page px-5 py-10">
      <PageHeading title="Something went wrong">
        We couldn&apos;t show this page. Your answers are safe in this browser. Please try again.
      </PageHeading>
      <button type="button" className={btnPrimary} onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}

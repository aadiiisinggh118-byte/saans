/** Shown while a page is loading, announced politely to screen readers. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-page px-5 py-10">
      <p role="status" className="text-ink-soft">
        Loading…
      </p>
    </div>
  );
}

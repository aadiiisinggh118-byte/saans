import Link from "next/link";
import { btnPrimary, PageHeading } from "../components/ui.jsx";

export const metadata = { title: "Page not found | Saans" };

/** Shown for any address that does not exist. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-page px-5 py-10">
      <PageHeading title="We couldn't find that page">
        The address may be mistyped or the page may have moved.
      </PageHeading>
      <Link href="/assistant" className={btnPrimary}>
        Check my air
      </Link>
    </div>
  );
}

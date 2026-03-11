import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="not-found-state panel" aria-live="polite">
        <h1>Post not found</h1>
        <p>
          This post does not exist or is not published (<code>status !== published</code>).
        </p>
        <Link href="/" className="back-link">
          Back to homepage
        </Link>
      </section>
    </main>
  );
}

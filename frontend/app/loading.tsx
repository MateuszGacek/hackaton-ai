export default function Loading() {
  return (
    <main className="page-shell">
      <section className="loading-state panel" aria-live="polite">
        <h1>Loading homepage content...</h1>
        <p>Fetching sections from Directus CMS.</p>
      </section>
    </main>
  );
}

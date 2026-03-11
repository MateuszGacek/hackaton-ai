export default function PostLoading() {
  return (
    <main className="page-shell post-shell">
      <section className="loading-state panel" aria-live="polite">
        <h1>Loading post...</h1>
        <p>Checking content availability and publish access.</p>
      </section>
    </main>
  );
}

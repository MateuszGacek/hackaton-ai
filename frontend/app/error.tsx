"use client";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  return (
    <main className="page-shell">
      <section className="error-state panel" aria-live="assertive">
        <h1>CMS connection failed</h1>
        <p>
          Verify that Directus is running and that your API URL is correct. Details: {error.message}
        </p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}

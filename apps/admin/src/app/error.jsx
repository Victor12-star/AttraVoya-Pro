'use client';

/**
 * Route-level Admin error boundary.
 * Next.js supplies `reset` so the failed route can be retried without a full reload.
 *
 * @param {{ reset: () => void }} props
 */
export default function AdminError({ reset }) {
  return (
    <main role="alert" style={{ padding: '2rem', maxWidth: '48rem', margin: '0 auto' }}>
      <h1>Something went wrong</h1>
      <p>The Admin workspace could not complete this request. No sensitive error details are shown here.</p>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}

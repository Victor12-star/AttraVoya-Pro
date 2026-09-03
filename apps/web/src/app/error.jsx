'use client';

/**
 * Customer-site route error boundary. It offers a safe retry without exposing
 * stack traces, provider responses, or request internals to travellers.
 *
 * @param {{ reset: () => void }} props
 */
export default function WebError({ reset }) {
  return (
    <main role="alert" style={{ padding: '2rem', maxWidth: '48rem', margin: '0 auto' }}>
      <h1>We could not load this page</h1>
      <p>Your trip information is safe. Please try the request again.</p>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}

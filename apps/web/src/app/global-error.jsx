'use client';

/**
 * Last-resort customer-site error boundary. It is intentionally dependency-light
 * so a critical root-layout failure can still show a useful recovery action.
 *
 * @param {{ reset: () => void }} props
 */
export default function WebGlobalError({ reset }) {
  return (
    <html lang="en">
      <body>
        <main role="alert" style={{ padding: '2rem', maxWidth: '48rem', margin: '0 auto' }}>
          <h1>AttraVoya Pro is temporarily unavailable</h1>
          <p>Please try again. Sensitive diagnostics are never displayed on this page.</p>
          <button type="button" onClick={() => reset()}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

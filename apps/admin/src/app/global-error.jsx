'use client';

/**
 * Last-resort Admin error boundary. Keep it dependency-light because it must
 * render even when the normal root layout cannot.
 */
export default function AdminGlobalError({ reset }) {
  return (
    <html lang="en">
      <body>
        <main role="alert" style={{ padding: '2rem', maxWidth: '48rem', margin: '0 auto' }}>
          <h1>Admin workspace unavailable</h1>
          <p>A critical interface error occurred. Sensitive diagnostics remain in server logs only.</p>
          <button type="button" onClick={() => reset()}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

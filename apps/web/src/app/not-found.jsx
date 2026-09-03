import Link from 'next/link';

/**
 * Customer-facing 404 page with a clear path back to trip discovery.
 */
export default function WebNotFound() {
  return (
    <main style={{ padding: '2rem', maxWidth: '48rem', margin: '0 auto' }}>
      <h1>We could not find that page</h1>
      <p>The travel page you requested may have moved or may no longer be available.</p>
      <Link href="/">Return to AttraVoya Pro</Link>
    </main>
  );
}

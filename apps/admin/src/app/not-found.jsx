import Link from 'next/link';

/**
 * Admin 404 page. Keep recovery simple and avoid leaking route internals from
 * the privileged workspace.
 */
export default function AdminNotFound() {
  return (
    <main style={{ padding: '2rem', maxWidth: '48rem', margin: '0 auto' }}>
      <h1>Admin page not found</h1>
      <p>The requested Admin page does not exist or is no longer available.</p>
      <Link href="/">Return to Admin home</Link>
    </main>
  );
}

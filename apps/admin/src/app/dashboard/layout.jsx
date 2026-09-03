import Link from 'next/link';

/** @param {{ children: import('react').ReactNode }} props */
export default function DashboardLayout({ children }) {
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link className="admin-brand" href="/dashboard">AttraVoya Pro Admin</Link>
        <nav className="admin-nav" aria-label="Admin navigation">
          <Link href="/dashboard/users">Users</Link>
          <Link href="/dashboard/destinations">Destinations</Link>
          <Link href="/dashboard/emergency">Emergency</Link>
          <Link href="/dashboard/providers">Providers</Link>
          <Link href="/dashboard/audit-logs">Audit logs</Link>
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}

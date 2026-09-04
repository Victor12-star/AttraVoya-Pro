import Link from 'next/link';

const SECTIONS = [
  ['Users', '/dashboard/users'],
  ['Subscriptions', '/dashboard/subscriptions'],
  ['Destinations', '/dashboard/destinations'],
  ['Countries', '/dashboard/countries'],
  ['Cities', '/dashboard/cities'],
  ['Airports', '/dashboard/airports'],
  ['Languages', '/dashboard/languages'],
  ['Currencies', '/dashboard/currencies'],
  ['Emergency records', '/dashboard/emergency'],
  ['Providers', '/dashboard/providers'],
  ['Feature flags', '/dashboard/feature-flags'],
  ['Audit logs', '/dashboard/audit-logs'],
  ['System', '/dashboard/system'],
  ['Analytics', '/dashboard/analytics'],
  ['Phrasebook', '/dashboard/phrasebook'],
];

export default function DashboardPage() {
  return (
    <section className="admin-card">
      <h1>Administration</h1>
      <p className="admin-muted">
        Manage AttraVoya Pro platform data and operational controls from dedicated modules.
        Privileged API authorization remains the source of truth for every administrative action.
      </p>
      <div className="admin-section-grid">
        {SECTIONS.map(([label, href]) => (
          <Link className="admin-section-link" href={href} key={href}>
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}

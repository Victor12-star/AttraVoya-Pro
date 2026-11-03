import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../lib/admin-backend.js';
import { AdminLogoutButton } from '../../features/auth/admin-logout-button.jsx';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      ['Dashboard', '/dashboard'],
      ['Analytics', '/dashboard/analytics'],
      ['Users', '/dashboard/users'],
      ['Subscriptions', '/dashboard/subscriptions'],
    ],
  },
  {
    label: 'Travel content',
    items: [
      ['Destinations', '/dashboard/destinations'],
      ['Countries', '/dashboard/countries'],
      ['Cities', '/dashboard/cities'],
      ['Airports', '/dashboard/airports'],
      ['Languages', '/dashboard/languages'],
      ['Currencies', '/dashboard/currencies'],
      ['Phrasebook', '/dashboard/phrasebook'],
    ],
  },
  {
    label: 'Operations',
    items: [
      ['Emergency records', '/dashboard/emergency'],
      ['Providers', '/dashboard/providers'],
      ['Feature flags', '/dashboard/feature-flags'],
      ['Audit logs', '/dashboard/audit-logs'],
      ['System', '/dashboard/system'],
    ],
  },
];

/** @param {{ children: import('react').ReactNode }} props */
export default async function DashboardLayout({ children }) {
  const session = await cookies();
  if (!session.has(ACCESS_COOKIE) && !session.has(REFRESH_COOKIE)) {
    redirect('/login');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Administration sidebar">
        <Link className="admin-brand" href="/dashboard">
          <span className="admin-brand-mark" aria-hidden="true">
            A
          </span>
          <span className="admin-brand-text">
            <strong>AttraVoya</strong>
            <small>PRO · ADMIN CONSOLE</small>
          </span>
        </Link>
        <div className="admin-workspace-label">WORKSPACE</div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {NAV_GROUPS.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <span className="admin-nav-group-title">{group.label}</span>
              {group.items.map(([label, href]) => (
                <Link className="admin-nav-link" href={href} key={href}>
                  <span className="admin-nav-dot" aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <span className="admin-sidebar-status" aria-hidden="true" />
          Secure administration
          <AdminLogoutButton />
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-header">
          <div>
            <span className="admin-header-eyebrow">ATTRAVOYA PRO</span>
            <span className="admin-header-title">Administration workspace</span>
          </div>
          <span className="admin-header-pill">Admin console</span>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}

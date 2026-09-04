import Link from 'next/link';

import { Brand } from '../../components/common/brand.jsx';

export default function AuthLayout({ children }) {
  return (
    <main className="auth-shell">
      <div className="auth-shell__top shell">
        <Brand />
        <Link className="text-link" href="/">
          AttraVoya Pro
        </Link>
      </div>
      {children}
    </main>
  );
}

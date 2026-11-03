'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }
  return <button type="button" disabled={busy} onClick={signOut} className="admin-sign-out">
    {busy ? 'Signing out…' : 'Sign out'}
  </button>;
}

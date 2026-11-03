'use client';

import { useState } from 'react';

export function AdminLogoutButton() {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      window.location.assign('/login');
    }
  }
  return <button type="button" disabled={busy} onClick={signOut} className="admin-sign-out">
    {busy ? 'Signing out…' : 'Sign out'}
  </button>;
}

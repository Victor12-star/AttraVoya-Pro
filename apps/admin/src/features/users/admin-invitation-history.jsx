'use client';

import { useEffect, useState } from 'react';

const STATUS_LABELS = {
  SENT: 'Sent · waiting for registration',
  REGISTERED_UNVERIFIED: 'Registered · email not verified',
  REGISTERED_VERIFIED: 'Registered · ready for owner role approval',
  ADMIN_ASSIGNED: 'Administrator access assigned',
  EXPIRED: 'Follow-up window expired',
  REVOKED: 'Invitation record revoked',
};

export function AdminInvitationHistory() {
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState(/** @type {{total:number;pages:number;invitations:Array<{id:string;email:string;sentAt:string;expiresAt:string;status:string}>}|null} */ (null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revokeId, setRevokeId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/admin/invitations?page=${page}`, {
          cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
        });
        const result = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(result.error ?? 'Could not load invitation history.');
          setData(null);
        } else {
          setData(result);
        }
      } catch {
        if (!cancelled) setError('Could not load invitation history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; controller.abort(); };
  }, [page, reload]);

  async function revoke(event) {
    event.preventDefault();
    if (!revokeId || !password || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/invitations/${encodeURIComponent(revokeId)}/revoke`, {
        method: 'POST', cache: 'no-store', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Could not revoke invitation record.');
        return;
      }
      setRevokeId('');
      setPassword('');
      setReload((value) => value + 1);
    } catch {
      setError('Could not revoke invitation record.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card admin-users-section">
      <div className="admin-directory-heading">
        <div>
          <h2>Administrator invitation history</h2>
          <p className="admin-muted">Invitation status is based on account registration and current roles. Expiration applies to the seven-day follow-up record, not public registration.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => setReload((value) => value + 1)}>
          Refresh invitations
        </button>
      </div>
      {loading ? <p role="status">Loading invitations…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!loading && data ? (
        <>
          <p className="admin-muted">{data.total} tracked invitation{data.total === 1 ? '' : 's'}</p>
          <div className="admin-directory-scroll">
            <table className="admin-directory-table">
              <thead><tr><th scope="col">Recipient</th><th scope="col">Sent</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
              <tbody>
                {data.invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td>{invitation.email}</td>
                    <td>{new Date(invitation.sentAt).toLocaleDateString()}</td>
                    <td>{STATUS_LABELS[invitation.status] ?? 'Unknown'}</td>
                    <td>
                      {!['REVOKED', 'ADMIN_ASSIGNED'].includes(invitation.status) ? (
                        <button type="button" onClick={() => { setRevokeId(invitation.id); setPassword(''); }}>
                          Revoke invitation
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.invitations.length === 0 ? <p>No invitations have been tracked yet.</p> : null}
          <div className="admin-directory-pagination">
            <button type="button" disabled={loading || page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
            <span>Page {page} of {Math.max(1, data.pages)}</span>
            <button type="button" disabled={loading || page >= data.pages}
              onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </>
      ) : null}
      {revokeId ? (
        <form className="admin-login-form" onSubmit={revoke}>
          <p>Confirm revoking this invitation record. This does not remove an account or any existing Admin role.</p>
          <label htmlFor="revoke-invite-owner-password">Owner password</label>
          <input id="revoke-invite-owner-password" type="password"
            value={password} onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password" required disabled={busy} />
          <button type="submit" disabled={busy}>Confirm invitation revocation</button>
          <button type="button" disabled={busy} onClick={() => { setRevokeId(''); setPassword(''); }}>
            Cancel
          </button>
        </form>
      ) : null}
    </section>
  );
}

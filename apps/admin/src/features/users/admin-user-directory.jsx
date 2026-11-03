'use client';

import { useCallback, useEffect, useState } from 'react';

export function AdminUserDirectory() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const reload = useCallback(() => setRefresh((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/admin/users?page=${page}`, {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        const result = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setData(null);
          setError(result.error ?? 'Could not load registered users.');
        } else {
          setData(result);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setError('Could not load registered users.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [page, refresh]);

  return (
    <section className="admin-card admin-users-section">
      <div className="admin-directory-heading">
        <div>
          <h2>Registered Accounts &amp; Roles</h2>
          <p className="admin-muted">Review email verification, account status and assigned roles.</p>
        </div>
        <button type="button" onClick={reload} disabled={loading}>Refresh accounts</button>
      </div>
      {loading ? <p role="status">Loading registered accounts…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!loading && data ? (
        <>
          <p className="admin-muted">{data.total} registered account{data.total === 1 ? '' : 's'} (excluding deleted accounts)</p>
          <div className="admin-directory-scroll">
            <table className="admin-directory-table">
              <thead><tr>
                <th scope="col">Email</th>
                <th scope="col">Account status</th>
                <th scope="col">Email</th>
                <th scope="col">Assigned roles</th>
              </tr></thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.status}</td>
                    <td>{user.verified ? 'Verified' : 'Unverified'}</td>
                    <td>{user.roles.join(', ') || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.users.length === 0 ? <p>No accounts found on this page.</p> : null}
          <div className="admin-directory-pagination">
            <button type="button" disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
            <span>Page {page} of {Math.max(1, data.pages)}</span>
            <button type="button" disabled={page >= data.pages || loading}
              onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </>
      ) : null}
    </section>
  );
}

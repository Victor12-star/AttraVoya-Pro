export default function AdminLoading() {
  return (
    <main className="admin-main" aria-busy="true" aria-live="polite">
      <div className="admin-card">
        <p className="admin-muted">Loading Admin workspace…</p>
      </div>
    </main>
  );
}

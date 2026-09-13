export default function Loading() {
  return (
    <main className="page-loading" aria-busy="true" aria-label="AttraVoya Pro">
      <div className="shell page-loading__shell">
        <div className="page-loading__heading" aria-hidden="true">
          <span className="page-loading__eyebrow" />
          <span className="page-loading__title" />
          <span className="page-loading__summary" />
        </div>
        <div className="page-loading__grid" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </main>
  );
}

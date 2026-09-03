/**
 * Shared build-safe shell for Admin modules that have not yet reached their
 * implementation phase. It deliberately shows no fabricated operational data.
 *
 * @param {{ title: string, description: string }} props
 */
export function AdminSectionPage({ title, description }) {
  return (
    <section className="admin-card">
      <h1>{title}</h1>
      <p className="admin-muted">{description}</p>
    </section>
  );
}

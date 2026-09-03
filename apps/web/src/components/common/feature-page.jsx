import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';

/**
 * Honest interim route shell used while a vertical feature is being connected.
 * It prevents dead navigation without fabricating live travel results.
 */
export function FeaturePage({ eyebrow, title, description, backLabel, children = null }) {
  return (
    <section className="feature-page">
      <div className="shell">
        <div className="feature-page__card">
          <span className="eyebrow"><Info size={15} /> {eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          {children}
          <div className="feature-page__actions">
            <Link className="button button--dark" href="/"><ArrowLeft size={17} /> {backLabel}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

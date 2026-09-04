import Link from 'next/link';
import { Compass } from 'lucide-react';

export function Brand({ inverse = false }) {
  return (
    <Link
      className={`brand${inverse ? ' brand--inverse' : ''}`}
      href="/"
      aria-label="AttraVoya Pro"
    >
      <span className="brand__mark" aria-hidden="true">
        <Compass size={19} strokeWidth={2.2} />
      </span>
      <span className="brand__wordmark">
        AttraVoya <strong>Pro</strong>
      </span>
    </Link>
  );
}

import Link from 'next/link';
import { HeartHandshake, Languages, ShieldCheck } from 'lucide-react';

import { Brand } from '../common/brand.jsx';

export function SiteFooter({ messages }) {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__grid">
        <div className="site-footer__brand">
          <Brand inverse />
          <p>{messages.home.heroTitle}</p>
        </div>
        <div>
          <h2>{messages.navigation.explore}</h2>
          <Link href="/flights">{messages.navigation.flights}</Link>
          <Link href="/stays">{messages.navigation.stays}</Link>
          <Link href="/things-to-do">{messages.navigation.thingsToDo}</Link>
          <Link href="/nearby">{messages.navigation.nearby}</Link>
        </div>
        <div>
          <h2>{messages.safety.title}</h2>
          <Link href="/safety">
            <ShieldCheck size={15} /> {messages.safety.verifiedEmergency}
          </Link>
          <Link href="/language">
            <Languages size={15} /> {messages.common.chooseLanguage}
          </Link>
          <Link href="/family">
            <HeartHandshake size={15} /> {messages.home.family}
          </Link>
          <Link href="/delete-account">Delete account</Link>
        </div>
      </div>
      <div className="shell site-footer__bottom">
        <span>© {new Date().getFullYear()} AttraVoya Pro</span>
        <span className="site-footer__legal">
          <Link href="/privacy">Privacy policy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/delete-account">Delete account</Link>
        </span>
      </div>
    </footer>
  );
}

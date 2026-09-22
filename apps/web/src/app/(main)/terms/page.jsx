import Link from 'next/link';
import { BadgeCheck, CircleAlert, Scale, ShieldCheck } from 'lucide-react';

import styles from '../privacy/privacy-page.module.css';

export const metadata = {
  title: 'Terms of service | AttraVoya Pro',
  description:
    'The terms governing access to AttraVoya Pro travel-planning services on the web and mobile application.',
};

const updatedAt = '22 September 2026';

export function publicSupportEmail(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && normalized.length <= 320
    ? normalized
    : null;
}

export default function TermsPage() {
  const supportEmail = publicSupportEmail(
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL,
  );

  return (
    <article className={`shell ${styles.page}`} aria-labelledby="terms-title">
      <header className={styles.hero}>
        <span className={styles.heroIcon} aria-hidden="true">
          <Scale size={30} />
        </span>
        <div>
          <span className="eyebrow">Clear and fair use</span>
          <h1 id="terms-title">AttraVoya Pro terms of service</h1>
          <p>
            These terms explain the rules for using AttraVoya Pro&apos;s website, mobile
            application, application programming interface, and travel-planning services.
          </p>
          <p className={styles.updated}>Effective and last updated: {updatedAt}</p>
        </div>
      </header>

      <nav className={styles.contents} aria-label="Terms of service contents">
        <strong>On this page</strong>
        <a href="#service">The service</a>
        <a href="#accounts">Accounts</a>
        <a href="#travel-information">Travel information</a>
        <a href="#subscriptions">Subscriptions</a>
        <a href="#acceptable-use">Acceptable use</a>
        <a href="#contact">Contact</a>
      </nav>

      <section className={styles.section}>
        <h2>Agreement and eligibility</h2>
        <p>
          By creating an account or using AttraVoya Pro, you agree to these terms and the{' '}
          <Link href="/privacy">privacy policy</Link>. If you do not agree, do not use the service.
          You must be legally able to enter this agreement in your country. A child who cannot
          legally agree to these terms must not create an account; an adult may plan family travel
          and provide only the limited child-age information needed for that plan.
        </p>
      </section>

      <section className={styles.section} id="service">
        <span className={styles.sectionIcon} aria-hidden="true">
          <BadgeCheck size={22} />
        </span>
        <h2>The service</h2>
        <p>
          AttraVoya Pro helps users explore destinations, organise trips, compare budget options,
          and access travel tools. Features can change as the service develops. Material changes to
          paid features will be communicated before they take effect where required.
        </p>
        <p>
          The service is a planning aid, not a travel agency, insurer, emergency service,
          immigration adviser, medical provider, or financial adviser. You remain responsible for
          checking official entry rules, safety advice, reservations, prices, insurance, health
          requirements, and travel documents before acting.
        </p>
      </section>

      <section className={styles.section} id="accounts">
        <span className={styles.sectionIcon} aria-hidden="true">
          <ShieldCheck size={22} />
        </span>
        <h2>Accounts and security</h2>
        <p>
          Provide accurate registration information, protect your credentials, and notify support if
          you believe your account is compromised. You are responsible for activity performed
          through your account unless it resulted from a failure for which AttraVoya Pro is legally
          responsible. Do not share passwords or security tokens.
        </p>
        <p>
          You can end this agreement by deleting your account in the mobile application or through
          the public <Link href="/delete-account">account-deletion page</Link>. The privacy policy
          explains deletion, retention, and data-protection rights.
        </p>
      </section>

      <section className={styles.section} id="travel-information">
        <span className={styles.sectionIcon} aria-hidden="true">
          <CircleAlert size={22} />
        </span>
        <h2>Travel information and third-party services</h2>
        <p>
          Live provider information and planning estimates are identified separately. Prices,
          availability, exchange rates, weather, events, maps, opening hours, transport details, and
          safety information can change or become unavailable. An estimate is not a booking offer or
          a promise that a provider will honour a price.
        </p>
        <p>
          Confirm important information with the responsible airline, accommodation, transport
          operator, government authority, emergency service, or other official source. External
          providers control their own services and terms. AttraVoya Pro does not fabricate a live
          result when a provider fails and may instead show a clearly labelled unavailable, partial,
          cached, or estimated state.
        </p>
      </section>

      <section className={styles.section} id="subscriptions">
        <h2>Subscriptions and payments</h2>
        <p>
          Paid subscriptions are not currently available. Before they are enabled, AttraVoya Pro
          will show the price, billing period, included recurring benefits, trial or offer terms,
          renewal behaviour, and cancellation route before purchase. Android purchases will use the
          required Google Play billing flow unless a permitted exception applies.
        </p>
        <p>
          When subscriptions launch, the store checkout and applicable store terms will govern
          payment processing, renewal, cancellation, and refunds. Any future price increase will
          follow applicable law and store rules, with advance notice and a clear valid reason where
          required. Nothing in these terms removes mandatory consumer rights.
        </p>
      </section>

      <section className={styles.section} id="acceptable-use">
        <h2>Acceptable use</h2>
        <p>You must not:</p>
        <ul>
          <li>break the law, harm another person, or submit content you have no right to use;</li>
          <li>probe, bypass, disable, or interfere with security and access controls;</li>
          <li>use automated traffic, scraping, or repeated requests that overload the service;</li>
          <li>upload malware or attempt unauthorised access to accounts, systems, or data; or</li>
          <li>misrepresent provider results or use the service to deceive another person.</li>
        </ul>
        <p>
          Access may be restricted or suspended when reasonably necessary to protect users, comply
          with law, investigate abuse, or maintain service security. Where appropriate, notice and a
          reasonable opportunity to respond will be provided.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Your content and AttraVoya Pro materials</h2>
        <p>
          You retain ownership of content you enter. You give AttraVoya Pro only the limited rights
          needed to store, process, display, and transmit that content to provide and secure the
          service. Do not submit unnecessary sensitive information or content that infringes another
          person&apos;s rights.
        </p>
        <p>
          The application, design, software, branding, and original service content remain protected
          by applicable intellectual-property law. These terms grant a personal, limited,
          non-exclusive, non-transferable right to use the service as intended.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Availability and responsibility</h2>
        <p>
          AttraVoya Pro is designed to recover safely from failures, but uninterrupted or error-free
          operation cannot be guaranteed. Maintenance, network problems, device limitations, or
          third-party outages can temporarily affect features. Do not rely on the application as the
          only source of information in an emergency.
        </p>
        <p>
          To the extent permitted by law, AttraVoya Pro is not responsible for indirect losses or
          decisions based on outdated, estimated, or third-party information. This does not exclude
          responsibility that cannot legally be excluded, including mandatory consumer protections.
          The governing law and competent forum will follow applicable mandatory rules and the
          verified operator details published for the production service.
        </p>
      </section>

      <section className={styles.section} id="contact">
        <h2>Contact and changes</h2>
        {supportEmail ? (
          <p>
            For questions about these terms, email{' '}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Do not send passwords, security
            tokens, passport details, or payment-card information.
          </p>
        ) : (
          <p>
            Before public release, the deployed website will display a verified monitored support
            address. Until then, use the verified developer contact in the official application
            store listing. Do not publish private account or travel data in a public issue or
            review.
          </p>
        )}
        <p>
          These terms may be updated when the service, law, or store requirements change. The
          effective date will be updated, and material changes will be communicated through the
          service or another appropriate channel before taking effect where required.
        </p>
      </section>
    </article>
  );
}

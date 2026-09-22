import Link from 'next/link';
import { Database, LockKeyhole, MapPin, ShieldCheck } from 'lucide-react';

import styles from './privacy-page.module.css';

export const metadata = {
  title: 'Privacy policy | AttraVoya Pro',
  description:
    'How AttraVoya Pro collects, uses, protects, retains, and deletes personal data across its website and mobile application.',
};

const updatedAt = '22 September 2026';

export function publicPrivacyEmail(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && normalized.length <= 320
    ? normalized
    : null;
}

export default function PrivacyPage() {
  const privacyEmail = publicPrivacyEmail(
    process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  );

  return (
    <article className={`shell ${styles.page}`} aria-labelledby="privacy-title">
      <header className={styles.hero}>
        <span className={styles.heroIcon} aria-hidden="true">
          <ShieldCheck size={30} />
        </span>
        <div>
          <span className="eyebrow">Privacy and data protection</span>
          <h1 id="privacy-title">AttraVoya Pro privacy policy</h1>
          <p>
            This policy explains how AttraVoya Pro handles personal data in its website, mobile
            application, application programming interface, and related travel-planning services.
          </p>
          <p className={styles.updated}>Effective and last updated: {updatedAt}</p>
        </div>
      </header>

      <nav className={styles.contents} aria-label="Privacy policy contents">
        <strong>On this page</strong>
        <a href="#data-we-collect">Data we collect</a>
        <a href="#how-we-use-data">How we use data</a>
        <a href="#providers">Service providers</a>
        <a href="#retention">Retention and deletion</a>
        <a href="#your-rights">Your rights</a>
        <a href="#contact">Contact</a>
      </nav>

      <section className={styles.section}>
        <h2>Who is responsible for your data?</h2>
        <p>
          The AttraVoya Pro operator identified in the official application store listing is the
          data controller for personal data processed to provide the service. Those verified
          developer details form part of this policy. Privacy contact information is also provided
          below.
        </p>
        <p>
          This policy applies to AttraVoya Pro. External travel, mapping, weather, event, news,
          image, translation, and email providers have their own privacy terms when they process a
          request.
        </p>
      </section>

      <section className={styles.section} id="data-we-collect">
        <span className={styles.sectionIcon} aria-hidden="true">
          <Database size={22} />
        </span>
        <h2>Data we collect</h2>
        <h3>Account and security data</h3>
        <p>
          We process your email address, an irreversible password hash, email-verification status,
          account status, sign-in timestamps, and security-session records. Session records can
          include a coarse browser or device description and a protected hash derived from network
          information. Raw passwords and refresh credentials are not stored.
        </p>
        <h3>Profile and preference data</h3>
        <p>
          If you choose to provide it, we process your display name, country, language, currency,
          travel interests, dietary preferences, accessibility preferences, and similar settings.
        </p>
        <h3>Travel-planning data</h3>
        <p>
          Planning can include origin, destination, dates, budget, currency, comfort level,
          interests, accommodation preferences, trip notes, saved places, recent searches, expenses,
          traveller types, and children&apos;s ages. Do not enter passport numbers, payment-card
          details, medical information, or other unnecessary sensitive data in free text fields.
        </p>
        <h3>Location data</h3>
        <p>
          Precise device location is requested only while you actively use a nearby, directions,
          safe-ride, or emergency-location feature and grant foreground permission. Coordinates may
          be sent to AttraVoya Pro and the selected mapping or place provider to answer that
          request. Background location permission is blocked. AttraVoya Pro does not build a
          continuous location-history profile.
        </p>
        <h3>Technical and preference data</h3>
        <p>
          The website uses essential authentication and security cookies. Optional language,
          currency, theme, consent, and limited recent-search preferences can be stored locally on
          your device. Optional storage is off until allowed where consent is required. The mobile
          application stores session credentials in the operating system&apos;s encrypted secure
          storage.
        </p>
      </section>

      <section className={styles.section} id="how-we-use-data">
        <h2>How and why we use data</h2>
        <p>We use personal data only for defined purposes:</p>
        <ul>
          <li>create and secure your account, verify email, and recover access;</li>
          <li>provide saved trips, budgets, preferences, and travel-planning results;</li>
          <li>
            answer requested location, weather, map, event, news, image, or translation queries;
          </li>
          <li>
            maintain security, prevent abuse, diagnose failures, and protect service availability;
          </li>
          <li>manage subscriptions when paid plans are introduced; and</li>
          <li>meet legal obligations and respond to valid data-protection requests.</li>
        </ul>
        <p>
          Depending on the activity, processing is necessary to perform the service you request,
          protect the legitimate interests of users and the service, comply with law, or act on
          consent where consent is required. AttraVoya Pro does not sell personal data and does not
          currently enable advertising or optional analytics tracking.
        </p>
      </section>

      <section className={styles.section} id="providers">
        <h2>Service providers and data sharing</h2>
        <p>
          We share only the information required to perform a requested function. Current provider
          integrations can include Geoapify for maps and places, Open-Meteo for weather, Frankfurter
          for currency rates, LibreTranslate for traveller-requested translation, Ticketmaster for
          events, NewsData.io for news, Pexels for destination imagery, and Resend for transactional
          account email. PostgreSQL hosting, application hosting, monitoring, and backup providers
          may process protected service data on our behalf when production deployment is configured.
        </p>
        <p>
          Traveller-entered translation text is not cached by AttraVoya Pro. Provider credentials
          remain server-side. Before production launch, each enabled provider must pass a privacy,
          contractual, data-region, and international-transfer review.
        </p>
      </section>

      <section className={styles.section} id="retention">
        <span className={styles.sectionIcon} aria-hidden="true">
          <LockKeyhole size={22} />
        </span>
        <h2>Retention, security, and deletion</h2>
        <p>
          Account and saved travel data are retained while your account is active or until no longer
          needed for the purpose described here. Verification, password-reset, and session records
          have enforced expiry times and cannot be used after expiry. Before public launch, this
          policy will be updated with the verified cleanup and backup-retention schedules of the
          selected production hosting providers.
        </p>
        <p>
          We use access controls, encrypted transport, protected password hashing, hashed refresh
          credentials, secure cookies, encrypted mobile credential storage, input validation,
          redacted logs, rate limiting, and tested backup and recovery procedures. No internet
          service can promise absolute security, but failures are contained and monitored without
          intentionally placing private travel content or credentials in ordinary logs.
        </p>
        <p>
          You can permanently delete your account inside the mobile application or through the
          public web deletion flow. Deletion removes trips, plans, favourites, searches,
          subscription records, profile data, roles, tokens, and sessions. A non-identifying audit
          anchor can remain to preserve database and security integrity.
        </p>
        <Link className="button button--dark" href="/delete-account">
          Open account deletion
        </Link>
      </section>

      <section className={styles.section} id="your-rights">
        <h2>Your data-protection rights</h2>
        <p>
          Depending on your location, including under the General Data Protection Regulation (GDPR),
          you may request access, correction, deletion, restriction, portability, or object to
          certain processing. You may withdraw consent without affecting earlier lawful processing
          and complain to your local data-protection authority. We may need to verify your identity
          before fulfilling a request.
        </p>
        <h3>Children</h3>
        <p>
          AttraVoya Pro is not directed to children who are legally unable to create their own
          account. An adult planner may provide a child&apos;s age to produce suitable family travel
          planning. The service does not require a child&apos;s name, contact details, or account.
        </p>
      </section>

      <section className={styles.section} id="contact">
        <span className={styles.sectionIcon} aria-hidden="true">
          <MapPin size={22} />
        </span>
        <h2>Privacy contact and policy changes</h2>
        {privacyEmail ? (
          <p>
            For privacy questions or rights requests, email{' '}
            <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. Do not send passwords, security
            tokens, passport details, or payment-card information.
          </p>
        ) : (
          <p>
            Before public release, the deployed website will display the verified privacy email
            configured by the AttraVoya Pro operator. Until then, use the verified developer contact
            supplied with the official application store listing. Do not publish personal data in a
            public issue or review.
          </p>
        )}
        <p>
          We will update the effective date when this policy materially changes. Important changes
          will be communicated through the application or another appropriate channel before they
          take effect when required by law.
        </p>
      </section>
    </article>
  );
}

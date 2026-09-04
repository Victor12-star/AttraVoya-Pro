import Link from 'next/link';
import {
  ArrowUpRight,
  BedDouble,
  Building2,
  HeartHandshake,
  Languages,
  MapPinned,
  ShieldCheck,
  ShoppingBag,
  TrainFront,
  WalletCards,
} from 'lucide-react';

import { getCountryDisplayName } from '@attravoya/localization';

import { BudgetQuickForm } from '../../features/home/budget-quick-form.jsx';
import { RecentSearches } from '../../features/home/recent-searches.jsx';
import { SearchExperience } from '../../features/home/search-experience.jsx';
import { getRequestLocale } from '../../i18n/request-locale.js';
import { loadMessages } from '../../i18n/messages.js';

const DESTINATIONS = [
  {
    city: 'Barcelona',
    country: 'ES',
    image:
      'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    city: 'Kyoto',
    country: 'JP',
    image:
      'https://images.pexels.com/photos/402028/pexels-photo-402028.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    city: 'Cape Town',
    country: 'ZA',
    image:
      'https://images.pexels.com/photos/259447/pexels-photo-259447.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

export default async function HomePage() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);

  return (
    <>
      <section className="hero-section">
        <div className="hero-section__image" aria-hidden="true" />
        <div className="hero-section__veil" aria-hidden="true" />
        <div className="shell hero-section__content">
          <div className="hero-copy">
            <h1>{messages.home.heroTitle}</h1>
            <p>{messages.home.budgetDescription}</p>
            <div className="hero-copy__actions">
              <Link className="button button--accent" href="/plan-by-budget">
                <WalletCards size={18} /> {messages.home.budgetCta}
              </Link>
              <a className="button button--glass" href="#travel-search">
                {messages.home.exploreCta} <ArrowUpRight size={17} />
              </a>
            </div>
          </div>
          <SearchExperience messages={messages} />
          <RecentSearches messages={messages.common} />
        </div>
      </section>

      <section className="section section--budget">
        <div className="shell split-heading">
          <div>
            <span className="eyebrow">{messages.budget.title}</span>
            <h2>{messages.home.budgetTitle}</h2>
          </div>
          <p>{messages.home.budgetDescription}</p>
        </div>
        <div className="shell">
          <BudgetQuickForm messages={messages} />
        </div>
      </section>

      <section className="section">
        <div className="shell section-heading">
          <div>
            <span className="eyebrow">AttraVoya Pro</span>
            <h2>{messages.home.trending}</h2>
          </div>
          <Link className="text-link" href="/explore">
            {messages.home.exploreCta} <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="shell destination-grid">
          {DESTINATIONS.map((destination) => (
            <Link
              className="destination-card"
              href={`/explore?destination=${encodeURIComponent(destination.city)}`}
              key={destination.city}
            >
              <span
                className="destination-card__image"
                style={{ backgroundImage: `url(${destination.image})` }}
                aria-hidden="true"
              />
              <span className="destination-card__scrim" aria-hidden="true" />
              <span className="destination-card__content">
                <strong>{destination.city}</strong>
                <span>{getCountryDisplayName(destination.country, locale)}</span>
              </span>
              <span className="destination-card__action" aria-hidden="true">
                <ArrowUpRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section section--editorial">
        <div className="shell editorial-grid">
          <div className="editorial-image editorial-image--stay" aria-hidden="true" />
          <div className="editorial-copy">
            <span className="eyebrow">
              <BedDouble size={15} /> {messages.navigation.stays}
            </span>
            <h2>{messages.home.stayNear}</h2>
            <div className="feature-chips">
              <span>{messages.stays.breakfastIncluded}</span>
              <span>{messages.stays.kitchen}</span>
              <span>{messages.stays.entirePlace}</span>
              <span>{messages.stays.longStay}</span>
            </div>
            <p>{messages.home.stayDescription}</p>
            <Link className="button button--dark" href="/stays">
              {messages.navigation.stays} <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell section-heading">
          <div>
            <span className="eyebrow">
              <HeartHandshake size={15} /> {messages.budget.children}
            </span>
            <h2>{messages.home.family}</h2>
          </div>
        </div>
        <div className="shell family-band">
          <div className="family-band__image" aria-hidden="true" />
          <div className="family-band__content">
            <div className="family-band__numbers">
              <span>0–3</span>
              <span>4–8</span>
              <span>9–12</span>
              <span>13–17</span>
            </div>
            <p>{messages.home.familyDescription}</p>
            <Link className="button button--light" href="/family">
              {messages.home.family} <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--tools">
        <div className="shell section-heading section-heading--light">
          <div>
            <span className="eyebrow">{messages.home.tools}</span>
            <h2>{messages.home.tools}</h2>
          </div>
        </div>
        <div className="shell tool-grid">
          <Link href="/nearby">
            <MapPinned />
            <strong>{messages.navigation.nearby}</strong>
            <ArrowUpRight />
          </Link>
          <Link href="/currency">
            <WalletCards />
            <strong>{messages.common.chooseCurrency}</strong>
            <ArrowUpRight />
          </Link>
          <Link href="/language">
            <Languages />
            <strong>{messages.common.chooseLanguage}</strong>
            <ArrowUpRight />
          </Link>
          <Link href="/things-to-do">
            <ShoppingBag />
            <strong>{messages.navigation.thingsToDo}</strong>
            <ArrowUpRight />
          </Link>
          <Link href="/stays">
            <Building2 />
            <strong>{messages.navigation.stays}</strong>
            <ArrowUpRight />
          </Link>
          <Link href="/transport">
            <TrainFront />
            <strong>{messages.home.local}</strong>
            <ArrowUpRight />
          </Link>
        </div>
      </section>

      <section className="section section--safety">
        <div className="shell safety-panel">
          <div className="safety-panel__icon">
            <ShieldCheck size={30} />
          </div>
          <div>
            <span className="eyebrow">{messages.safety.verifiedOnly}</span>
            <h2>{messages.home.safety}</h2>
            <div className="safety-points">
              <span>{messages.safety.verifiedEmergency}</span>
              <span>{messages.safety.nearbyHospitals}</span>
              <span>{messages.safety.nearbyPharmacies}</span>
              <span>{messages.safety.nearbyPolice}</span>
            </div>
          </div>
          <Link className="button button--dark" href="/safety">
            {messages.safety.title} <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}

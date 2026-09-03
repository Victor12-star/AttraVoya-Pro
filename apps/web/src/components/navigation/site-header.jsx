'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Coins, Globe2, Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';

import {
  CURRENCY_CODES,
  UI_LOCALES,
  getCurrencyDisplayName,
  getCurrencyMetadata,
} from '@attravoya/localization';

import { readPreferences, savePreferences } from '../../lib/preferences.js';
import { Brand } from '../common/brand.jsx';

function HeaderSelect({ icon, label, value, onChange, children }) {
  return (
    <label className="header-select" title={label}>
      <span className="header-select__icon" aria-hidden="true">{icon}</span>
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={value} onChange={onChange}>
        {children}
      </select>
    </label>
  );
}

export function SiteHeader({ locale, messages, defaultCurrency = 'SEK' }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currency, setCurrency] = useState(defaultCurrency);

  useEffect(() => {
    const stored = readPreferences();
    if (stored.currency) setCurrency(stored.currency);
  }, []);

  const currencyOptions = useMemo(
    () =>
      CURRENCY_CODES.map((code) => ({
        code,
        label: getCurrencyDisplayName(code, locale) ?? code,
        symbol: getCurrencyMetadata(code, locale)?.symbol ?? code,
      })),
    [locale],
  );

  const navigation = [
    ['/', messages.navigation.explore],
    ['/flights', messages.navigation.flights],
    ['/stays', messages.navigation.stays],
    ['/things-to-do', messages.navigation.thingsToDo],
    ['/trips', messages.navigation.trips],
  ];

  function changeLanguage(event) {
    savePreferences({ language: event.target.value });
    router.refresh();
  }

  function changeCurrency(event) {
    const nextCurrency = event.target.value;
    setCurrency(nextCurrency);
    savePreferences({ currency: nextCurrency });
  }

  function toggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }

  return (
    <header className="site-header">
      <div className="site-header__inner shell">
        <Brand />

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map(([href, label]) => (
            <Link href={href} key={href}>{label}</Link>
          ))}
        </nav>

        <div className="site-header__actions">
          <HeaderSelect
            icon={<Globe2 size={17} />}
            label={messages.common.chooseLanguage}
            value={locale}
            onChange={changeLanguage}
          >
            {UI_LOCALES.map((item) => (
              <option key={item.code} value={item.code}>{item.nativeName}</option>
            ))}
          </HeaderSelect>

          <HeaderSelect
            icon={<Coins size={17} />}
            label={messages.common.chooseCurrency}
            value={currency}
            onChange={changeCurrency}
          >
            {currencyOptions.map((item) => (
              <option key={item.code} value={item.code}>{item.code} · {item.label}</option>
            ))}
          </HeaderSelect>

          <button className="icon-button" type="button" onClick={toggleTheme} aria-label="Toggle color theme">
            {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link className="button button--compact button--dark desktop-signin" href="/login">
            {messages.navigation.signIn}
          </Link>

          <button
            className="icon-button mobile-menu-button"
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="mobile-nav-panel">
          <nav className="shell mobile-nav" aria-label="Mobile navigation">
            {navigation.map(([href, label]) => (
              <Link href={href} key={href} onClick={() => setMobileOpen(false)}>{label}</Link>
            ))}
            <Link href="/nearby" onClick={() => setMobileOpen(false)}>{messages.navigation.nearby}</Link>
            <div className="mobile-preferences">
              <label>
                <span>{messages.common.chooseLanguage}</span>
                <select value={locale} onChange={changeLanguage}>
                  {UI_LOCALES.map((item) => (
                    <option key={item.code} value={item.code}>{item.nativeName}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{messages.common.chooseCurrency}</span>
                <select value={currency} onChange={changeCurrency}>
                  {currencyOptions.map((item) => (
                    <option key={item.code} value={item.code}>{item.code} · {item.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <Link className="button button--dark" href="/login" onClick={() => setMobileOpen(false)}>
              {messages.navigation.signIn}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

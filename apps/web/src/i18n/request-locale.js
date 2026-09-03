import { cookies } from 'next/headers';

import { DEFAULT_UI_LOCALE, normalizeLocale } from '@attravoya/localization';

import { LOCALE_PREFERENCE_COOKIE } from './locale-preference.js';

/** Resolve the server-rendered locale before the page is sent to the browser. */
export async function getRequestLocale() {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_PREFERENCE_COOKIE)?.value ?? DEFAULT_UI_LOCALE);
}

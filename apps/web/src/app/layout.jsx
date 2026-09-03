import './globals.css';

import { getTextDirection } from '@attravoya/localization';

import { getRequestLocale } from '../i18n/request-locale.js';
import { ThemeProvider } from '../providers/theme-provider.jsx';

export const metadata = {
  title: {
    default: 'AttraVoya Pro',
    template: '%s · AttraVoya Pro',
  },
  description: 'Budget-aware destination discovery, trip planning, local travel tools and safety support.',
  applicationName: 'AttraVoya Pro',
};

export default async function RootLayout({ children }) {
  const locale = await getRequestLocale();
  const direction = getTextDirection(locale);

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

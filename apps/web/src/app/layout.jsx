import './globals.css';
import './contrast.css';

import { getTextDirection } from '@attravoya/localization';

import { getRequestLocale } from '../i18n/request-locale.js';
import { createRootMetadata } from '../lib/root-metadata.js';
import { ThemeProvider } from '../providers/theme-provider.jsx';

export const metadata = createRootMetadata();

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

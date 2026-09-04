'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Keep theme state at the application boundary so every feature shares the same
 * light/dark/system preference instead of implementing independent toggles.
 */
export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

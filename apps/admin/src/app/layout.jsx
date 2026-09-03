import './globals.css';

export const metadata = {
  title: 'AttraVoya Pro Admin',
  description: 'Secure administration workspace for AttraVoya Pro.',
};

/** @param {{ children: import('react').ReactNode }} props */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

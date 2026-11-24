import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/bricolage-grotesque/wdth.css';
import '@fontsource-variable/source-serif-4/wght.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Boaz Fishing Co. | Summer fishing lessons',
    template: '%s | Boaz Fishing Co.',
  },
  description:
    'Learn to Fish With Boaz: one-on-one fishing lessons for kids ages 4 to 12. Three 45 minute sessions for $100. Book online.',
  openGraph: {
    title: 'Boaz Fishing Co. | Master the water this summer',
    description: 'One-on-one fishing lessons for kids ages 4 to 12. Three 45 minute sessions for $100. Book online in a minute.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#1B3B2B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

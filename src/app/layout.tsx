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
    'Patient, hands-on summer fishing lessons for beginners, kids and anglers ready to land bigger fish. All gear provided. Book your lesson online.',
  openGraph: {
    title: 'Boaz Fishing Co. | Master the water this summer',
    description: 'Hands-on fishing lessons for every skill level. All gear provided. Book online in a minute.',
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

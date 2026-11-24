import { getPackage } from '@/lib/packages';
import { PHOTO_SLOT_IDS, type PublicPhoto } from '@/lib/types';
import { bookableDays } from '@/server/availability';
import { businessNow } from '@/server/clock';
import { readDb } from '@/server/db';
import { getPublicPhotos } from '@/server/photos';
import { BookingProvider } from '@/components/site/BookingContext';
import { Faq } from '@/components/site/Faq';
import { Footer } from '@/components/site/Footer';
import { Gallery } from '@/components/site/Gallery';
import { Header } from '@/components/site/Header';
import { Hero } from '@/components/site/Hero';
import { MeetBoaz } from '@/components/site/MeetBoaz';
import { MobileBookBar } from '@/components/site/MobileBookBar';
import { Program } from '@/components/site/Program';
import { WhereWeMeet } from '@/components/site/WhereWeMeet';
import { Reviews } from '@/components/site/Reviews';
import { WhyBoaz } from '@/components/site/WhyBoaz';
import { Booking } from '@/components/site/booking/Booking';

// Always render fresh: photo swaps and the "next open spot" must reflect the admin's latest changes.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const db = await readDb();
  const photos = getPublicPhotos(db);
  const next = bookableDays(db, getPackage('session-1')!, businessNow()).next;

  const gallery: PublicPhoto[] = PHOTO_SLOT_IDS.filter((id) => id.startsWith('gallery-'))
    .map((id) => photos[id])
    .filter((p) => !!p.src);

  return (
    <BookingProvider>
      <Header />
      <main>
        <Hero photo={photos.hero} next={next} />
        <WhyBoaz />
        <Program />
        <WhereWeMeet />
        <MeetBoaz photo={photos.bio} />
        <Gallery photos={gallery} />
        <Reviews />
        <Faq />
        <Booking />
      </main>
      <Footer />
      <MobileBookBar />
    </BookingProvider>
  );
}

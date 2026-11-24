// All the marketing copy lives here. Edit freely: the site picks it up on the next reload.
// Prices and lesson details live in src/lib/packages.ts.

export const BRAND = {
  name: 'Boaz Fishing Co.',
  short: 'Boaz Fishing Co.',
};

/**
 * Where lessons meet. When you have the exact street address, fill in `address` and it is added everywhere:
 * the website, the booking summary, every email, and the calendar invites.
 */
export const MEETING = {
  spot: 'Under the pavilion near the dock',
  road: 'the end of Red Tide Road',
  area: 'Oyster Point neighborhood',
  address: '',
  /** What the Open in Maps button searches for. */
  mapQuery: 'Red Tide Road, Oyster Point',
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "Under the pavilion near the dock at the end of Red Tide Road, Oyster Point neighborhood" */
export const meetingFull = (): string => [`${MEETING.spot} at ${MEETING.road}`, MEETING.area, MEETING.address].filter(Boolean).join(', ');
/** "At the end of Red Tide Road, Oyster Point neighborhood" */
export const meetingWhere = (): string => [cap(`at ${MEETING.road}`), MEETING.area, MEETING.address].filter(Boolean).join(', ');
export const meetingMapUrl = (): string => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MEETING.address ? `${MEETING.address} ${MEETING.area}` : MEETING.mapQuery)}`;

/** What a guest is told about where to meet. See src/server/meeting.ts for the per-lesson (private) version. */
export interface MeetingInfo {
  /** Where to meet, e.g. "Out front of the house" */
  full: string;
  /** Same, starting lower case, for the middle of a sentence. */
  lower: string;
  mapUrl: string;
  /** Extra line shown with it, if any. */
  note: string | null;
  /** One short phrase for tight spaces. */
  short: string;
}

export const NAV = [
  { href: '#why', label: 'Why Boaz' },
  { href: '#lessons', label: 'Lessons' },
  { href: '#where', label: 'Where' },
  { href: '#meet', label: 'Meet Boaz' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#reviews', label: 'Reviews' },
  { href: '#faq', label: 'FAQ' },
];

export const HERO = {
  headline: 'Master the water this summer with Boaz Fishing Co.',
  sub: 'Patient, hands-on fishing lessons at the dock and the neighborhood pond, for first-timers, kids and anglers ready to land bigger fish. Rods, reels and bait are provided. You bring the sunscreen.',
  badges: ['100% gear provided', 'All skill levels', 'Summer sessions now open'],
};

export const VALUE_PROPS = {
  gear: {
    title: 'Everything you need is provided',
    body: 'Show up and fish. Rods, reels, hooks and fresh cut and live bait are covered, so nothing stands between you and your first bite.',
    items: ['Rods and reels', 'Cut and live bait', 'Hooks, line and weights', 'Nets and tools'],
  },
  coaching: {
    title: 'Coaching that moves at your speed',
    body: 'One angler or two, always. Boaz breaks every skill into small, fixable steps, so nobody gets rushed, and nobody gets left behind.',
  },
  spots: {
    title: 'Honey holes right in your neighborhood',
    body: 'Skip the guesswork. Boaz teaches at the local docks and neighborhood ponds, and knows which spots are holding fish right now.',
  },
  ethics: {
    title: 'Catch and release, done right',
    body: 'Learn to handle, photograph and release fish quickly and safely, so the ones you catch today are still out there tomorrow.',
  },
};

/** The First Cast progression: shown on the site and repeated in the student's emails. */
export const BEGINNER_PATH = {
  heading: 'Start in the backyard. Finish at the pond.',
  intro:
    'First Cast is built for first-timers and the parents who worry about them: a calm, step-by-step lesson with no pressure, no snags, and a real fish waiting at the end.',
  steps: [
    {
      title: 'Backyard training',
      body: 'Every lesson starts in a relaxed backyard setup. With no trees, weeds or water to snag, beginners can focus on casting mechanics, accuracy and knot tying, and make their mistakes where they cost nothing.',
      points: ['Casting mechanics and accuracy', 'Knots you can trust', 'No snags, no stress'],
    },
    {
      title: 'Fish the pond',
      body: 'Once your casting is dialed in and looking sharp, Boaz walks you over to the pond so you can put your new skills to work with real bait and go after real fish.',
      points: ['Bait your own hook', 'Set the hook and reel it in', 'Handle and release with care'],
    },
  ],
  gate: 'Pond time starts when your casting is ready. Boaz decides with you, never by the clock.',
  reassurance: ['Safe and supportive for kids and nervous beginners', 'One or two students per lesson', 'Rods, reels and bait provided'],
};

export const MEET = {
  heading: 'Meet Boaz, the guy who would rather watch you land a fish than land one himself.',
  paragraphs: [
    'Every summer, Boaz is out at the local docks and neighborhood ponds from first light to sunset. Teaching is the part he loves most.',
    'He coaches the way good mentors do: show it once, let you try, fix one thing at a time. No jargon, no rushing, and no judgment when the line tangles. (It will tangle. That is part of the lesson.)',
    'Whether you are nine or ninety, you will learn to cast, tie a knot you can trust, read the water and handle a fish with care. You will also learn why the fish were where they were, so next time you can find them yourself.',
  ],
  takeaways: ['A cast you trust', 'Two knots that hold', 'An eye for the water', 'Fish handled the right way'],
};

export const REVIEWS = [
  {
    quote:
      'My daughter is eight and had never held a rod. Boaz had her casting on her own in ten minutes and baiting her own hook by the end. She has not stopped talking about it.',
    name: 'Dana R.',
    context: 'Parent of a first-time angler, First Cast',
  },
  {
    quote:
      'I have fished for years and still learned more in one Summer Angler morning than in five seasons of guessing. The structure tips alone paid for the trip.',
    name: 'Marcus T.',
    context: 'Summer Angler',
  },
  {
    quote:
      'I booked the Sunset Session for me and my son. Forty-five quiet minutes at the pond, and Boaz kept him laughing and catching the whole time. We are already planning next summer.',
    name: 'Tomas A.',
    context: 'Sunset Session, parent and son',
  },
];

export const FAQS = [
  {
    q: 'How does the beginner lesson work?',
    a: 'First Cast starts in a relaxed backyard setup, where you learn casting mechanics, accuracy and knot tying with no snags and no pressure. Once your casting is sharp, Boaz takes you over to the pond to fish with real bait and land real fish. It is a safe, step-by-step progression that works well for kids and nervous first-timers.',
  },
  {
    q: 'Why do the Summer Angler and Sunset Session times change from day to day?',
    a: 'Those two lessons are timed to the tide. Boaz starts them 1 to 2 hours before high tide, when moving water pushes bait and fish in close. Because high tide shifts about 50 minutes later each day, the start times you see on the calendar shift with it. First Cast is not tide-timed.',
  },
  {
    q: 'What happens if the weather is bad?',
    a: 'Safety comes first. If lightning, high winds or heavy rain are in the forecast, Boaz will message you the morning of your lesson and move it to another open date at no charge. Light rain and overcast skies often fish great, so we go unless it is unsafe.',
  },
  {
    q: 'Where do lessons meet?',
    a: 'Summer Angler and Sunset Session meet under the pavilion near the dock at the end of Red Tide Road, in the Oyster Point neighborhood. First Cast starts with backyard training, so the exact meeting address for your beginner lesson appears on your booking confirmation and in your emails. Boaz will text or email you the day before, along with a weather check.',
  },
  {
    q: 'What should we bring?',
    a: 'Sunscreen, a hat, polarized sunglasses if you have them, water, snacks and flat-soled shoes with grip. Rods, reels and bait are all provided. A small cooler is handy if you plan to keep a legal catch.',
  },
  {
    q: 'What ages can join?',
    a: 'All ages. Kids as young as five do great with a parent beside them, and Boaz adjusts the pace and the gear to fit. Each lesson fits one or two anglers, and a parent can join in or just watch. Teens and adults get the full technique deep dive. Put everyone’s ages in the booking notes so he can plan.',
  },
  {
    q: 'Do I need a fishing license?',
    a: 'No. You do not need a fishing license for your lesson with Boaz. Just show up ready to fish.',
  },
  {
    q: 'How do payment and cancellations work?',
    a: 'You do not pay to reserve a time. Settle up with Boaz in person at your lesson. If plans change, let him know at least 24 hours ahead and the time goes straight back on the calendar for someone else.',
  },
];

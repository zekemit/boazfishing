// All the words on the public site live here, so they are easy to find and change.

export const BRAND = {
  name: 'Boaz Fishing Co.',
  short: 'Boaz Fishing Co.',
};

/**
 * Where lessons meet. When you have the exact street address, fill in `address` and it is added everywhere:
 * the website, the booking summary, every email, and the calendar invites.
 * (Session 1 of the program meets somewhere else, shown only after booking: see src/server/meeting.ts.)
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

/** What a guest is told about where to meet. See src/server/meeting.ts for the per-session (private) version. */
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
  { href: '#program', label: 'The program' },
  { href: '#where', label: 'Where' },
  { href: '#meet', label: 'Meet Boaz' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#reviews', label: 'Reviews' },
  { href: '#faq', label: 'FAQ' },
];

export const HERO = {
  headline: 'Master the water this summer with Boaz Fishing Co.',
  sub: "One-on-one fishing lessons for kids ages 4 to 12. Three 45 minute sessions take a beginner from tying a first knot to fishing with real bait. Don't own a cast net or spinner rod? Boaz can provide them.",
  badges: ['1 on 1 coaching', 'Ages 4 to 12', 'Knot tying jig included'],
};

export const VALUE_PROPS = {
  gear: {
    title: 'Bring a cast net and spinner rod, or use Boaz’s',
    body: 'No gear yet? No problem. Boaz can provide a cast net and spinner rod, and the program includes a practice knot tying jig so the knots keep getting better between sessions.',
    items: ['Cast net and spinner rod', 'Practice knot tying jig included', 'Palmer and improved clinch knots', 'Carolina, double drop and popping cork rigs'],
  },
  coaching: {
    title: '1 on 1 coaching, at the learner’s pace',
    body: 'Every session is one-on-one. Boaz breaks each skill into small, fixable steps, and he can adjust the schedule based on the learner’s needs, so nobody gets rushed and nobody gets left behind.',
  },
  spots: {
    title: 'Timed to the tide',
    body: 'Sessions 2 and 3 start 1 to 2 hours before high tide, when moving water pushes bait and fish in close. That is when the learning turns into catching.',
  },
  ethics: {
    title: 'Safe handling and release',
    body: 'Every learner practices removing hooks, handling fish and safe release, so the fish they catch today are still out there tomorrow.',
  },
};

export const MEET = {
  heading: 'Meet Boaz, the guy who would rather watch you land a fish than land one himself.',
  paragraphs: [
    'Boaz teaches kids to fish right in his neighborhood: hands-on practice first, then out on the water by the dock. Teaching is the part he loves most.',
    'He coaches the way good mentors do: show it once, let you try, fix one thing at a time. No jargon, no rushing, and no judgment when the line tangles. (It will tangle. That is part of the lesson.)',
    'In three 45 minute sessions, a learner picks up two knots that hold, how to cast a spinner rod and a cast net, three rigs that work around Charleston, and how to handle a fish with care.',
  ],
  takeaways: ['A cast you trust', 'Two knots that hold', 'Three rigs that work', 'Fish handled the right way'],
};

export const REVIEWS = [
  {
    quote:
      'My daughter is seven and had never held a rod. By the end of session one she tied a knot on her own and cast a spinner rod. By session three she was throwing the cast net for bait. She has not stopped talking about it.',
    name: 'Dana R.',
    context: 'Parent, Learn to Fish With Boaz',
  },
  {
    quote:
      'The knot jig was a hit. My son practiced his Palmer knot every night between sessions, and Boaz was patient with every tangle. It is the best hundred dollars we spent all summer.',
    name: 'Marcus T.',
    context: 'Parent of a 10 year old',
  },
  {
    quote:
      'Sessions 2 and 3 on the incoming tide were the best part. Boaz had my son throwing a cast net and fishing like he had done it for years. We are already planning next summer.',
    name: 'Tomas A.',
    context: 'Parent of an 8 year old',
  },
];

export const FAQS = [
  {
    q: 'How does the program work?',
    a: 'Learn to Fish With Boaz is three one-on-one sessions, 45 minutes each, for $100 in total. Session 1 covers knot tying, the basics of a spinning rod and how to cast. Session 2 covers three basic rigs and fishing for bait, including catching bait with a cast net. Session 3 puts it together: a better knot, then fishing with Boaz beside you. Boaz can adjust the schedule based on the learner’s needs.',
  },
  {
    q: 'How old does my child need to be?',
    a: 'The program is built for ages 4 to 12, and every session is one-on-one, so Boaz can match the pace to your learner.',
  },
  {
    q: 'What should we bring?',
    a: 'A cast net and a spinner rod. If you do not have these, Boaz can provide them. The program also includes a practice knot tying jig.',
  },
  {
    q: 'Why do the times for sessions 2 and 3 change from day to day?',
    a: 'Those two sessions are timed to the tide. Boaz starts them 1 to 2 hours before high tide, when moving water pushes bait and fish in close. Because high tide shifts about 50 minutes later each day, the start times you see on the calendar shift with it. Session 1 is not tide-timed.',
  },
  {
    q: 'Where do sessions meet?',
    a: 'Sessions 2 and 3 meet under the pavilion near the dock at the end of Red Tide Road, in the Oyster Point neighborhood. Session 1 is hands-on practice, so its meeting address appears on your booking confirmation and in your emails. Boaz will text or email you the day before, along with a weather check.',
  },
  {
    q: 'Do I book all three sessions at once?',
    a: 'Yes. You choose a time for each of the three sessions when you book, and each one needs to be on a later day than the one before. If you need to move a session later, text Boaz.',
  },
  {
    q: 'What happens if the weather is bad?',
    a: 'Safety comes first. If lightning, high winds or heavy rain are in the forecast, Boaz will message you the morning of your session and move it to another open date at no charge. Light rain and overcast skies often fish great, so we go unless it is unsafe.',
  },
  {
    q: 'Do I need a fishing license?',
    a: 'No. You do not need a fishing license for your lessons with Boaz. Just show up ready to fish.',
  },
  {
    q: 'How do payment and cancellations work?',
    a: 'You do not pay to reserve your times. The program is $100 for all three sessions, and you settle up with Boaz in person. If plans change, cancel at least 24 hours ahead with the link in your confirmation email, or text Boaz, and the times go straight back on the calendar for someone else.',
  },
];

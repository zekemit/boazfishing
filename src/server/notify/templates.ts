import type { Booking } from '@/lib/types';
import { getPackage } from '@/lib/packages';
import { BEGINNER_PATH, meetingFull, meetingMapUrl } from '@/content/site';
import { fmt12, fmtDateLong, fmtDateShort, fmtRange } from '@/lib/time';
import { boazEmail, boazPhone, prettyPhone, siteUrl } from './config';

export interface Message {
  subject: string;
  text: string;
  html: string;
}

const BRING = ['Sunscreen and a hat', 'Water and a snack', 'Flat-soled shoes with grip', 'Polarized sunglasses, if you have them'];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function contact(): { text: string; html: string } {
  const phone = boazPhone();
  const email = boazEmail();
  const bits = [phone && `Text or call Boaz: ${prettyPhone(phone)}`, email && `Email: ${email}`].filter(Boolean) as string[];
  return {
    text: bits.join('\n'),
    html: bits.map((b) => `<div>${esc(b)}</div>`).join(''),
  };
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#FAF8F5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1F2A26">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#1B3B2B;color:#fff;border-radius:12px 12px 0 0;padding:20px 24px"><div style="font-size:20px;font-weight:800">Boaz Fishing Co.</div><div style="opacity:.8;font-size:14px;margin-top:2px">${esc(title)}</div></div>
<div style="background:#fff;border:1px solid #DDD5C6;border-top:0;border-radius:0 0 12px 12px;padding:24px;line-height:1.55;font-size:16px">${bodyHtml}</div>
<div style="text-align:center;color:#66726C;font-size:13px;margin-top:16px"><a href="${siteUrl()}" style="color:#66726C">${esc(siteUrl().replace(/^https?:\/\//, ''))}</a></div>
</div></body></html>`;
}

/** The cancel-my-lesson link block, for text and HTML. Empty when there is no link (test emails). */
function cancelBlock(url?: string): { text: string; html: string } {
  if (!url) return { text: '', html: '' };
  return {
    text: `Can't make it? Cancel here (at least 24 hours ahead): ${url}`,
    html: `<p style="color:#46534D;margin:14px 0 0">Can't make it? <a href="${url}" style="color:#B45309;font-weight:700">Cancel my lesson</a> (at least 24 hours ahead).</p>`,
  };
}

const row = (k: string, v: string) =>
  `<tr><td style="padding:6px 12px 6px 0;color:#66726C;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`;

function details(b: Booking): [string, string][] {
  const pkg = getPackage(b.packageId);
  return [
    ['Lesson', `${pkg?.name ?? ''} (${pkg?.durationLabel ?? ''})`],
    ['When', `${fmtDateLong(b.date)}, ${fmtRange(b.start, b.end)}`],
    ['Where to meet', meetingFull()],
    ['Anglers', String(b.anglers)],
    ['Due in person', `$${b.totalPrice}`],
    ['Confirmation code', b.code],
  ];
}

function beginner(b: Booking): { text: string; html: string } | null {
  if (b.packageId !== 'first-cast') return null;
  const [a, p] = BEGINNER_PATH.steps;
  return {
    text: `HOW YOUR FIRST CAST LESSON WORKS\n1. ${a.title}: ${a.body}\n2. ${p.title}: ${p.body}\n${BEGINNER_PATH.gate}`,
    html: `<div style="background:#EEF3EF;border-radius:10px;padding:16px 18px;margin:18px 0"><div style="font-weight:800;margin-bottom:6px">How your First Cast lesson works</div>
<div style="margin-bottom:8px"><strong>1. ${esc(a.title)}.</strong> ${esc(a.body)}</div>
<div style="margin-bottom:8px"><strong>2. ${esc(p.title)}.</strong> ${esc(p.body)}</div>
<div style="color:#46534D">${esc(BEGINNER_PATH.gate)}</div></div>`,
  };
}

export function studentConfirmation(b: Booking, cancelUrl?: string): Message {
  const pkg = getPackage(b.packageId);
  const first = b.name.trim().split(/\s+/)[0];
  const bp = beginner(b);
  const c = contact();
  const subject = `You're booked: ${pkg?.name ?? 'Fishing lesson'} on ${fmtDateShort(b.date)} at ${fmt12(b.start)}`;
  const text = [
    `Hi ${first},`,
    '',
    `You're on the schedule! Meet ${meetingFull().charAt(0).toLowerCase() + meetingFull().slice(1)}. Boaz will text or email you to confirm.`,
    '',
    ...details(b).map(([k, v]) => `${k}: ${v}`),
    '',
    ...(bp ? [bp.text, ''] : []),
    'WHAT TO BRING',
    ...BRING.map((x) => `- ${x}`),
    'Rods, reels and bait are all provided.',
    '',
    'Need to change plans? Text Boaz at least 24 hours ahead and the time goes back on the calendar. Bad weather? He will move you to another day at no charge.',
    ...(cancelBlock(cancelUrl).text ? [cancelBlock(cancelUrl).text] : []),
    '',
    c.text,
  ].join('\n');
  const html = shell(
    'Your lesson is booked',
    `<p style="margin-top:0">Hi ${esc(first)},</p><p>You're on the schedule! Meet <strong>${esc(meetingFull().charAt(0).toLowerCase() + meetingFull().slice(1))}</strong>. Boaz will text or email you to confirm.</p>
<table style="border-collapse:collapse;margin:8px 0">${details(b).map(([k, v]) => row(k, v)).join('')}</table>
${bp?.html ?? ''}
<div style="font-weight:800;margin-top:18px">What to bring</div><ul style="margin:6px 0 0;padding-left:20px">${BRING.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<p style="margin:6px 0 0">Rods, reels and bait are all provided.</p>
<p style="color:#46534D">Need to change plans? Text Boaz at least 24 hours ahead and the time goes back on the calendar. Bad weather? He will move you to another day at no charge.</p>
${cancelBlock(cancelUrl).html}
<div style="border-top:1px solid #EBE5DA;margin-top:18px;padding-top:14px;color:#46534D">${c.html}</div>`,
  );
  return { subject, text, html };
}

export function studentReminder(b: Booking, cancelUrl?: string): Message {
  const pkg = getPackage(b.packageId);
  const first = b.name.trim().split(/\s+/)[0];
  const c = contact();
  const bp = b.packageId === 'first-cast' ? 'Your First Cast lesson starts in a relaxed backyard setup, then moves to the pond once your casting is sharp.' : '';
  const subject = `Reminder: ${pkg?.name ?? 'Fishing lesson'} ${fmtDateShort(b.date)} at ${fmt12(b.start)}`;
  const text = [
    `Hi ${first},`,
    '',
    `A quick reminder that your ${pkg?.name} lesson is coming up: ${fmtDateLong(b.date)}, ${fmtRange(b.start, b.end)}.`,
    ...(bp ? ['', bp] : []),
    '',
    'Bring: ' + BRING.join(', ').toLowerCase() + '. Everything else is provided.',
    "If the weather looks rough, Boaz will message you. Otherwise we'll see you there.",
    ...(cancelBlock(cancelUrl).text ? [cancelBlock(cancelUrl).text] : []),
    '',
    c.text,
  ].join('\n');
  const html = shell(
    'See you soon',
    `<p style="margin-top:0">Hi ${esc(first)},</p><p>A quick reminder that your <strong>${esc(pkg?.name ?? '')}</strong> lesson is coming up.</p>
<table style="border-collapse:collapse;margin:8px 0">${details(b).slice(0, 3).map(([k, v]) => row(k, v)).join('')}</table>
${bp ? `<p style="background:#EEF3EF;border-radius:10px;padding:12px 16px">${esc(bp)}</p>` : ''}
<p><strong>Bring:</strong> ${esc(BRING.join(', ').toLowerCase())}. Everything else is provided.</p>
<p style="color:#46534D">If the weather looks rough, Boaz will message you. Otherwise we'll see you there.</p>
${cancelBlock(cancelUrl).html}
<div style="border-top:1px solid #EBE5DA;margin-top:18px;padding-top:14px;color:#46534D">${c.html}</div>`,
  );
  return { subject, text, html };
}

/** Plain-text alert for Boaz's phone. Kept short enough for a text message. */
export function boazAlert(b: Booking): { title: string; text: string } {
  const pkg = getPackage(b.packageId);
  return {
    title: `New booking: ${b.name}`,
    text: `${b.name}, ${b.phone}. ${pkg?.name}, ${fmtDateShort(b.date)} at ${fmt12(b.start)}, ${b.anglers} angler${b.anglers === 1 ? '' : 's'}. Code ${b.code}.`,
  };
}

export function boazAgenda(date: string, lessons: Booking[]): { title: string; text: string } {
  const lines = lessons.map((b) => `${fmt12(b.start)} ${b.name}, ${b.phone}. ${getPackage(b.packageId)?.name}, ${b.anglers} angler${b.anglers === 1 ? '' : 's'}${b.status === 'pending' ? ' (not approved yet)' : ''}`);
  return {
    title: `Today: ${lessons.length} lesson${lessons.length === 1 ? '' : 's'}`,
    text: `${fmtDateShort(date)}\n${lines.join('\n')}`,
  };
}

export function studentApproved(b: Booking, cancelUrl?: string): Message {
  const pkg = getPackage(b.packageId);
  const first = b.name.trim().split(/\s+/)[0];
  const bp = beginner(b);
  const c = contact();
  const subject = `Confirmed: ${pkg?.name ?? 'Fishing lesson'} on ${fmtDateShort(b.date)} at ${fmt12(b.start)}`;
  const text = [
    `Hi ${first},`,
    '',
    'Good news: Boaz has confirmed your lesson. You are all set.',
    '',
    ...details(b).map(([k, v]) => `${k}: ${v}`),
    '',
    ...(bp ? [bp.text, ''] : []),
    'WHAT TO BRING',
    ...BRING.map((x) => `- ${x}`),
    'Rods, reels and bait are all provided.',
    '',
    `Meet ${meetingFull().charAt(0).toLowerCase() + meetingFull().slice(1)}. Map: ${meetingMapUrl()}\nNeed to change plans? Text Boaz at least 24 hours ahead.`,
    ...(cancelBlock(cancelUrl).text ? [cancelBlock(cancelUrl).text] : []),
    '',
    c.text,
  ].join('\n');
  const html = shell(
    'Your lesson is confirmed',
    `<p style="margin-top:0">Hi ${esc(first)},</p><p><strong>Good news: Boaz has confirmed your lesson.</strong> You are all set.</p>
<table style="border-collapse:collapse;margin:8px 0">${details(b).map(([k, v]) => row(k, v)).join('')}</table>
${bp?.html ?? ''}
<div style="font-weight:800;margin-top:18px">What to bring</div><ul style="margin:6px 0 0;padding-left:20px">${BRING.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<p style="margin:6px 0 0">Rods, reels and bait are all provided.</p>
<p style="color:#46534D">Meet <strong>${esc(meetingFull().charAt(0).toLowerCase() + meetingFull().slice(1))}</strong>. <a href="${meetingMapUrl()}" style="color:#B45309;font-weight:700">Open in Maps</a> Need to change plans? Text Boaz at least 24 hours ahead.</p>
${cancelBlock(cancelUrl).html}
<div style="border-top:1px solid #EBE5DA;margin-top:18px;padding-top:14px;color:#46534D">${c.html}</div>`,
  );
  return { subject, text, html };
}

export function studentCancelled(b: Booking): Message {
  const pkg = getPackage(b.packageId);
  const first = b.name.trim().split(/\s+/)[0];
  const c = contact();
  const rebook = `${siteUrl()}/#book`;
  const when = `${fmtDateLong(b.date)}, ${fmtRange(b.start, b.end)}`;
  const subject = `Cancelled: your ${pkg?.name ?? 'fishing'} lesson on ${fmtDateShort(b.date)}`;
  const text = [
    `Hi ${first},`,
    '',
    `Your ${pkg?.name} lesson on ${when} has been cancelled, and that time is open again. You have not been charged anything.`,
    '',
    'We would love to get you on the water another day. Pick a new time here:',
    rebook,
    '',
    `Confirmation code (cancelled): ${b.code}`,
    '',
    'Questions, or was this a surprise? Reach Boaz directly:',
    c.text,
  ].join('\n');
  const html = shell(
    'Your lesson was cancelled',
    `<p style="margin-top:0">Hi ${esc(first)},</p>
<p>Your <strong>${esc(pkg?.name ?? '')}</strong> lesson on <strong>${esc(when)}</strong> has been cancelled, and that time is open again. You have not been charged anything.</p>
<p>We would love to get you on the water another day.</p>
<p style="margin:18px 0"><a href="${rebook}" style="background:#D97706;color:#12281D;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;display:inline-block">Pick a new time</a></p>
<p style="color:#66726C;font-size:14px">Confirmation code (cancelled): ${esc(b.code)}</p>
<div style="border-top:1px solid #EBE5DA;margin-top:18px;padding-top:14px;color:#46534D"><div style="margin-bottom:4px">Questions, or was this a surprise? Reach Boaz directly:</div>${c.html}</div>`,
  );
  return { subject, text, html };
}

/** Alert for Boaz when a student cancels with their link. */
export function boazCancelled(b: Booking): { title: string; text: string } {
  const pkg = getPackage(b.packageId);
  return {
    title: `Cancelled by student: ${b.name}`,
    text: `${b.name}, ${b.phone}. ${pkg?.name}, ${fmtDateShort(b.date)} at ${fmt12(b.start)}. That time is open again.`,
  };
}

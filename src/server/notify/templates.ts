import type { Booking } from '@/lib/types';
import { PROGRAM, getPackage, sessionLabel } from '@/lib/packages';
import { fmt12, fmtDateLong, fmtDateShort, fmtRange } from '@/lib/time';
import { meetingFor } from '../meeting';
import { boazEmail, boazPhone, prettyPhone, siteUrl } from './config';

export interface Message {
  subject: string;
  text: string;
  html: string;
}

const BRING_LINE = `${PROGRAM.bring}. ${PROGRAM.bringNote}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const firstName = (b: Booking) => b.name.trim().split(/\s+/)[0];
const byTime = (list: Booking[]) => [...list].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

function contact(): { text: string; html: string } {
  const phone = boazPhone();
  const email = boazEmail();
  const bits = [phone && `Text or call Boaz: ${prettyPhone(phone)}`, email && `Email: ${email}`].filter(Boolean) as string[];
  return {
    text: bits.join('\n'),
    html: bits.map((b) => `<div>${esc(b)}</div>`).join(''),
  };
}

/** The cancel-my-sessions link block, for text and HTML. Empty when there is no link (test emails). */
function cancelBlock(url?: string): { text: string; html: string } {
  if (!url) return { text: '', html: '' };
  return {
    text: `Can't make it? Cancel here (at least 24 hours ahead): ${url}`,
    html: `<p style="color:#46534D;margin:14px 0 0">Can't make it? <a href="${url}" style="color:#B45309;font-weight:700">Cancel my sessions</a> (at least 24 hours ahead).</p>`,
  };
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#FAF8F5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1F2A26">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#1B3B2B;color:#fff;border-radius:12px 12px 0 0;padding:20px 24px"><div style="font-size:20px;font-weight:800">Boaz Fishing Co.</div><div style="opacity:.8;font-size:14px;margin-top:2px">${esc(title)}</div></div>
<div style="background:#fff;border:1px solid #DDD5C6;border-top:0;border-radius:0 0 12px 12px;padding:24px;line-height:1.55;font-size:16px">${bodyHtml}</div>
</div></body></html>`;
}

const row = (k: string, v: string) =>
  `<tr><td style="padding:4px 12px 4px 0;color:#66726C;vertical-align:top">${esc(k)}</td><td style="padding:4px 0;font-weight:600">${esc(v)}</td></tr>`;

/** One session as a short block: its name, when, and where to meet. */
function sessionBlock(b: Booking): { text: string; html: string } {
  const when = `${fmtDateLong(b.date)}, ${fmtRange(b.start, b.end)}`;
  const where = meetingFor(b.packageId).full;
  const tide = getPackage(b.packageId)?.tideGate?.label;
  return {
    text: [`${sessionLabel(b.packageId)}`, `  When: ${when}`, `  Where: ${where}`, ...(tide ? [`  ${tide}`] : [])].join('\n'),
    html: `<div style="margin:10px 0 0"><div style="font-weight:800">${esc(sessionLabel(b.packageId))}</div><table style="border-collapse:collapse">${row('When', when)}${row('Where', where)}</table>${tide ? `<div style="color:#46534D;font-size:14px">${esc(tide)}</div>` : ''}</div>`,
  };
}

function programSummary(sessions: Booking[]): { text: string; html: string } {
  const list = byTime(sessions);
  const blocks = list.map(sessionBlock);
  const price = `$${PROGRAM.price} for all ${PROGRAM.sessionCount} sessions, due in person. ${PROGRAM.jig}.`;
  const code = list[0]?.code ?? '';
  return {
    text: [`YOUR ${list.length} SESSIONS (${PROGRAM.sessionMinutes} minutes each, ${PROGRAM.format.toLowerCase()})`, '', blocks.map((b) => b.text).join('\n\n'), '', price, `Confirmation code: ${code}`].join('\n'),
    html: `<div style="font-weight:800;margin-top:14px">Your ${list.length} sessions <span style="font-weight:400;color:#66726C">(${PROGRAM.sessionMinutes} minutes each, ${esc(PROGRAM.format.toLowerCase())})</span></div>${blocks.map((b) => b.html).join('')}<p style="margin:14px 0 0">${esc(price)}</p><p style="margin:4px 0 0;color:#66726C;font-size:14px">Confirmation code: ${esc(code)}</p>`,
  };
}

const bringBlock = {
  text: `WHAT TO BRING\n${BRING_LINE}`,
  html: `<div style="font-weight:800;margin-top:18px">What to bring</div><p style="margin:6px 0 0">${esc(BRING_LINE)}</p>`,
};
const flexNote = `${PROGRAM.flexNote} Bad weather? He will move you to another day at no charge.`;

export function studentConfirmation(sessions: Booking[], cancelUrl?: string): Message {
  const list = byTime(sessions);
  const first = firstName(list[0]);
  const c = contact();
  const sum = programSummary(list);
  const subject = `You're booked: ${PROGRAM.name}, starting ${fmtDateShort(list[0].date)} at ${fmt12(list[0].start)}`;
  const text = [
    `Hi ${first},`,
    '',
    `You're on the schedule for ${PROGRAM.name}. Boaz will text or email you to confirm.`,
    '',
    sum.text,
    '',
    bringBlock.text,
    '',
    `Need to change plans? ${flexNote} Text Boaz at least 24 hours ahead to move a session.`,
    ...(cancelBlock(cancelUrl).text ? [cancelBlock(cancelUrl).text] : []),
    '',
    c.text,
  ].join('\n');
  const html = shell(
    'Your sessions are booked',
    `<p style="margin-top:0">Hi ${esc(first)},</p><p>You're on the schedule for <strong>${esc(PROGRAM.name)}</strong>. Boaz will text or email you to confirm.</p>
${sum.html}
${bringBlock.html}
<p style="color:#46534D">Need to change plans? ${esc(flexNote)} Text Boaz at least 24 hours ahead to move a session.</p>
${cancelBlock(cancelUrl).html}
<div style="border-top:1px solid #EBE5DA;margin-top:18px;padding-top:14px;color:#46534D">${c.html}</div>`,
  );
  return { subject, text, html };
}

export function studentApproved(sessions: Booking[], cancelUrl?: string): Message {
  const list = byTime(sessions);
  const first = firstName(list[0]);
  const c = contact();
  const sum = programSummary(list);
  const subject = `Confirmed: ${PROGRAM.name}, starting ${fmtDateShort(list[0].date)} at ${fmt12(list[0].start)}`;
  const text = [
    `Hi ${first},`,
    '',
    'Good news: Boaz has confirmed your sessions. You are all set.',
    '',
    sum.text,
    '',
    bringBlock.text,
    '',
    `Maps: session 1 ${meetingFor('session-1').mapUrl}`,
    `Maps: sessions 2 and 3 ${meetingFor('session-2').mapUrl}`,
    '',
    `Need to change plans? Text Boaz at least 24 hours ahead. ${PROGRAM.flexNote}`,
    ...(cancelBlock(cancelUrl).text ? [cancelBlock(cancelUrl).text] : []),
    '',
    c.text,
  ].join('\n');
  const html = shell(
    'Your sessions are confirmed',
    `<p style="margin-top:0">Hi ${esc(first)},</p><p><strong>Good news: Boaz has confirmed your sessions.</strong> You are all set.</p>
${sum.html}
${bringBlock.html}
<p style="margin:14px 0 0"><a href="${meetingFor('session-1').mapUrl}" style="color:#B45309;font-weight:700">Map for session 1</a> &nbsp;|&nbsp; <a href="${meetingFor('session-2').mapUrl}" style="color:#B45309;font-weight:700">Map for sessions 2 and 3</a></p>
<p style="color:#46534D">Need to change plans? Text Boaz at least 24 hours ahead. ${esc(PROGRAM.flexNote)}</p>
${cancelBlock(cancelUrl).html}
<div style="border-top:1px solid #EBE5DA;margin-top:18px;padding-top:14px;color:#46534D">${c.html}</div>`,
  );
  return { subject, text, html };
}

/** Day-before reminder for one session. */
export function studentReminder(b: Booking, cancelUrl?: string): Message {
  const first = firstName(b);
  const c = contact();
  const pkg = getPackage(b.packageId);
  const blk = sessionBlock(b);
  const subject = `Reminder: ${sessionLabel(b.packageId, false)}, ${fmtDateShort(b.date)} at ${fmt12(b.start)}`;
  const text = [
    `Hi ${first},`,
    '',
    `A quick reminder that ${sessionLabel(b.packageId, false)} of ${PROGRAM.name} is coming up.`,
    '',
    blk.text,
    '',
    `Bring: ${PROGRAM.bring.toLowerCase()}. ${PROGRAM.bringNote}`,
    `Map: ${meetingFor(b.packageId).mapUrl}`,
    "If the weather looks rough, Boaz will message you. Otherwise we'll see you there.",
    ...(cancelBlock(cancelUrl).text ? [cancelBlock(cancelUrl).text] : []),
    '',
    c.text,
  ].join('\n');
  const html = shell(
    'See you soon',
    `<p style="margin-top:0">Hi ${esc(first)},</p><p>A quick reminder that <strong>${esc(sessionLabel(b.packageId, false))}</strong> of ${esc(PROGRAM.name)} is coming up${pkg ? `: ${esc(pkg.title.toLowerCase())}` : ''}.</p>
${blk.html}
<p><strong>Bring:</strong> ${esc(PROGRAM.bring.toLowerCase())}. ${esc(PROGRAM.bringNote)} <a href="${meetingFor(b.packageId).mapUrl}" style="color:#B45309;font-weight:700">Open in Maps</a></p>
<p style="color:#46534D">If the weather looks rough, Boaz will message you. Otherwise we'll see you there.</p>
${cancelBlock(cancelUrl).html}
<div style="border-top:1px solid #EBE5DA;margin-top:18px;padding-top:14px;color:#46534D">${c.html}</div>`,
  );
  return { subject, text, html };
}

export function studentCancelled(sessions: Booking[]): Message {
  const list = byTime(sessions);
  const first = firstName(list[0]);
  const c = contact();
  const rebook = `${siteUrl()}/#book`;
  const lines = list.map((b) => `${sessionLabel(b.packageId, false)}: ${fmtDateLong(b.date)}, ${fmtRange(b.start, b.end)}`);
  const many = list.length > 1;
  const subject = many ? `Cancelled: your ${list.length} Learn to Fish sessions` : `Cancelled: ${sessionLabel(list[0].packageId, false)} on ${fmtDateShort(list[0].date)}`;
  const text = [
    `Hi ${first},`,
    '',
    `${many ? 'These sessions have' : 'This session has'} been cancelled, and ${many ? 'those times are' : 'that time is'} open again. You have not been charged anything for ${many ? 'them' : 'it'}.`,
    '',
    ...lines.map((l) => `- ${l}`),
    '',
    'We would love to get you on the water another day. Pick new times here:',
    rebook,
    '',
    `Confirmation code (cancelled): ${list[0].code}`,
    '',
    'Questions, or was this a surprise? Reach Boaz directly:',
    c.text,
  ].join('\n');
  const html = shell(
    many ? 'Your sessions were cancelled' : 'Your session was cancelled',
    `<p style="margin-top:0">Hi ${esc(first)},</p>
<p>${many ? 'These sessions have' : 'This session has'} been cancelled, and ${many ? 'those times are' : 'that time is'} open again. You have not been charged anything for ${many ? 'them' : 'it'}.</p>
<ul style="margin:8px 0;padding-left:20px">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
<p>We would love to get you on the water another day.</p>
<p style="margin:18px 0"><a href="${rebook}" style="background:#D97706;color:#12281D;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;display:inline-block">Pick new times</a></p>
<p style="color:#66726C;font-size:14px">Confirmation code (cancelled): ${esc(list[0].code)}</p>
<div style="border-top:1px solid #EBE5DA;margin-top:18px;padding-top:14px;color:#46534D"><div style="margin-bottom:4px">Questions, or was this a surprise? Reach Boaz directly:</div>${c.html}</div>`,
  );
  return { subject, text, html };
}

/** Plain-text alert for Boaz's phone. Kept short enough for a text message. */
export function boazAlert(sessions: Booking[]): { title: string; text: string } {
  const list = byTime(sessions);
  const b = list[0];
  const slots = list.map((s) => `${s.sessionNo ? `S${s.sessionNo} ` : ''}${fmtDateShort(s.date)} ${fmt12(s.start)}`).join(', ');
  return {
    title: `New booking: ${b.name}`,
    text: `${b.name}, ${b.phone}. ${PROGRAM.name}, ${list.length} session${list.length === 1 ? '' : 's'}: ${slots}. Code ${b.code}.`,
  };
}

export function boazAgenda(date: string, lessons: Booking[]): { title: string; text: string } {
  const lines = lessons.map(
    (b) => `${fmt12(b.start)} ${b.name}, ${b.phone}. ${sessionLabel(b.packageId, false)}${b.status === 'pending' ? ' (not approved yet)' : ''}. Meet: ${meetingFor(b.packageId).short}`,
  );
  return {
    title: `Today: ${lessons.length} session${lessons.length === 1 ? '' : 's'}`,
    text: `${fmtDateShort(date)}\n${lines.join('\n')}`,
  };
}

/** Alert for Boaz when a family cancels with their link. */
export function boazCancelled(sessions: Booking[]): { title: string; text: string } {
  const list = byTime(sessions);
  const b = list[0];
  return {
    title: `Cancelled by family: ${b.name}`,
    text: `${b.name}, ${b.phone}. Cancelled ${list.length} session${list.length === 1 ? '' : 's'}: ${list.map((s) => `${fmtDateShort(s.date)} ${fmt12(s.start)}`).join(', ')}. Those times are open again.`,
  };
}

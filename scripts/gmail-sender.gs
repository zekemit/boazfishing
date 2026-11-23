// Boaz Fishing Co. email sender. Paste this into script.google.com while signed in as the Gmail
// account the emails should come from, set SECRET below, then Deploy > New deployment > Web app
// (Execute as: Me, Who has access: Anyone). Copy the web app URL into EMAIL_WEBHOOK_URL.
const SECRET = 'PASTE-THE-SECRET-HERE';

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.secret !== SECRET) return reply({ ok: false, error: 'bad secret' });
    if (!d.to || !d.subject) return reply({ ok: false, error: 'missing to/subject' });
    const opts = { name: d.fromName || 'Boaz Fishing Co.', htmlBody: d.html || undefined };
    if (d.replyTo) opts.replyTo = d.replyTo;
    if (d.ics) opts.attachments = [Utilities.newBlob(d.ics, 'text/calendar; method=' + (d.icsMethod || 'PUBLISH') + '; charset=UTF-8', 'lesson.ics')];
    MailApp.sendEmail(d.to, d.subject, d.text || '', opts);
    return reply({ ok: true, left: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

function reply(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

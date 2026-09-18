const SPREADSHEET_ID = '1Cd2ESSzphdx18I8vQN9o7rVhzqjHQ__v-GSgjbJcouA';
const TAB_NAME = 'Sheet1';
const HEADERS = [
  'RSVP ID', 'Submitted at', 'Name', 'Email', 'Attendance', 'Guests attending',
  'Dietary needs', 'Rehearsal dinner', 'Staying after reception dinner',
  'Drinking alcohol', 'Message'
];

function doPost(e) {
  let id = '';
  let ok = false;
  try {
    const rsvp = JSON.parse(e.parameter.payload || '{}');
    validateRsvp_(rsvp);
    id = rsvp.id;
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_NAME);
      if (!sheet) throw new Error('Sheet1 was not found.');
      if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      } else {
        const current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
        if (JSON.stringify(current) !== JSON.stringify(HEADERS)) {
          throw new Error('Sheet1 has different column headings.');
        }
      }
      const rowCount = sheet.getLastRow() - 1;
      const ids = rowCount > 0
        ? sheet.getRange(2, 1, rowCount, 1).getValues().map(row => String(row[0]))
        : [];
      if (!ids.includes(id)) {
        sheet.getRange(sheet.getLastRow() + 1, 1, 1, HEADERS.length).setValues([rsvpRow_(rsvp)]);
      }
      ok = true;
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
  }
  const message = JSON.stringify({ source: 'zl-rsvp-sheet', id, ok }).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput('<script>top.postMessage(' + message + ', "*");</script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Read-only confirmation. The random submission ID is the only value returned.
function doGet(e) {
  const id = e.parameter.id || '';
  const callback = e.parameter.callback || '';
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^zlSheetReply_[a-zA-Z0-9_]+$/.test(callback)) {
    return ContentService.createTextOutput('void 0;')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  let ok = false;
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_NAME);
    if (sheet && sheet.getLastRow() > 1) {
      const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
      ok = ids.some(row => String(row[0]) === id);
    }
  } catch (error) {
    console.error(error);
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify({ id, ok }) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function validateRsvp_(rsvp) {
  const answer = value => value === 'yes' || value === 'no';
  if (!/^[0-9a-f-]{36}$/i.test(rsvp.id || '') ||
      typeof rsvp.name !== 'string' || !rsvp.name.trim() || rsvp.name.length > 100 ||
      typeof rsvp.email !== 'string' || !rsvp.email.includes('@') || rsvp.email.length > 254 ||
      !['attending', 'declined'].includes(rsvp.attendance) ||
      typeof rsvp.dietaryNeeds !== 'string' || rsvp.dietaryNeeds.length > 500 ||
      typeof rsvp.message !== 'string' || rsvp.message.length > 750 ||
      typeof rsvp.submittedAt !== 'string' || !Number.isFinite(Date.parse(rsvp.submittedAt))) {
    throw new Error('Invalid RSVP details.');
  }
  if (rsvp.attendance === 'attending') {
    if (!Number.isInteger(rsvp.guestCount) || rsvp.guestCount < 1 || rsvp.guestCount > 4 ||
        !answer(rsvp.rehearsalDinner) || !answer(rsvp.stayingAfterReceptionDinner) ||
        !answer(rsvp.drinkingAlcohol)) throw new Error('Invalid attending RSVP.');
  } else if (rsvp.guestCount !== 0 || rsvp.dietaryNeeds !== '' ||
             rsvp.rehearsalDinner !== null || rsvp.stayingAfterReceptionDinner !== null ||
             rsvp.drinkingAlcohol !== null) {
    throw new Error('Invalid declined RSVP.');
  }
}

function rsvpRow_(rsvp) {
  return [
    rsvp.id, rsvp.submittedAt, safeCell_(rsvp.name), safeCell_(rsvp.email),
    rsvp.attendance, rsvp.guestCount, safeCell_(rsvp.dietaryNeeds),
    rsvp.rehearsalDinner || '', rsvp.stayingAfterReceptionDinner || '',
    rsvp.drinkingAlcohol || '', safeCell_(rsvp.message)
  ];
}

function safeCell_(value) {
  const text = String(value);
  return /^\s*[=+\-@]/.test(text) ? "'" + text : text;
}

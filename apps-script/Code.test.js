const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
  const rows = [];
  const sheet = {
    getLastRow: () => rows.length,
    getRange(start, column, height, width) {
      return {
        getValues: () => rows.slice(start - 1, start - 1 + height).map(row => row.slice(column - 1, column - 1 + width)),
        setValues: values => {
          values.forEach((value, index) => { rows[start - 1 + index] = value; });
        }
      };
    }
  };
  const context = {
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    HtmlService: {
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
      createHtmlOutput(html) { return { html, setXFrameOptionsMode() { return this; } }; }
    },
    ContentService: {
      MimeType: { JAVASCRIPT: 'JAVASCRIPT' },
      createTextOutput(text) { return { text, setMimeType() { return this; } }; }
    },
    console: { error() {} }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(__dirname + '/Code.gs', 'utf8'), context);
  return { rows, doPost: context.doPost, doGet: context.doGet };
}

const rsvp = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  submittedAt: '2026-09-18T12:00:00.000Z',
  name: 'Zach Test', email: 'zach@example.com', attendance: 'attending',
  guestCount: 2, dietaryNeeds: '=HYPERLINK("bad")', rehearsalDinner: 'yes',
  stayingAfterReceptionDinner: 'no', drinkingAlcohol: 'yes', message: 'See you!'
};

test('writes a complete RSVP and acknowledges it', () => {
  const { rows, doPost } = harness();
  const result = doPost({ parameter: { payload: JSON.stringify(rsvp) } });
  assert.equal(rows.length, 2);
  assert.deepEqual(Array.from(rows[1]), [
    rsvp.id, rsvp.submittedAt, rsvp.name, rsvp.email, 'attending', 2,
    "'=HYPERLINK(\"bad\")", 'yes', 'no', 'yes', 'See you!'
  ]);
  assert.match(result.html, /"ok":true/);
});

test('does not add a duplicate row for the same submission ID', () => {
  const { rows, doPost } = harness();
  doPost({ parameter: { payload: JSON.stringify(rsvp) } });
  doPost({ parameter: { payload: JSON.stringify(rsvp) } });
  assert.equal(rows.length, 2);
});

test('rejects invalid RSVP data', () => {
  const { rows, doPost } = harness();
  const result = doPost({ parameter: { payload: JSON.stringify({ ...rsvp, guestCount: 99 }) } });
  assert.equal(rows.length, 0);
  assert.match(result.html, /"ok":false/);
});

test('confirms only whether a random submission ID exists', () => {
  const { doPost, doGet } = harness();
  doPost({ parameter: { payload: JSON.stringify(rsvp) } });
  const callback = 'zlSheetReply_123';
  assert.equal(doGet({ parameter: { id: rsvp.id, callback } }).text,
    `${callback}(${JSON.stringify({ id: rsvp.id, ok: true })});`);
  assert.match(doGet({ parameter: { id: '123e4567-e89b-42d3-a456-426614174999', callback } }).text, /"ok":false/);
  assert.equal(doGet({ parameter: { id: rsvp.id, callback: 'alert(1)' } }).text, 'void 0;');
});

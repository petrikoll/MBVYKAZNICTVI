import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ATTENDANCE_SHEET_TYPE_OPTIONS,
  actorContactsToSheetFields,
  attendanceSheetTitle,
  buildAttendanceParticipants,
  buildMeetingAttendanceParticipants,
  contactsFromSheetRow,
  createEmptyActorContact,
  nextActorContactId,
  normalizeActorContacts,
  paginateAttendanceParticipants
} from '../src/lib/actorContacts.js';

test('starý záznam s jedním kontaktem zůstane podporovaný', () => {
  assert.deepEqual(normalizeActorContacts({
    contactName: 'Mgr. Jan Novák',
    contactRole: 'vedoucí',
    phone: '123'
  }), [{
    id: 'contact-1',
    name: 'Mgr. Jan Novák',
    title: 'Mgr.',
    firstName: 'Jan',
    lastName: 'Novák',
    role: 'vedoucí',
    phone: '123',
    email: ''
  }]);
});

test('více kontaktů se načte i z víceřádkových původních sloupců Sheetu', () => {
  assert.deepEqual(contactsFromSheetRow({
    kontaktni_osoba: 'Jan Novák\nJana Malá',
    funkce: 'ředitel\nkoordinátorka',
    telefon: '111\n222',
    email: 'jan@example.cz\njana@example.cz'
  }).map(({ name, role, phone, email }) => ({ name, role, phone, email })), [
    { name: 'Jan Novák', role: 'ředitel', phone: '111', email: 'jan@example.cz' },
    { name: 'Jana Malá', role: 'koordinátorka', phone: '222', email: 'jana@example.cz' }
  ]);
});

test('uložení kontaktů zachová JSON i kompatibilní sloupce pro současný backend', () => {
  const fields = actorContactsToSheetFields({
    contacts: [
      { id: 'contact-1', name: 'Jan Novák', role: 'ředitel', phone: '111', email: 'jan@example.cz' },
      { id: 'contact-2', name: 'Jana Malá', role: 'koordinátorka', phone: '222', email: 'jana@example.cz' }
    ]
  });
  assert.equal(fields.kontaktni_osoba, 'Jan Novák\nJana Malá');
  assert.equal(fields.funkce, 'ředitel\nkoordinátorka');
  assert.equal(JSON.parse(fields.kontaktni_osoby_json).length, 2);
});

test('nová osoba dostane stabilní ID i vedle dosud prázdního prvního řádku', () => {
  assert.equal(nextActorContactId([createEmptyActorContact()]), 'contact-2');
});

test('prezenční listina obsahuje jen vybrané osoby z organizace', () => {
  const records = [{
    id: 'partner-1',
    payload: {
      name: 'Město',
      contacts: [
        { id: 'contact-1', name: 'Jan Novák', role: 'starosta' },
        { id: 'contact-2', name: 'Jana Malá', role: 'koordinátorka' }
      ]
    }
  }];

  assert.deepEqual(buildAttendanceParticipants(records, { 'partner-1': ['contact-2'] }), [{
    recordId: 'partner-1',
    contactId: 'contact-2',
    firstName: 'Jana',
    lastName: 'Malá',
    organization: 'Město',
    role: 'koordinátorka'
  }]);
});

test('prezenční listina zachová titul před jménem', () => {
  const records = [{
    id: 'partner-1',
    payload: {
      name: 'Město',
      contacts: [{ id: 'contact-1', name: 'Mgr. Jana Malá', role: 'koordinátorka' }]
    }
  }];

  const [participant] = buildAttendanceParticipants(records, { 'partner-1': ['contact-1'] });

  assert.equal(participant.firstName, 'Mgr. Jana');
  assert.equal(participant.lastName, 'Malá');
});

test('více titulů před jménem se zachová a titul za jménem zůstane v příjmení', () => {
  assert.deepEqual(normalizeActorContacts({
    contacts: [{ id: 'contact-1', name: 'doc. RNDr. Petr Novák, Ph.D.' }]
  })[0], {
    id: 'contact-1',
    name: 'doc. RNDr. Petr Novák, Ph.D.',
    title: 'doc. RNDr.',
    firstName: 'Petr',
    lastName: 'Novák, Ph.D.',
    role: '',
    phone: '',
    email: ''
  });
});

test('nabídka prezenční listiny obsahuje všechny požadované druhy', () => {
  assert.deepEqual(ATTENDANCE_SHEET_TYPE_OPTIONS.map((option) => option.label), [
    'Aktéři sítě',
    'Supervize',
    'Porada',
    'Jiné'
  ]);
});

test('nadpisy prezenční listiny neobsahují označení KA a volba jiné nabízí tečky', () => {
  assert.equal(attendanceSheetTitle('network'), 'Prezenční listina – aktéři sítě');
  assert.equal(attendanceSheetTitle('supervision'), 'Prezenční listina – supervize');
  assert.equal(attendanceSheetTitle('meeting'), 'Prezenční listina – porada');
  assert.match(attendanceSheetTitle('other'), /^Prezenční listina – \.{20,}$/);
  ATTENDANCE_SHEET_TYPE_OPTIONS.forEach((option) => assert.doesNotMatch(attendanceSheetTitle(option.value), /\bKA\d*\b/i));
});

test('prezenční listina porady převezme členy týmu, kontakty aktérů i ruční osoby', () => {
  const participants = buildMeetingAttendanceParticipants([
    'Mgr. Lea Ledecká',
    'Město — Mgr. Jana Malá',
    'Petr Novák — host',
    'Mgr. Lea Ledecká'
  ], [{
    id: 'partner-1',
    payload: {
      name: 'Město',
      contacts: [{ id: 'contact-1', name: 'Mgr. Jana Malá', role: 'koordinátorka' }]
    }
  }], ['Mgr. Lea Ledecká']);

  assert.deepEqual(participants, [
    { firstName: 'Mgr. Lea', lastName: 'Ledecká', organization: 'Město Moravský Beroun', role: 'Realizační tým' },
    { firstName: 'Mgr. Jana', lastName: 'Malá', organization: 'Město', role: 'koordinátorka' },
    { firstName: 'Petr', lastName: 'Novák', organization: '', role: 'host' }
  ]);
});

test('vícestránková prezenční listina rozděluje řádky bez překryvu a zachová pořadí', () => {
  const participants = Array.from({ length: 40 }, (_, index) => ({
    firstName: `Jméno ${index + 1}`,
    lastName: `Příjmení ${index + 1}`,
    organization: 'Organizace',
    role: 'Role'
  }));
  const pages = paginateAttendanceParticipants(participants);

  assert.deepEqual(pages.map((page) => page.length), [22, 18]);
  assert.equal(pages[0][21].order, '22');
  assert.equal(pages[1][0].order, '23');
  assert.equal(pages[1][17].order, '40');
});

test('krátká prezenční listina doplní patnáct řádků na jednu stránku', () => {
  const pages = paginateAttendanceParticipants([{ firstName: 'Jan', lastName: 'Novák' }]);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].length, 15);
  assert.equal(pages[0][0].firstName, 'Jan');
  assert.equal(pages[0][14].firstName, '');
});

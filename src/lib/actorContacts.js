const CONTACT_TITLE_PATTERN = /^(Bc\.?|BcA\.?|Mgr\.?|MgA\.?|Ing\.?|JUDr\.?|MUDr\.?|MDDr\.?|MVDr\.?|RNDr\.?|PharmDr\.?|PhDr\.?|PaedDr\.?|ThDr\.?|ThLic\.?|doc\.?|prof\.?|DiS\.?)$/i;

const ATTENDANCE_SHEET_TYPE_OPTIONS = [
  { value: 'network', label: 'Aktéři sítě' },
  { value: 'supervision', label: 'Supervize' },
  { value: 'meeting', label: 'Porada' },
  { value: 'other', label: 'Jiné' }
];

function attendanceSheetTitle(type = 'network') {
  const titles = {
    network: 'Prezenční listina – aktéři sítě',
    supervision: 'Prezenční listina – supervize',
    meeting: 'Prezenční listina – porada',
    other: 'Prezenční listina – ................................................'
  };
  return titles[type] || titles.network;
}

function createEmptyActorContact(id = '') {
  return { id, name: '', title: '', firstName: '', lastName: '', role: '', phone: '', email: '' };
}

function nextActorContactId(contacts = []) {
  const usedIds = new Set(contacts.map((contact) => String(contact?.id || '').trim()).filter(Boolean));
  let index = Math.max(1, contacts.length + 1);
  while (usedIds.has(`contact-${index}`)) index += 1;
  return `contact-${index}`;
}

function splitContactName(value = '') {
  const tokens = String(value || '').trim().split(/\s+/).filter(Boolean);
  const titles = [];
  while (tokens.length && CONTACT_TITLE_PATTERN.test(tokens[0])) titles.push(tokens.shift());
  const title = titles.join(' ');
  const firstName = tokens.shift() || '';
  const lastName = tokens.join(' ');
  return { title, firstName, lastName };
}

function normalizeActorContact(contact = {}, index = 0) {
  const name = String(contact.name || contact.contactName || '').trim();
  const parsed = splitContactName(name);
  const title = String(contact.title || contact.contactTitle || parsed.title || '').trim();
  const firstName = String(contact.firstName || contact.contactFirstName || parsed.firstName || '').trim();
  const lastName = String(contact.lastName || contact.contactLastName || parsed.lastName || '').trim();
  const normalizedName = name || [title, firstName, lastName].filter(Boolean).join(' ');

  return {
    id: String(contact.id || `contact-${index + 1}`).trim(),
    name: normalizedName,
    title,
    firstName,
    lastName,
    role: String(contact.role || contact.contactRole || '').trim(),
    phone: String(contact.phone || '').trim(),
    email: String(contact.email || '').trim()
  };
}

function hasActorContactContent(contact = {}) {
  return [contact.name, contact.title, contact.firstName, contact.lastName, contact.role, contact.phone, contact.email]
    .some((value) => String(value || '').trim());
}

function parseContactsJson(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function splitSheetLines(value) {
  return String(value || '').split(/\r?\n/).map((item) => item.trim());
}

function contactsFromSheetRow(row = {}) {
  const jsonContacts = parseContactsJson(row.kontaktni_osoby_json || row.contactsJson || row.contacts);
  if (jsonContacts.length) return normalizeActorContacts({ contacts: jsonContacts });

  const names = splitSheetLines(row.kontaktni_osoba);
  const roles = splitSheetLines(row.funkce);
  const phones = splitSheetLines(row.telefon);
  const emails = splitSheetLines(row.email);
  const count = Math.max(names.length, roles.length, phones.length, emails.length);
  const contacts = Array.from({ length: count }, (_, index) => ({
    id: `contact-${index + 1}`,
    name: names[index] || '',
    role: roles[index] || '',
    phone: phones[index] || '',
    email: emails[index] || ''
  }));
  return contacts.map(normalizeActorContact).filter(hasActorContactContent);
}

function normalizeActorContacts(payload = {}) {
  const directContacts = Array.isArray(payload.contacts)
    ? payload.contacts
    : parseContactsJson(payload.contactsJson || payload.kontaktni_osoby_json);
  const source = directContacts.length
    ? directContacts
    : [{
      id: 'contact-1',
      name: payload.contactName,
      title: payload.contactTitle,
      firstName: payload.contactFirstName,
      lastName: payload.contactLastName,
      role: payload.contactRole || payload.role,
      phone: payload.phone,
      email: payload.email
    }];

  return source.map(normalizeActorContact).filter(hasActorContactContent);
}

function actorContactsToSheetFields(payload = {}) {
  const contacts = normalizeActorContacts(payload);
  return {
    kontaktni_osoby_json: JSON.stringify(contacts),
    kontaktni_osoba: contacts.map((contact) => contact.name).join('\n'),
    funkce: contacts.map((contact) => contact.role).join('\n'),
    telefon: contacts.map((contact) => contact.phone).join('\n'),
    email: contacts.map((contact) => contact.email).join('\n')
  };
}

function isAttendanceReadyContact(contact = {}) {
  const normalized = normalizeActorContact(contact);
  return Boolean(normalized.firstName && normalized.lastName);
}

function selectedContactIds(selectionValue, contacts = []) {
  if (Array.isArray(selectionValue)) return selectionValue.map(String);
  return selectionValue ? contacts.filter(isAttendanceReadyContact).map((contact) => contact.id) : [];
}

function buildAttendanceParticipants(records = [], selection = {}) {
  return records.flatMap((record) => {
    const payload = record?.payload || {};
    const organization = String(payload.name || '').trim();
    if (!organization) return [];
    const contacts = normalizeActorContacts(payload);
    const selectedIds = new Set(selectedContactIds(selection[record.id], contacts));
    return contacts
      .filter((contact) => selectedIds.has(contact.id) && isAttendanceReadyContact(contact))
      .map((contact) => ({
        recordId: record.id,
        contactId: contact.id,
        firstName: [contact.title, contact.firstName].filter(Boolean).join(' '),
        lastName: contact.lastName,
        organization,
        role: contact.role
      }));
  });
}

function buildMeetingAttendanceParticipants(participantNames = [], actorRecords = [], workers = []) {
  const workerNames = new Set((workers || []).map((name) => String(name || '').trim()).filter(Boolean));
  const actorParticipants = new Map();

  (actorRecords || []).forEach((record) => {
    const payload = record?.payload || {};
    const organization = String(payload.name || '').trim();
    if (!organization) return;
    const contacts = normalizeActorContacts(payload);
    if (!contacts.length) {
      actorParticipants.set(organization, { firstName: '', lastName: '', organization, role: '' });
      return;
    }
    contacts.forEach((contact) => {
      const participant = {
        firstName: [contact.title, contact.firstName].filter(Boolean).join(' '),
        lastName: contact.lastName,
        organization,
        role: contact.role
      };
      actorParticipants.set(`${organization} — ${contact.name}`, participant);
    });
  });

  const seen = new Set();
  return (participantNames || []).flatMap((participantName) => {
    const value = String(participantName || '').trim();
    const dedupeKey = value.toLocaleLowerCase('cs');
    if (!value || seen.has(dedupeKey)) return [];
    seen.add(dedupeKey);

    if (actorParticipants.has(value)) return [{ ...actorParticipants.get(value) }];

    const [namePart, ...roleParts] = value.split(/\s+[|–—]\s+/);
    const contact = normalizeActorContact({ name: namePart });
    return [{
      firstName: [contact.title, contact.firstName].filter(Boolean).join(' '),
      lastName: contact.lastName,
      organization: workerNames.has(value) ? 'Město Moravský Beroun' : '',
      role: workerNames.has(value) ? 'Realizační tým' : roleParts.join(' — ')
    }];
  });
}

function paginateAttendanceParticipants(participants = [], { minimumRows = 15, rowsPerPage = 22 } = {}) {
  const safeRowsPerPage = Math.max(1, Number(rowsPerPage) || 22);
  const totalRows = Math.max(Math.max(0, Number(minimumRows) || 0), participants.length);
  const rows = Array.from({ length: totalRows }, (_, index) => {
    const participant = participants[index];
    return {
      order: String(index + 1),
      firstName: participant?.firstName || '',
      lastName: participant?.lastName || '',
      organization: participant?.organization || '',
      role: participant?.role || ''
    };
  });
  return Array.from({ length: Math.ceil(rows.length / safeRowsPerPage) }, (_, pageIndex) =>
    rows.slice(pageIndex * safeRowsPerPage, (pageIndex + 1) * safeRowsPerPage)
  );
}

export {
  ATTENDANCE_SHEET_TYPE_OPTIONS,
  actorContactsToSheetFields,
  attendanceSheetTitle,
  buildAttendanceParticipants,
  buildMeetingAttendanceParticipants,
  paginateAttendanceParticipants,
  contactsFromSheetRow,
  createEmptyActorContact,
  isAttendanceReadyContact,
  nextActorContactId,
  normalizeActorContact,
  normalizeActorContacts,
  selectedContactIds,
  splitContactName
};

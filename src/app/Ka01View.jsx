import React from 'react';
import { CalendarDays, Download, Plus, Save, Sparkles, Trash2, Users } from 'lucide-react';

import { EmptyState, HelpIcon, InputField, Panel, SaveInlineNotice, SelectField, TextAreaField } from '../components/ui.jsx';
import { HELP } from '../config/helpCatalog.js';
import {
  ATTENDANCE_SHEET_TYPE_OPTIONS,
  createEmptyActorContact,
  isAttendanceReadyContact,
  nextActorContactId,
  normalizeActorContacts,
  selectedContactIds
} from '../lib/actorContacts.js';
import { truncate } from '../lib/projectUtils.js';
import { PROJECT_TIME_OPTIONS } from '../lib/timeOptions.js';

const ACTIVITY_OPTIONS = [
  { value: 'koordina\u010dn\u00ed setk\u00e1n\u00ed', label: 'Koordina\u010dn\u00ed setk\u00e1n\u00ed' },
  { value: 'Porada', label: 'Porada' },
  { value: 'roz\u0161\u00ed\u0159en\u00ed nebo udr\u017een\u00ed s\u00edt\u011b', label: 'Roz\u0161\u00ed\u0159en\u00ed nebo udr\u017een\u00ed s\u00edt\u011b' },
  { value: 'skupinov\u00e1', label: 'Skupinov\u00e1' },
  { value: 'individu\u00e1ln\u00ed', label: 'Individu\u00e1ln\u00ed' }
]

const ACTOR_OPTIONS = [
  'obec / m\u011bsto', '\u00fa\u0159ad pr\u00e1ce', 'soci\u00e1ln\u00ed slu\u017eba', 'zdravotnick\u00e9 za\u0159\u00edzen\u00ed',
  '\u0161kola', 'neziskov\u00e1 organizace', 'komunitn\u00ed akt\u00e9r', 'jin\u00fd subjekt'
].map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }));

const DIALOG_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function useAccessibleDialog(open, onClose) {
  const dialogRef = React.useRef(null);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;

  React.useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previouslyFocused = document.activeElement;
    const focusFirstControl = () => {
      const firstControl = dialog.querySelector(DIALOG_FOCUSABLE_SELECTOR);
      (firstControl || dialog).focus();
    };
    const frameId = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame(focusFirstControl)
      : window.setTimeout(focusFirstControl, 0);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll(DIALOG_FOCUSABLE_SELECTOR));
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(frameId);
      else window.clearTimeout(frameId);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [open]);

  return dialogRef;
}

function Ka01View({
  ka01Draft, setKa01Draft, ka01ActorDraft, setKa01ActorDraft,
  ka01ActorCustomValue, updateKa01ActorEntry, ka01PlaceOptions,
  ka01PlaceCustomValue, updateKa01PlaceSelection, updateKa01PlaceCustom,
  isSaving, ka01NetworkDuration, editingKa01NetworkRecordId,
  handleGenerateKa01NetworkDescription, handleSaveKa01Network,
  handleSaveKa01ActorRegistry, setKa01ActorAttendanceContacts,
  networkSaveNotice, actorSaveNotice,
  ka01AttendanceSelection, exportKa01AttendanceSheet,
  handleEditKa01ActorRegistry, exportKa01NetworkBulk,
  ka01NetworkTimeError, cancelKa01NetworkEdit, ka01NetworkRecords,
  ka01ActorRegistryRecords, expandedKa01NetworkRecordIds,
  toggleKa01NetworkDescription, exportKa01NetworkDocx,
  handleEditKa01Network, deleteRecord
}) {
  const [expandedActorIds, setExpandedActorIds] = React.useState([]);
  const [attendanceActorRecord, setAttendanceActorRecord] = React.useState(null);
  const [attendanceContactIds, setAttendanceContactIds] = React.useState([]);
  const [attendanceTypePickerOpen, setAttendanceTypePickerOpen] = React.useState(false);
  const timesWithCurrent = (value) => value && !PROJECT_TIME_OPTIONS.includes(value) ? [value, ...PROJECT_TIME_OPTIONS] : PROJECT_TIME_OPTIONS;
  const isTeamMeeting = String(ka01Draft.networkType || '').toLowerCase() === 'porada';
  const sortedActors = React.useMemo(
    () => [...ka01ActorRegistryRecords].sort((a, b) => String(a.payload?.name || '').localeCompare(String(b.payload?.name || ''), 'cs')),
    [ka01ActorRegistryRecords]
  );
  const participantOptions = React.useMemo(() => {
    const actorNames = sortedActors
      .flatMap((record) => {
        const payload = record.payload || {};
        const institutionName = String(payload.name || '').trim();
        if (!institutionName) return [];
        const contacts = normalizeActorContacts(payload);
        const namedContacts = contacts.filter((contact) => contact.name);
        return namedContacts.length
          ? namedContacts.map((contact) => `${institutionName} — ${contact.name}`)
          : [institutionName];
      })
      .filter(Boolean)
      .sort((first, second) => {
        const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('cs');
        const firstIsMoravskyBeroun = normalize(first).includes('moravsky beroun');
        const secondIsMoravskyBeroun = normalize(second).includes('moravsky beroun');
        if (firstIsMoravskyBeroun !== secondIsMoravskyBeroun) return firstIsMoravskyBeroun ? -1 : 1;
        return String(first).localeCompare(String(second), 'cs');
      });
    const options = actorNames;
    return Array.from(new Set(options)).map((value) => ({ value, label: value })).concat([
      { value: ka01ActorCustomValue, label: 'Dal\u0161\u00ed osoba (ru\u010dn\u011b)' }
    ]);
  }, [ka01ActorCustomValue, sortedActors]);
  const actorOrigin = (record) => String(record.payload?.networkOrigin || '').toLocaleLowerCase('cs');
  const networkActors = sortedActors.filter((record) => !actorOrigin(record).includes('potenci'));
  const currentActors = networkActors.filter((record) => actorOrigin(record).includes('stávaj')).length;
  const newActors = networkActors.filter((record) => actorOrigin(record).includes('nov')).length;
  const attendanceCount = sortedActors.reduce((count, record) => {
    const contacts = normalizeActorContacts(record.payload || {});
    return count + selectedContactIds(ka01AttendanceSelection?.[record.id], contacts).length;
  }, 0);
  const isNewActor = String(ka01ActorDraft.networkOrigin || '').toLowerCase().includes('nov');
  const actorDraftContacts = Array.isArray(ka01ActorDraft.contacts) && ka01ActorDraft.contacts.length
    ? ka01ActorDraft.contacts
    : [createEmptyActorContact()];
  const actorTypeOptions = ACTOR_OPTIONS.some((option) => option.value === ka01ActorDraft.actorType)
    ? ACTOR_OPTIONS
    : [{ value: ka01ActorDraft.actorType, label: ka01ActorDraft.actorType }, ...ACTOR_OPTIONS].filter((option) => option.value);
  const toggleActor = (id) => setExpandedActorIds((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
  const updateActorContact = (contactId, patch) => {
    setKa01ActorDraft((previous) => ({
      ...previous,
      contacts: (previous.contacts || []).map((contact) => contact.id === contactId ? { ...contact, ...patch } : contact)
    }));
  };
  const addActorContact = () => {
    setKa01ActorDraft((previous) => {
      const contacts = Array.isArray(previous.contacts) ? previous.contacts : [];
      return { ...previous, contacts: [...contacts, createEmptyActorContact(nextActorContactId(contacts))] };
    });
  };
  const removeActorContact = (contactId) => {
    setKa01ActorDraft((previous) => {
      const contacts = (previous.contacts || []).filter((contact) => contact.id !== contactId);
      return { ...previous, contacts: contacts.length ? contacts : [createEmptyActorContact()] };
    });
  };
  const openAttendanceContactPicker = (record) => {
    const contacts = normalizeActorContacts(record.payload || {});
    const readyContactIds = contacts.filter(isAttendanceReadyContact).map((contact) => contact.id);
    const currentIds = selectedContactIds(ka01AttendanceSelection?.[record.id], contacts)
      .filter((contactId) => readyContactIds.includes(contactId));
    setAttendanceActorRecord(record);
    setAttendanceContactIds(currentIds.length ? currentIds : readyContactIds);
  };
  const closeAttendanceContactPicker = () => {
    setAttendanceActorRecord(null);
    setAttendanceContactIds([]);
  };
  const confirmAttendanceContacts = () => {
    if (!attendanceActorRecord) return;
    setKa01ActorAttendanceContacts(attendanceActorRecord.id, attendanceContactIds);
    closeAttendanceContactPicker();
  };
  const attendanceModalContacts = attendanceActorRecord
    ? normalizeActorContacts(attendanceActorRecord.payload || {})
    : [];
  const toggleAttendanceContact = (contactId, checked) => {
    setAttendanceContactIds((previous) => checked
      ? Array.from(new Set([...previous, contactId]))
      : previous.filter((id) => id !== contactId));
  };
  const attendanceTypeDialogRef = useAccessibleDialog(
    attendanceTypePickerOpen,
    () => setAttendanceTypePickerOpen(false)
  );
  const attendancePersonDialogRef = useAccessibleDialog(
    Boolean(attendanceActorRecord),
    closeAttendanceContactPicker
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-semibold uppercase text-slate-300">KA02 - Tvorba sítě:</span>
          <span>Aktéři <strong>{networkActors.length}</strong></span>
          <span>Stávající síť <strong>{currentActors}</strong></span>
          <span>Nově zapojení <strong>{newActors}</strong></span>
          <span>Aktivity <strong>{ka01NetworkRecords.length}</strong></span>
        </div>
      </div>

      <Panel title="KA02 - Záznam schůzky / aktivity sítě" description="Individuální a skupinové schůzky partnerů a porady realizačního týmu." icon={Users} className="w-full min-w-0">
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Datum</label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input id="ka02-network-date" type="date" value={ka01Draft.date} onChange={(event) => setKa01Draft((previous) => ({ ...previous, date: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                <button type="button" onClick={() => document.getElementById('ka02-network-date')?.showPicker?.()} className="rounded-lg border border-slate-300 bg-white px-3" title="Otevřít kalendář"><CalendarDays className="h-4 w-4" /></button>
              </div>
            </div>
            <SelectField label="Typ aktivity" help={HELP.networkType} value={ka01Draft.networkType} onChange={(value) => setKa01Draft((previous) => ({ ...previous, networkType: value }))} options={ACTIVITY_OPTIONS} />
            <div><label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">{'Po\u010det \u00fa\u010dastn\u00edk\u016f'}</label><input type="text" value={ka01Draft.networkCount} readOnly className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700" /></div>
          </div>

          <div className="grid items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2 lg:grid-cols-[88px_88px_130px_minmax(220px,1fr)]">
            <div><label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Od</label><select value={ka01Draft.networkStartTime} onChange={(event) => setKa01Draft((previous) => ({ ...previous, networkStartTime: event.target.value }))} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="">Čas</option>{timesWithCurrent(ka01Draft.networkStartTime).map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
            <div><label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Do</label><select value={ka01Draft.networkEndTime} onChange={(event) => setKa01Draft((previous) => ({ ...previous, networkEndTime: event.target.value }))} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="">Čas</option>{timesWithCurrent(ka01Draft.networkEndTime).map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
            <div><label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Trvání</label><div className="flex h-9 items-center rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold">{ka01NetworkDuration || '-'}</div></div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500">Místo setkání <HelpIcon help={HELP.networkPlace} /></label>
              <div className={`grid gap-2 ${ka01Draft.networkPlaceType === ka01PlaceCustomValue ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                <select value={ka01Draft.networkPlaceType || ''} onChange={(event) => updateKa01PlaceSelection(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="">Vyber místo</option>{ka01PlaceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                {ka01Draft.networkPlaceType === ka01PlaceCustomValue && <input type="text" value={ka01Draft.networkPlaceCustom || ''} onChange={(event) => updateKa01PlaceCustom(event.target.value)} placeholder="Jiné místo" className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm" />}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">{isTeamMeeting ? 'Přítomní členové realizačního týmu a další osoby' : 'Přítomní aktéři a další osoby'}</label>
            <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              {(ka01Draft.networkActorEntries || []).map((entry, index) => (
                <div key={`participant-${index}`} className="min-w-[260px] flex-1 rounded-md border border-slate-200 bg-white p-2">
                  <select value={entry.actorType || ''} onChange={(event) => updateKa01ActorEntry(index, { actorType: event.target.value, customName: event.target.value === ka01ActorCustomValue ? entry.customName || '' : '' })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Vyber osobu</option>{participantOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  {entry.actorType === ka01ActorCustomValue && <input type="text" value={entry.customName || ''} onChange={(event) => updateKa01ActorEntry(index, { customName: event.target.value })} placeholder="Jméno a funkce osoby" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />}
                </div>
              ))}
            </div>
          </div>

          <div>
            <TextAreaField label="Popis" help={HELP.networkDescription} value={ka01Draft.networkNotes} onChange={(value) => setKa01Draft((previous) => ({ ...previous, networkNotes: value }))} rows={6} />
          </div>
          <TextAreaField label="Výstup zápisu" help={HELP.networkOutput} value={ka01Draft.networkDescription || ''} onChange={(value) => setKa01Draft((previous) => ({ ...previous, networkDescription: value }))} rows={5} placeholder="Po vygenerování se zde zobrazí návrh textu dokumentu" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleGenerateKa01NetworkDescription} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"><Sparkles className="h-4 w-4" />Vygenerovat návrh AI</button>
            <button onClick={handleSaveKa01Network} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" />{editingKa01NetworkRecordId ? 'Uložit úpravu' : 'Uložit aktivitu'}</button>
            <SaveInlineNotice notice={networkSaveNotice} />
            <button type="button" onClick={exportKa01NetworkBulk} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"><Download className="h-4 w-4" />Hromadné stažení</button>
            {editingKa01NetworkRecordId && <button type="button" onClick={cancelKa01NetworkEdit} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Zrušit úpravu</button>}
            {ka01NetworkTimeError && <span className="inline-flex items-center text-sm font-semibold text-red-600">{ka01NetworkTimeError}</span>}
          </div>

          <div>
            <div className="mb-2 text-sm font-bold">Uložené schůzky a aktivity sítě</div>
            {ka01NetworkRecords.length === 0 ? <EmptyState icon={Users} title="Zatím není uložena žádná aktivita sítě." /> : (
              <div className="overflow-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-[900px] w-full divide-y divide-slate-200 text-xs"><thead className="bg-sky-50 font-semibold uppercase text-sky-800"><tr><th className="px-2 py-2 text-left">Datum</th><th className="px-2 py-2 text-left">Typ</th><th className="px-2 py-2 text-left">Účastníci</th><th className="px-2 py-2 text-left">Zápis</th><th className="px-2 py-2 text-right">Akce</th></tr></thead><tbody className="divide-y divide-slate-100">
                {ka01NetworkRecords.map((record) => { const expanded = expandedKa01NetworkRecordIds.includes(record.id); const text = record.payload?.description || record.payload?.notes || ''; return <tr key={record.id} className="even:bg-slate-50/60"><td className="px-2 py-2">{record.activityDate || '-'}</td><td className="px-2 py-2 font-semibold">{record.payload?.type || record.title}</td><td className="max-w-[220px] px-2 py-2">{truncate(record.payload?.participants || '-', 80)}</td><td className="max-w-[360px] px-2 py-2">{expanded ? text : truncate(text, 150)} {text.length > 150 && <button type="button" onClick={() => toggleKa01NetworkDescription(record.id)} className="font-semibold text-blue-700">{expanded ? 'Méně' : 'Více'}</button>}</td><td className="whitespace-nowrap px-2 py-2 text-right"><button type="button" onClick={() => exportKa01NetworkDocx(record)} className="mr-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">DOCX</button><button type="button" onClick={() => handleEditKa01Network(record)} className="mr-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700">Upravit</button><button type="button" onClick={() => deleteRecord(record)} disabled={isSaving} className="rounded-full border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700">Smazat</button></td></tr>; })}
              </tbody></table></div>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="KA02 - Evidence subjektů partnerské sítě" icon={Users} className="w-full min-w-0 overflow-hidden">
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <InputField label="Název subjektu" help={HELP.actorName} value={ka01ActorDraft.name} onChange={(value) => setKa01ActorDraft((previous) => ({ ...previous, name: value }))} />
            <SelectField label="Typ aktéra" help={HELP.actorType} value={ka01ActorDraft.actorType} onChange={(value) => setKa01ActorDraft((previous) => ({ ...previous, actorType: value }))} options={actorTypeOptions} />
            <SelectField label="Zapojení aktéra" help={HELP.actorOrigin} value={ka01ActorDraft.networkOrigin || ''} onChange={(value) => setKa01ActorDraft((previous) => ({ ...previous, networkOrigin: value, joinedNetworkDate: value.includes('nov') ? previous.joinedNetworkDate : '' }))} options={[{ value: '', label: 'Vyberte p\u016fvod' }, { value: 'st\u00e1vaj\u00edc\u00ed', label: 'St\u00e1vaj\u00edc\u00ed' }, { value: 'nov\u011b zapojen\u00fd', label: 'Nov\u011b zapojen\u00fd' }, { value: 'potencion\u00e1ln\u00ed', label: 'Potencion\u00e1ln\u00ed' }]} />
            {isNewActor && <InputField label="Datum zapojení" help={HELP.actorDate} type="date" value={ka01ActorDraft.joinedNetworkDate || ''} onChange={(value) => setKa01ActorDraft((previous) => ({ ...previous, joinedNetworkDate: value }))} />}
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-slate-900">Kontaktní osoby organizace</div>
                <div className="text-xs text-slate-500">Pod jednu organizaci lze přidat více fyzických zástupců.</div>
              </div>
              <button type="button" onClick={addActorContact} className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50"><Plus className="h-4 w-4" />Přidat osobu</button>
            </div>
            <div className="space-y-3">
              {actorDraftContacts.map((contact, index) => (
                <div key={contact.id || index} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Osoba {index + 1}</span>
                    <button type="button" onClick={() => removeActorContact(contact.id)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"><Trash2 className="h-3.5 w-3.5" />Odebrat</button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <InputField label="Jméno a příjmení" help={HELP.actorContactName} value={contact.name || ''} onChange={(value) => updateActorContact(contact.id, { name: value })} />
                    <InputField label="Funkce" help={HELP.actorContactRole} value={contact.role || ''} onChange={(value) => updateActorContact(contact.id, { role: value })} />
                    <InputField label="Telefon" help={HELP.actorPhoneEmail} type="tel" value={contact.phone || ''} onChange={(value) => updateActorContact(contact.id, { phone: value })} />
                    <InputField label="E-mail" help={HELP.actorPhoneEmail} type="email" value={contact.email || ''} onChange={(value) => updateActorContact(contact.id, { email: value })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleSaveKa01ActorRegistry} disabled={isSaving} className="inline-flex w-fit items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" />{ka01ActorDraft.id ? 'Uložit úpravu aktéra' : 'Uložit aktéra do registru'}</button>
            <SaveInlineNotice notice={actorSaveNotice} />
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold">Uložený registr aktérů</div>
                <HelpIcon help={HELP.attendanceExport} />
              </div>
              <button type="button" onClick={() => setAttendanceTypePickerOpen(true)} disabled={attendanceCount === 0} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-50"><Download className="h-4 w-4" />Vytvořit prezenční listinu ({attendanceCount} osob)</button>
            </div>
            {sortedActors.length === 0 ? <EmptyState icon={Users} title="Zatím není uložen žádný aktér v síti." /> : (
              <div className="overflow-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-[1100px] w-full divide-y divide-slate-200 text-xs"><thead className="sticky top-0 bg-sky-50 font-semibold uppercase text-sky-800"><tr><th className="px-2 py-2 text-left">Subjekt</th><th className="px-2 py-2 text-left">Typ</th><th className="px-2 py-2 text-left">Kontaktní osoba</th><th className="px-2 py-2 text-left">Funkce</th><th className="px-2 py-2 text-left">Kontakt</th><th className="px-2 py-2 text-left">Původ</th><th className="px-2 py-2 text-left">Datum zapojení</th><th className="px-2 py-2 text-left">Prezenční listina</th><th className="px-2 py-2 text-right">Akce</th></tr></thead><tbody className="divide-y divide-slate-100">
                {sortedActors.map((record) => {
                  const payload = record.payload || {};
                  const contacts = normalizeActorContacts(payload);
                  const readyContacts = contacts.filter(isAttendanceReadyContact);
                  const selectedIds = selectedContactIds(ka01AttendanceSelection?.[record.id], contacts);
                  const expanded = expandedActorIds.includes(record.id);
                  return (
                    <React.Fragment key={record.id}>
                      <tr className="even:bg-slate-50/60">
                        <td className="px-2 py-2 font-semibold">{payload.name || '-'}</td>
                        <td className="px-2 py-2">{payload.actorType || '-'}</td>
                        <td className="px-2 py-2">{contacts.length ? contacts.map((contact) => <div key={contact.id}>{contact.name || '-'}</div>) : '-'}</td>
                        <td className="px-2 py-2">{contacts.length ? contacts.map((contact) => <div key={contact.id}>{contact.role || '-'}</div>) : '-'}</td>
                        <td className="px-2 py-2">{contacts.length ? contacts.map((contact) => <div key={contact.id}>{[contact.phone, contact.email].filter(Boolean).join(' / ') || '-'}</div>) : '-'}</td>
                        <td className="px-2 py-2">{payload.networkOrigin || '-'}</td>
                        <td className="px-2 py-2">{String(payload.networkOrigin || '').toLowerCase().includes('nov') ? payload.joinedNetworkDate || '-' : '-'}</td>
                        <td className="px-2 py-2">
                          <div className="flex flex-col items-start gap-1">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedIds.length > 0}
                                onChange={(event) => event.target.checked ? openAttendanceContactPicker(record) : setKa01ActorAttendanceContacts(record.id, [])}
                                disabled={readyContacts.length === 0}
                                className="h-4 w-4"
                              />
                              <span>{readyContacts.length ? `Vybráno ${selectedIds.length} osob` : 'Doplňte celé jméno'}</span>
                            </label>
                            {selectedIds.length > 0 && <button type="button" onClick={() => openAttendanceContactPicker(record)} className="text-xs font-semibold text-sky-700 underline">Změnit osoby</button>}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right"><button type="button" onClick={() => toggleActor(record.id)} className="mr-1 rounded-full border border-slate-200 px-2 py-1 font-semibold">{expanded ? 'Skrýt' : 'Detail'}</button><button type="button" onClick={() => handleEditKa01ActorRegistry(record)} className="mr-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700">Upravit</button><button type="button" onClick={() => deleteRecord(record)} disabled={isSaving} className="rounded-full border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700">Smazat</button></td>
                      </tr>
                      {expanded && <tr><td colSpan={9} className="bg-white px-3 py-2 text-slate-600">{contacts.length ? contacts.map((contact) => <div key={contact.id}>{[contact.name, contact.role, contact.phone, contact.email].filter(Boolean).join(' | ')}</div>) : 'Žádné kontaktní osoby.'}</td></tr>}
                    </React.Fragment>
                  );
                })}
              </tbody></table></div>
            )}
          </div>
        </div>
      </Panel>

      {attendanceTypePickerOpen && (
        <div
          ref={attendanceTypeDialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendance-type-dialog-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAttendanceTypePickerOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4">
              <h2 id="attendance-type-dialog-title" className="text-lg font-bold text-slate-900">Vyberte druh prezenční listiny</h2>
              <p className="mt-1 text-sm text-slate-600">Volba určí nadpis vytvořeného PDF.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {ATTENDANCE_SHEET_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setAttendanceTypePickerOpen(false);
                    exportKa01AttendanceSheet(option.value);
                  }}
                  className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left text-sm font-semibold text-sky-900 hover:border-sky-400 hover:bg-sky-100"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setAttendanceTypePickerOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Zrušit</button>
            </div>
          </div>
        </div>
      )}

      {attendanceActorRecord && (
        <div
          ref={attendancePersonDialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendance-person-dialog-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAttendanceContactPicker();
          }}
        >
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4">
              <h2 id="attendance-person-dialog-title" className="text-lg font-bold text-slate-900">Vyberte osoby na prezenční listinu</h2>
              <p className="mt-1 text-sm text-slate-600">{attendanceActorRecord.payload?.name || 'Organizace'}</p>
            </div>
            <div className="max-h-[55vh] space-y-2 overflow-auto">
              {attendanceModalContacts.map((contact) => {
                const ready = isAttendanceReadyContact(contact);
                return (
                  <label key={contact.id} className={`flex items-start gap-3 rounded-xl border p-3 ${ready ? 'cursor-pointer border-slate-200 hover:border-sky-300 hover:bg-sky-50' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                    <input type="checkbox" checked={attendanceContactIds.includes(contact.id)} onChange={(event) => toggleAttendanceContact(contact.id, event.target.checked)} disabled={!ready} className="mt-0.5 h-4 w-4" />
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-900">{contact.name || 'Beze jména'}</span>
                      <span className="block text-xs text-slate-500">{[contact.role, contact.phone, contact.email].filter(Boolean).join(' · ') || 'Bez doplňujících údajů'}</span>
                      {!ready && <span className="mt-1 block text-xs font-semibold text-rose-600">Pro prezenční listinu doplňte jméno i příjmení.</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={closeAttendanceContactPicker} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Zrušit</button>
              <button type="button" onClick={confirmAttendanceContacts} disabled={attendanceContactIds.length === 0} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Potvrdit výběr ({attendanceContactIds.length})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ka01View;

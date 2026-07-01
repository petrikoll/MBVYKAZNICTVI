import React from 'react';
import { CalendarDays, Download, Loader2, Save, Sparkles } from 'lucide-react';

import { HelpIcon, InputField, Panel, SelectField, TextAreaField } from '../components/ui.jsx';
import { HELP } from '../config/helpCatalog.js';

function AiDocumentPanel({
  allowedKeys,
  title,
  description,
  reportPrompts,
  generatorDraft,
  setGeneratorDraft,
  clients,
  tpmRecords = [],
  workers,
  generatedText,
  setGeneratedText,
  lastGeneratedText,
  generationNotice,
  aiGenerationStatus,
  isGenerating,
  isSaving,
  saveNotice = null,
  saveMissingFields = [],
  onClearSaveNotice,
  onGenerate,
  onSave,
  onExportPlan,
  planGoalOptions = [],
  partners = [],
  lockClientSelection = false,
  lockedClientId = '',
  lockedClientName = '',
  hideStyleFeedback = false,
  panelClassName = ''
}) {
  const MENTOR_BARRIER_OPTIONS = [
    'Nestabilní docházka',
    'Pozdní příchody',
    'Nízké pracovní tempo',
    'Nejistota v pracovních úkolech',
    'Komunikační obtíže na pracovišti',
    'Konflikty na pracovišti',
    'Nízká motivace',
    'Zdravotní omezení',
    'Rodinná zátěž',
    'Dopravní dostupnost'
  ];
  const KA02_PLACE_OPTIONS = [
    'ambulantn\u00ed',
    'ter\u00e9nn\u00ed',
    'Telefonn\u00ed'
  ];
  const KA1_SUPPORT_AREA_OPTIONS = [
    'bydlen\u00ed',
    'finance/dluhy',
    'zam\u011bstn\u00e1n\u00ed',
    'rodina',
    'zdrav\u00ed',
    'bezpe\u010d\u00ed',
    'vzd\u011bl\u00e1n\u00ed',
    'slu\u017eby',
    'pr\u00e1va/povinnosti',
    'jin\u00e9'
  ];
  const KA2_CASE_SUPPORT_TYPE_OPTIONS = [
    'case management - individuální práce s klientem',
    'koordinace podpory klienta',
    'případové setkání',
    'multioborové setkání',
    'vyhodnocení podpory klienta'
  ];
  const KA1_SUPPORT_TYPE_OPTIONS = [
    'Depist\u00e1\u017e',
    'Soci\u00e1ln\u00ed \u0161et\u0159en\u00ed / mapov\u00e1n\u00ed situace',
    'Z\u00e1kladn\u00ed soci\u00e1ln\u00ed poradenstv\u00ed',
    'Ter\u00e9nn\u00ed soci\u00e1ln\u00ed pr\u00e1ce',
    'Doprovod klienta',
    'Jedn\u00e1n\u00ed s instituc\u00ed ve prosp\u011bch klienta',
    'Krizov\u00e1 intervence',
    'Administrativa ve prosp\u011bch klienta',
    'Vyhodnocen\u00ed spolupr\u00e1ce / ukon\u010den\u00ed podpory'
  ];
  const KA1_SUPPORT_TYPE_SELECT_OPTIONS = KA1_SUPPORT_TYPE_OPTIONS;
  const field = (key, label, type = 'textarea', options = []) => [key, label, type, options];
  const SUPPORT_SPECIFIC_DEFINITIONS = {
    [KA1_SUPPORT_TYPE_OPTIONS[0]]: [
      field('contactPlace', 'M\u00edsto depist\u00e1\u017ee', 'select', ['ve\u0159ejn\u00fd prostor', 'dom\u00e1cnost', 'instituce', 'slu\u017eba', 'jin\u00e9']),
      field('contactMethod', 'Zp\u016fsob kontaktu', 'select', ['aktivn\u00ed osloven\u00ed', 'doporu\u010den\u00ed instituce', 'podn\u011bt ve\u0159ejnosti', 'klient s\u00e1m oslovil pracovn\u00edka']),
      field('contactReason', 'D\u016fvod osloven\u00ed'),
      field('cooperationInterest', 'Z\u00e1jem o dal\u0161\u00ed spolupr\u00e1ci', 'select', ['ano', 'ne', 'nerozhodnut'])
    ],
    [KA1_SUPPORT_TYPE_OPTIONS[1]]: [
      field('mappedAreas', 'Dal\u0161\u00ed zji\u0161t\u011bn\u00e9 oblasti', 'multiselect', ['bydlen\u00ed', 'finance/dluhy', 'zam\u011bstn\u00e1n\u00ed', 'rodina', 'zdrav\u00ed', 'bezpe\u010d\u00ed', 'vzd\u011bl\u00e1n\u00ed', 'slu\u017eby', 'pr\u00e1va/povinnosti', 'jin\u00e9']),
      field('risks', 'Rizika', 'select', ['n\u00edzk\u00e9', 'st\u0159edn\u00ed', 'vysok\u00e9']),
      field('clientResources', 'Zdroje klienta'),
      field('clientNeeds', 'Pot\u0159eby klienta')
    ],
    [KA1_SUPPORT_TYPE_OPTIONS[2]]: [
      field('providedInformation', 'Poskytnut\u00e9 informace'),
      field('recommendedProcedure', 'Doporu\u010den\u00fd postup')
    ],
    [KA1_SUPPORT_TYPE_OPTIONS[3]]: [
      field('fieldWorkPlace', 'M\u00edsto v\u00fdkonu', 'select', ['dom\u00e1cnost', 'ubytovna', 've\u0159ejn\u00fd prostor', 'instituce', 'jin\u00e9']),
      field('visitPurpose', '\u00da\u010del n\u00e1v\u0161t\u011bvy', 'select', ['kontrola situace', 'podpora v \u0159e\u0161en\u00ed', 'nav\u00e1z\u00e1n\u00ed spolupr\u00e1ce', 'motivace', 'jin\u00e9'])
    ],
    [KA1_SUPPORT_TYPE_OPTIONS[4]]: [
      field('accompanimentPlace', 'Kam doprovod prob\u011bhl', 'select', ['\u00daP', '\u010cSSZ/OSSZ', 'l\u00e9ka\u0159', '\u0161kola', '\u00fa\u0159ad', 'soci\u00e1ln\u00ed slu\u017eba', 'bydlen\u00ed', 'soud/policie', 'jin\u00e9']),
      field('accompanimentPurpose', '\u00da\u010del doprovodu'),
      field('accompanimentResult', 'V\u00fdsledek doprovodu', 'select', ['vy\u0159\u00edzeno', '\u010d\u00e1ste\u010dn\u011b vy\u0159\u00edzeno', 'nevy\u0159\u00edzeno', 'domluven dal\u0161\u00ed term\u00edn'])
    ],
    [KA1_SUPPORT_TYPE_OPTIONS[5]]: [
      field('institution', 'Instituce'),
      field('contactForm', 'Forma kontaktu', 'select', ['osobn\u011b', 'telefonicky', 'e-mail', 'datov\u00e1 schr\u00e1nka', 'online']),
      field('meetingTopic', 'T\u00e9ma jedn\u00e1n\u00ed'),
      field('clientPresent', 'Klient byl p\u0159\u00edtomen', 'select', ['ano', 'ne'])
    ],
    [KA1_SUPPORT_TYPE_OPTIONS[6]]: [
      field('crisisType', 'Typ krize *', 'select', ['bydlen\u00ed', 'n\u00e1sil\u00ed', 'zdrav\u00ed', 'psychick\u00fd stav', 'finance', 'ohro\u017een\u00ed d\u00edt\u011bte', 'ztr\u00e1ta p\u0159\u00edjmu', 'jin\u00e9']),
      field('urgency', 'M\u00edra akutnosti *', 'select', ['n\u00edzk\u00e1', 'st\u0159edn\u00ed', 'vysok\u00e1']),
      field('measures', 'P\u0159ijat\u00e1 opat\u0159en\u00ed *', 'select', ['stabilizace', 'kontakt slu\u017eby', 'bezpe\u010dnostn\u00ed pl\u00e1n', 'p\u0159ed\u00e1n\u00ed', 'doprovod', 'jin\u00e9']),
      field('followupHelp', 'P\u0159ed\u00e1n\u00ed n\u00e1vazn\u00e9 pomoci'),
      field('contactedFollowupServices', 'Kontaktovan\u00e1 n\u00e1vazn\u00e1 slu\u017eba', 'multiselect', ['OSPOD', 'Policie \u010cR', 'ZZS', 'zdravotnick\u00e9 za\u0159\u00edzen\u00ed', 'soci\u00e1ln\u00ed slu\u017eba', 'krizov\u00e1 slu\u017eba', 'jin\u00e1 instituce', 'nebyla kontaktov\u00e1na'])
    ],
    [KA1_SUPPORT_TYPE_OPTIONS[7]]: [
      field('adminType', 'Typ administrativy', 'select', ['\u017e\u00e1dost', 'formul\u00e1\u0159', 'kopie dokument\u016f', 'e-mail', 'telefon\u00e1t', 'objedn\u00e1n\u00ed', 're\u0161er\u0161e slu\u017eby', 'p\u0159\u00edprava podklad\u016f', 'jin\u00e9']),
      field('documentAction', 'Dokument/\u00fakon'),
      field('withClient', 'Provedeno s klientem', 'select', ['ano', 'ne'])
    ],
    [KA1_SUPPORT_TYPE_OPTIONS[8]]: [
      field('evaluationReason', 'D\u016fvod vyhodnocen\u00ed/ukon\u010den\u00ed', 'select', ['spln\u011bn\u00ed c\u00edle', '\u010d\u00e1ste\u010dn\u00e9 spln\u011bn\u00ed', 'klient ukon\u010dil spolupr\u00e1ci', 'p\u0159ed\u00e1n\u00ed slu\u017eb\u011b', 'dlouhodob\u00e1 neaktivita', 'jin\u00e9']),
      field('achievedProgress', 'Dosa\u017een\u00fd posun', 'select', ['ano', '\u010d\u00e1ste\u010dn\u011b', 'ne']),
      field('unresolvedAreas', 'Nedo\u0159e\u0161en\u00e9 oblasti'),
      field('recommendation', 'Doporu\u010den\u00ed')
    ]
  };
  const WORKDAY_TIME_OPTIONS = Array.from({ length: 21 }, (_, index) => {
    const totalMinutes = 7 * 60 + index * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  const timeOptionsWithValue = (value) =>
    value && !WORKDAY_TIME_OPTIONS.includes(value) ? [value, ...WORKDAY_TIME_OPTIONS] : WORKDAY_TIME_OPTIONS;
  const parseTimeToMinutes = (value) => {
    const match = String(value || '').trim().match(/^(\d{1,2})[:.](\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const formatDurationFromTimes = (startTime, endTime) => {
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    if (startMinutes == null || endMinutes == null) return '';
    const durationMinutes = endMinutes >= startMinutes ? endMinutes - startMinutes : endMinutes + 24 * 60 - startMinutes;
    if (durationMinutes <= 0) return '';
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    if (hours && minutes) return `${hours} hod. ${minutes} min.`;
    if (hours) return `${hours} ${hours === 1 ? 'hodina' : hours < 5 ? 'hodiny' : 'hodin'}`;
    return `${minutes} min.`;
  };

  const isKa02Form = ['plan', 'consultation', 'debt', 'therapy', 'cv', 'simulator'].includes(generatorDraft.selectedKey);
  const isMentorForm = generatorDraft.selectedKey === 'mentor';
  const ka02WorkerOptionsByDocument = {
    consultation: ['Soci\u00e1ln\u00ed pracovn\u00edk', 'Case manager'],
    plan: ['Soci\u00e1ln\u00ed pracovn\u00edk']
  };
  const workerOptionValues = isKa02Form
    ? ka02WorkerOptionsByDocument[generatorDraft.selectedKey] || workers.filter((worker) => worker !== 'Garant projektu')
    : workers;
  const workerOptions = workerOptionValues.map((worker) => ({
    value: worker,
    label: worker
  }));
  const mentorTpmOptions = (tpmRecords || [])
    .filter((record) => !lockClientSelection || !lockedClientId || record.clientId === lockedClientId)
    .map((record) => {
    const startDate = record.payload?.startDate || record.activityDate || '';
    const employer = record.payload?.employer || 'Bez zaměstnavatele';
    return {
      value: record.id,
      label: `${record.clientName || 'Bez klienta'} · ${employer}${startDate ? ` · ${startDate}` : ''}`,
      clientId: record.clientId || ''
    };
    });
  const ka02Duration = formatDurationFromTimes(generatorDraft.ka02StartTime, generatorDraft.ka02EndTime);
  const options = Object.entries(reportPrompts)
    .filter(([key]) => allowedKeys.includes(key))
    .map(([key, value]) => ({ value: key, label: value.label }));
  const isSingleKeyPanel = options.length <= 1;
  const headerGridClass = isMentorForm ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-2' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4';

  const updateDraft = (patch) => {
    onClearSaveNotice?.();
    setGeneratorDraft((prev) => ({ ...prev, ...patch }));
  };
  const ONE_TIME_ORDER_GOAL = { value: 'one-time-order', label: 'Jednor\u00e1zov\u00e1 zak\u00e1zka' };
  const linkedGoalOptions = [ONE_TIME_ORDER_GOAL, ...planGoalOptions];
  const updateLinkedGoal = (goalId) => {
    const selected = linkedGoalOptions.find((goal) => goal.value === goalId);
    updateDraft({
      linkedPlanGoalId: goalId,
      linkedPlanGoalLabel: selected?.label || ''
    });
  };
  const parseBarrierItems = (value) =>
    String(value || '')
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean);
  const mergeBarriers = (items) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).join('; ');
  const barrierItems = parseBarrierItems(generatorDraft.barriers);
  const selectedPresetBarriers = barrierItems.filter((item) => MENTOR_BARRIER_OPTIONS.includes(item));
  const customBarrierItems = barrierItems.filter((item) => !MENTOR_BARRIER_OPTIONS.includes(item));
  const addPresetBarrier = (barrier) => {
    if (!barrier) return;
    updateDraft({ barriers: mergeBarriers([...barrierItems, barrier]) });
  };
  const removeBarrier = (barrier) => {
    updateDraft({ barriers: mergeBarriers(barrierItems.filter((item) => item !== barrier)) });
  };
  const updateCustomBarriers = (value) => {
    const customs = parseBarrierItems(value);
    updateDraft({ barriers: mergeBarriers([...selectedPresetBarriers, ...customs]) });
  };
  const updateGeneratedText = (value) => {
    setGeneratedText(value);
    updateDraft({ generatedText: value });
  };
  const hasGeneratedText = Boolean(String(generatedText || '').trim());
  const supportTypeOptions = generatorDraft.caseManagementMode ? KA2_CASE_SUPPORT_TYPE_OPTIONS.slice(1) : KA1_SUPPORT_TYPE_SELECT_OPTIONS;
  React.useEffect(() => {
    if (!generatorDraft.caseManagementMode) return;
    if (supportTypeOptions.includes(generatorDraft.consultationType)) return;
    updateDraft({ consultationType: supportTypeOptions[0] || '' });
  }, [generatorDraft.caseManagementMode, generatorDraft.consultationType]);

  const normalizedSupportType = String(generatorDraft.consultationType || '').toLowerCase();
  const supportSpecific = generatorDraft.supportSpecific || {};
  const updateSupportSpecific = (key, value) => updateDraft({
    supportSpecific: {
      ...supportSpecific,
      [key]: value
    }
  });
  const CASE_PARTNER_CUSTOM_VALUE = '__manual_person__';
  const selectedPartnerIds = generatorDraft.selectedPartnerIds || [];
  const manualPartnerNames = generatorDraft.manualPartnerNames || [];
  const registeredPartnerNames = selectedPartnerIds
    .map((id) => partners.find((item) => item.id === id))
    .filter(Boolean)
    .map((item) => item.payload?.name || item.title || '')
    .filter(Boolean);
  const selectedParticipantCount = registeredPartnerNames.length + manualPartnerNames.filter((name) => String(name || '').trim()).length;
  const syncPartnerSelection = (nextIds, nextManualNames = manualPartnerNames) => {
    const uniqueIds = Array.from(new Set(nextIds.filter(Boolean)));
    const nextRegisteredNames = uniqueIds
      .map((id) => partners.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => item.payload?.name || item.title || '')
      .filter(Boolean);
    const normalizedManualNames = nextManualNames.map((name) => String(name || ''));
    const filledManualNames = normalizedManualNames.map((name) => name.trim()).filter(Boolean);
    updateDraft({
      selectedPartnerIds: uniqueIds,
      registeredPartnerNames: nextRegisteredNames,
      manualPartnerNames: normalizedManualNames,
      partnerNames: [...nextRegisteredNames, ...filledManualNames],
      participantCount: nextRegisteredNames.length + filledManualNames.length
    });
  };
  const updatePartnerAt = (index, partnerId) => {
    const nextIds = [...selectedPartnerIds];
    if (partnerId === CASE_PARTNER_CUSTOM_VALUE) {
      nextIds.splice(index, 1);
      syncPartnerSelection(nextIds, [...manualPartnerNames, '']);
      return;
    }
    if (partnerId) nextIds[index] = partnerId;
    else nextIds.splice(index, 1);
    syncPartnerSelection(nextIds);
  };
  const updateManualPartnerChoice = (index, value) => {
    if (value === CASE_PARTNER_CUSTOM_VALUE) return;
    const nextManualNames = manualPartnerNames.filter((_, itemIndex) => itemIndex !== index);
    syncPartnerSelection(value ? [...selectedPartnerIds, value] : selectedPartnerIds, nextManualNames);
  };
  const updateManualPartnerName = (index, value) => {
    const nextManualNames = [...manualPartnerNames];
    nextManualNames[index] = value;
    syncPartnerSelection(selectedPartnerIds, nextManualNames);
  };
  const addPartnerSelection = (value) => {
    if (!value) return;
    if (value === CASE_PARTNER_CUSTOM_VALUE) {
      syncPartnerSelection(selectedPartnerIds, [...manualPartnerNames, '']);
      return;
    }
    syncPartnerSelection([...selectedPartnerIds, value]);
  };
  const supportSpecificFields = (() => {
    if (generatorDraft.selectedKey !== 'consultation' || generatorDraft.caseManagementMode) return [];
    return SUPPORT_SPECIFIC_DEFINITIONS[generatorDraft.consultationType] || [];
  })();

  return (
    <Panel title={title} description={description} icon={Sparkles} className={panelClassName}>
      <div className="space-y-3">
        <div className={headerGridClass}>
          {!isSingleKeyPanel && (
            <SelectField label="Typ dokumentu" value={generatorDraft.selectedKey} onChange={(value) => updateDraft({ selectedKey: value })} options={options} />
          )}
          {isMentorForm ? (
            <SelectField
              label="TPM"
              value={generatorDraft.tpmRecordId || ''}
              onChange={(value) => {
                const selected = mentorTpmOptions.find((option) => option.value === value);
                updateDraft({
                  tpmRecordId: value,
                  clientId: lockClientSelection ? lockedClientId : selected?.clientId || '',
                  linkedPlanGoalId: '',
                  linkedPlanGoalLabel: '',
                  workplace: selected?.label || ''
                });
              }}
              options={mentorTpmOptions}
            />
          ) : lockClientSelection ? null : (
            <SelectField
              label="Klient"
              value={generatorDraft.clientId}
              onChange={(value) => updateDraft({ clientId: value, linkedPlanGoalId: '', linkedPlanGoalLabel: '' })}
              options={clients.map((client) => ({ value: client.id, label: client.fullName }))}
            />
          )}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {isMentorForm ? 'Datum sepsání zprávy' : 'Datum aktivity'}
            </label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                id="ka-date-input"
                type="date"
                value={generatorDraft.date}
                onChange={(event) => updateDraft({ date: event.target.value })}
                onFocus={(event) => event.currentTarget.showPicker?.()}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={() => document.getElementById('ka-date-input')?.showPicker?.()}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-slate-700 hover:bg-slate-50"
                aria-label="Otevřít kalendář"
                title="Otevřít kalendář"
              >
                <CalendarDays className="h-4 w-4" />
              </button>
            </div>
          </div>
          {!isMentorForm && (
            <SelectField
              label="Pracovník"
              value={generatorDraft.worker}
              onChange={(value) => updateDraft({ worker: value })}
              options={workerOptions}
            />
          )}
          {(isKa02Form || isMentorForm) && generatorDraft.selectedKey !== 'plan' && (
            <SelectField
              label="Cíl IP *"
              help={HELP.aiGoalLink}
              value={generatorDraft.linkedPlanGoalId || ''}
              onChange={updateLinkedGoal}
              options={[
                { value: '', label: 'Vyber cil...' },
                ...linkedGoalOptions
              ]}
            />
          )}
        </div>

        {isKa02Form && (
          <div className="grid items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2 lg:grid-cols-[88px_88px_minmax(120px,150px)_minmax(200px,1fr)]">
            <div>
              <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">OD <HelpIcon help={HELP.aiTime} /></label>
              <select
                value={generatorDraft.ka02StartTime || ''}
                onChange={(event) => updateDraft({ ka02StartTime: event.target.value })}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Vyber čas</option>
                {timeOptionsWithValue(generatorDraft.ka02StartTime || '').map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">DO</label>
              <select
                value={generatorDraft.ka02EndTime || ''}
                onChange={(event) => updateDraft({ ka02EndTime: event.target.value })}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Vyber čas</option>
                {timeOptionsWithValue(generatorDraft.ka02EndTime || '').map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Trvání</label>
              <div className="flex h-9 items-center rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-700 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]">
                {ka02Duration || '-'}
              </div>
            </div>
            {generatorDraft.caseManagementMode ? (
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Počet aktérů</label>
                <div className="flex h-9 items-center rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-700">{selectedParticipantCount}</div>
              </div>
            ) : (
              <div>
                <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Forma poskytování <HelpIcon help={HELP.aiDelivery} /></label>
                <select value={generatorDraft.ka02Place || ''} onChange={(event) => updateDraft({ ka02Place: event.target.value })} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm">
                  <option value="">Vyber formu...</option>
                  {KA02_PLACE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {generatorDraft.selectedKey === 'plan' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextAreaField label="Popis situace" value={generatorDraft.situationDescription || ''} onChange={(value) => updateDraft({ situationDescription: value })} rows={4} />
            <TextAreaField label="Cíle" value={generatorDraft.goals} onChange={(value) => updateDraft({ goals: value })} rows={4} />
            <TextAreaField label="Plánované kroky" value={generatorDraft.plannedSteps} onChange={(value) => updateDraft({ plannedSteps: value })} rows={3} />
            <TextAreaField label="Závěrečné vyhodnocení" value={generatorDraft.finalEvaluation || ''} onChange={(value) => updateDraft({ finalEvaluation: value })} rows={3} />
          </div>
        )}

        {generatorDraft.selectedKey === 'consultation' && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Typ podpory"
                help={HELP.aiSupportType}
                value={generatorDraft.consultationType}
                onChange={(value) => updateDraft({ consultationType: value })}
                options={supportTypeOptions.map((item) => ({ value: item, label: item }))}
              />
              <SelectField
                label="Oblast podpory"
                help={HELP.aiSupportArea}
                value={generatorDraft.supportArea || ''}
                onChange={(value) => updateDraft({ supportArea: value })}
                options={[{ value: '', label: 'Vyber oblast podpory' }, ...KA1_SUPPORT_AREA_OPTIONS.map((item) => ({ value: item, label: item }))]}
              />
            </div>
            {generatorDraft.caseManagementMode && (
              <div>
                <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Zapojení aktéři <HelpIcon help={HELP.aiCasePartners} /></label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  {selectedPartnerIds.map((partnerId, index) => (
                    <div key={partnerId} className="min-w-[260px] flex-1">
                      <select
                        value={partnerId}
                        onChange={(event) => updatePartnerAt(index, event.target.value)}
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                      >
                        <option value="">{index < selectedPartnerIds.length ? 'Odebrat aktéra' : 'Vyber aktéra'}</option>
                        {partners.map((record) => {
                          const name = record.payload?.name || record.title || 'Aktér';
                          const usedElsewhere = selectedPartnerIds.includes(record.id) && record.id !== partnerId;
                          return <option key={record.id} value={record.id} disabled={usedElsewhere}>{name}</option>;
                        })}
                        <option value={CASE_PARTNER_CUSTOM_VALUE}>{'Dal\u0161\u00ed osoba (ru\u010dn\u011b)'}</option>
                      </select>
                    </div>
                  ))}
                  {manualPartnerNames.map((manualName, index) => (
                    <div key={`manual-partner-${index}`} className="min-w-[260px] flex-1 rounded-md border border-slate-200 bg-white p-2">
                      <select value={CASE_PARTNER_CUSTOM_VALUE} onChange={(event) => updateManualPartnerChoice(index, event.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm">
                        <option value="">Odebrat osobu</option>
                        {partners.map((record) => {
                          const name = record.payload?.name || record.title || 'Akt\u00e9r';
                          return <option key={record.id} value={record.id} disabled={selectedPartnerIds.includes(record.id)}>{name}</option>;
                        })}
                        <option value={CASE_PARTNER_CUSTOM_VALUE}>{'Dal\u0161\u00ed osoba (ru\u010dn\u011b)'}</option>
                      </select>
                      <input type="text" value={manualName} onChange={(event) => updateManualPartnerName(index, event.target.value)} placeholder="Jm\u00e9no a funkce osoby" className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm" />
                    </div>
                  ))}
                  <div className="min-w-[260px] flex-1">
                    <select value="" onChange={(event) => addPartnerSelection(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm">
                      <option value="">Vyber akt\u00e9ra</option>
                      {partners.map((record) => {
                        const name = record.payload?.name || record.title || 'Akt\u00e9r';
                        return <option key={record.id} value={record.id} disabled={selectedPartnerIds.includes(record.id)}>{name}</option>;
                      })}
                      <option value={CASE_PARTNER_CUSTOM_VALUE}>{'Dal\u0161\u00ed osoba (ru\u010dn\u011b)'}</option>
                    </select>
                  </div>
                  {partners.length === 0 && <p className="text-sm text-slate-500">Nejdřív uložte aktéry v kartě KA2-Tvorba sítě.</p>}
                </div>
              </div>
            )}
            {supportSpecificFields.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-600">Specifická pole <HelpIcon help={HELP.aiSpecific} /></div>
                <div className="grid gap-3 sm:grid-cols-3">
                {supportSpecificFields.map(([key, label, type, fieldOptions = []]) => {
                  if (type === 'multiselect') {
                    const selectedValues = String(supportSpecific[key] || '').split(';').map((item) => item.trim()).filter(Boolean);
                    return (
                      <fieldset key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-3">
                        <legend className="px-1 text-xs font-semibold text-slate-600">{label}</legend>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {fieldOptions.map((item) => (
                            <label key={item} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm">
                              <input
                                type="checkbox"
                                checked={selectedValues.includes(item)}
                                onChange={(event) => {
                                  const next = event.target.checked
                                    ? [...selectedValues, item]
                                    : selectedValues.filter((value) => value !== item);
                                  updateSupportSpecific(key, next.join('; '));
                                }}
                              />
                              {item}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    );
                  }
                  if (type === 'select') {
                    return (
                      <SelectField
                        key={key}
                        label={label}
                        value={supportSpecific[key] || ''}
                        onChange={(value) => updateSupportSpecific(key, value)}
                        options={fieldOptions.map((item) => ({ value: item, label: item }))}
                      />
                    );
                  }
                  if (type === 'input') {
                    return <InputField key={key} label={label} value={supportSpecific[key] || ''} onChange={(value) => updateSupportSpecific(key, value)} />;
                  }
                  const suffix = type === 'multiselect' && fieldOptions.length ? ' (' + fieldOptions.join(', ') + ')' : '';
                  return <TextAreaField key={key} label={label + suffix} value={supportSpecific[key] || ''} onChange={(value) => updateSupportSpecific(key, value)} rows={2} />;
                })}
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <TextAreaField label="Popis" value={generatorDraft.topics} onChange={(value) => updateDraft({ topics: value })} rows={2} />
              <TextAreaField label="Výsledek" value={generatorDraft.outcome} onChange={(value) => updateDraft({ outcome: value })} rows={2} />
              <TextAreaField label="Navazující krok" value={generatorDraft.nextSteps} onChange={(value) => updateDraft({ nextSteps: value })} rows={2} />
            </div>
          </>
        )}

        {generatorDraft.selectedKey === 'debt' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TextAreaField label="Mapované závazky" value={generatorDraft.debtSummary} onChange={(value) => updateDraft({ debtSummary: value })} rows={2} />
            <TextAreaField label="Příčiny předlužení" value={generatorDraft.debtCauses} onChange={(value) => updateDraft({ debtCauses: value })} rows={2} />
            <InputField label="Fáze řešení" value={generatorDraft.debtStage} onChange={(value) => updateDraft({ debtStage: value })} />
            <TextAreaField label="Návrh řešení" value={generatorDraft.solutionPlan} onChange={(value) => updateDraft({ solutionPlan: value })} rows={2} />
          </div>
        )}

        {generatorDraft.selectedKey === 'therapy' && (
          <>
            <div className="grid gap-3 sm:grid-cols-1">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pořadí setkání</label>
                <div className="flex h-9 items-center rounded-md border border-slate-300 bg-slate-50 px-2 text-sm font-semibold text-slate-700 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]">
                  {generatorDraft.sessionOrder || '1'}/3 automaticky
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextAreaField label="Témata" value={generatorDraft.themes} onChange={(value) => updateDraft({ themes: value })} rows={2} />
              <TextAreaField label="Psychický stav" value={generatorDraft.mentalState} onChange={(value) => updateDraft({ mentalState: value })} rows={2} />
              <TextAreaField label="Doporučení" value={generatorDraft.recommendations} onChange={(value) => updateDraft({ recommendations: value })} rows={2} />
            </div>
          </>
        )}

        {generatorDraft.selectedKey === 'cv' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InputField label="Cílová pozice" value={generatorDraft.targetJob} onChange={(value) => updateDraft({ targetJob: value })} />
            <TextAreaField label="Zkušenosti" value={generatorDraft.experience} onChange={(value) => updateDraft({ experience: value })} rows={2} />
            <TextAreaField label="Dovednosti" value={generatorDraft.skills} onChange={(value) => updateDraft({ skills: value })} rows={2} />
          </div>
        )}

        {generatorDraft.selectedKey === 'simulator' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InputField label="Simulovaná pozice" value={generatorDraft.position} onChange={(value) => updateDraft({ position: value })} />
            <TextAreaField label="Průběh a výkon" value={generatorDraft.feedback} onChange={(value) => updateDraft({ feedback: value })} rows={2} />
            <TextAreaField label="Silné stránky" value={generatorDraft.strengths} onChange={(value) => updateDraft({ strengths: value })} rows={2} />
            <TextAreaField label="Rozvojové oblasti" value={generatorDraft.developmentAreas} onChange={(value) => updateDraft({ developmentAreas: value })} rows={2} />
          </div>
        )}

        {generatorDraft.selectedKey === 'mentor' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pozorované překážky</label>
              <select
                value=""
                onChange={(event) => addPresetBarrier(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Vyber typickou překážku…</option>
                {MENTOR_BARRIER_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={customBarrierItems.join('; ')}
                onChange={(event) => updateCustomBarriers(event.target.value)}
                placeholder="Jiná překážka / více překážek odděl středníkem"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <div className="flex flex-wrap gap-2">
                {barrierItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => removeBarrier(item)}
                    className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
                    title="Odebrat překážku"
                  >
                    {item} ×
                  </button>
                ))}
              </div>
            </div>
            <TextAreaField
              label="Průběh TPM a dosažený pokrok klienta"
              value={generatorDraft.nextSteps}
              onChange={(value) => updateDraft({ nextSteps: value })}
              rows={2}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button onClick={onGenerate} disabled={isGenerating} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Vygenerovat návrh
          </button>
          <HelpIcon help={HELP.aiGenerate} />
          <button onClick={onSave} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? 'Ukládám…' : 'Ulož dokument'}
          </button>
          <HelpIcon help={HELP.aiSave} />
          {generatorDraft.selectedKey === 'plan' && false && (
            <button onClick={onExportPlan} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">
              <Download className="h-4 w-4" />
              Export plánu do DOCX
            </button>
          )}
        </div>

        {generatorDraft.selectedKey === 'consultation' && saveNotice?.tone !== 'success' && (
          <div className={`rounded-lg border px-3 py-2 text-sm ${
            saveMissingFields.length ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}>
            {saveMissingFields.length
              ? <>Před uložením doplňte: <strong>{saveMissingFields.join(', ')}</strong>.</>
              : 'Všechna povinná pole pro uložení jsou vyplněna.'}
          </div>
        )}
        {saveNotice?.text && (
          <div className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
            saveNotice.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : saveNotice.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : saveNotice.tone === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-blue-200 bg-blue-50 text-blue-800'
          }`}>{saveNotice.text}</div>
        )}

        {!isMentorForm && generationNotice && (
          <div
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              aiGenerationStatus === 'error'
                ? 'border border-red-200 bg-red-50 text-red-800'
                : aiGenerationStatus === 'warning'
                  ? 'border border-amber-200 bg-amber-50 text-amber-800'
                  : aiGenerationStatus === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border border-blue-200 bg-blue-50 text-blue-800'
            }`}
          >
            {generationNotice}
          </div>
        )}

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
            <span className="flex items-center gap-1">Výstup dokumentu <HelpIcon help={HELP.aiOutput} /></span>
            <span className="rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-xs font-semibold text-indigo-700">{generatedText.length} znaků</span>
          </div>
          <textarea
            value={generatedText}
            onChange={(event) => updateGeneratedText(event.target.value)}
            rows={hasGeneratedText ? 14 : 1}
            className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${
              hasGeneratedText ? 'min-h-[280px]' : 'min-h-[40px]'
            }`}
            placeholder="Po vygenerování nebo ručním dopsání se zde zobrazí text dokumentu."
          />
        </div>

        {!hideStyleFeedback && (
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Hodnocení AI výstupu"
              value={generatorDraft.aiStyleRating}
              onChange={(value) => updateDraft({ aiStyleRating: value })}
              options={[
                { value: '5', label: '5 - výborné' },
                { value: '4', label: '4 - dobré' },
                { value: '3', label: '3 - použitelné' },
                { value: '2', label: '2 - slabší' },
                { value: '1', label: '1 - nepoužitelné' }
              ]}
            />
            <TextAreaField label="Poznámka k AI stylu (anonymizovaná)" value={generatorDraft.aiStyleFeedback} onChange={(value) => updateDraft({ aiStyleFeedback: value })} rows={2} />
          </div>
        )}
      </div>
    </Panel>
  );
}

export default AiDocumentPanel;


import React, { useEffect, useMemo, useState } from 'react';
import { Target } from 'lucide-react';

import { Panel } from '../components/ui.jsx';

const emptyGoal = {
  goalId: '',
  goalDescription: '',
  actionSteps: '',
  targetDate: '',
  isCompleted: false,
  goalEvaluation: ''
};

const emptyPlan = {
  strengthsAndLimits: '',
  identifiedBarriers: '',
  goals: [{ ...emptyGoal }],
  finalEvaluation: '',
  acceptedPlanText: ''
};

const inputClassName =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
const labelClassName = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500';

const todayIso = () => new Date().toISOString().slice(0, 10);
const ensureGoalId = (goal, index) => goal.goalId || goal.id || `goal-${index + 1}`;
const autoResizeTextarea = (element) => {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
};

function AutoResizeTextarea({ value, onChange, rows = 2, className, ...props }) {
  const textareaRef = React.useRef(null);

  useEffect(() => {
    autoResizeTextarea(textareaRef.current);
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      rows={rows}
      value={value}
      onChange={(event) => {
        onChange(event);
        autoResizeTextarea(event.currentTarget);
      }}
      className={`${className} resize-none overflow-hidden`}
      {...props}
    />
  );
}

const timestampToDateInput = (value) => {
  if (!value) return '';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const dateInputToTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value + 'T00:00:00');
  return Number.isNaN(date.getTime()) ? '' : value;
};

function PersonalDevelopmentPlanForm({ clientId, clientName = '', records = [], onSaveRecord, onUpdateRecord, compact = false }) {
  const [planId, setPlanId] = useState('');
  const [plan, setPlan] = useState(emptyPlan);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const goalsReadyForFinalEvaluation = useMemo(
    () =>
      plan.goals.length > 0 &&
      plan.goals.every((goal) => goal.isCompleted && goal.goalEvaluation.trim()),
    [plan.goals]
  );

  useEffect(() => {
    setNotice('');
    setError('');
    setPlanId('');
    setPlan(emptyPlan);
    setLoading(false);

    if (!clientId) return;
    const planRecord = records
      .filter((record) => record.entityType === 'plans' && record.clientId === clientId)
      .sort((a, b) => {
        const aGoals = Array.isArray(a.goals) ? a.goals : a.payload?.structuredGoals || [];
        const bGoals = Array.isArray(b.goals) ? b.goals : b.payload?.structuredGoals || [];
        const aHasContent = Number(Boolean(a.payload?.strengthsAndLimits || a.payload?.currentSituation || aGoals.some((goal) => goal.goalDescription)));
        const bHasContent = Number(Boolean(b.payload?.strengthsAndLimits || b.payload?.currentSituation || bGoals.some((goal) => goal.goalDescription)));
        if (aHasContent !== bHasContent) return bHasContent - aHasContent;
        return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0);
      })[0];

    if (!planRecord) return;
    const data = planRecord;
    const storedGoals = Array.isArray(data.goals) && data.goals.length
      ? data.goals
      : Array.isArray(data.payload?.structuredGoals) && data.payload.structuredGoals.length
        ? data.payload.structuredGoals
        : Array.isArray(data.payload?.goals)
          ? data.payload.goals
          : [];

    setPlanId(data.id);
    setPlan({
      strengthsAndLimits: data.strengthsAndLimits || data.payload?.strengthsAndLimits || data.payload?.currentSituation || '',
      identifiedBarriers: data.identifiedBarriers || data.payload?.identifiedBarriers || data.payload?.barriers || '',
      goals: storedGoals.length
        ? storedGoals.map((goal, index) => ({
            goalId: ensureGoalId(goal, index),
            goalDescription: goal.goalDescription || '',
            actionSteps: Array.isArray(goal.actionSteps) ? goal.actionSteps.join('\n') : goal.actionSteps || '',
            targetDate: timestampToDateInput(goal.targetDate || goal.deadline),
            isCompleted: Boolean(goal.isCompleted),
            goalEvaluation: goal.goalEvaluation || ''
          }))
        : [{ ...emptyGoal }],
      finalEvaluation: data.finalEvaluation || data.payload?.finalEvaluation || '',
      acceptedPlanText: data.acceptedPlanText || data.payload?.acceptedPlanText || data.documentText || ''
    });
  }, [clientId, records]);

  const updateField = (field, value) => {
    setPlan((current) => ({ ...current, [field]: value }));
  };

  const updateGoal = (index, field, value) => {
    setPlan((current) => ({
      ...current,
      goals: current.goals.map((goal, goalIndex) =>
        goalIndex === index ? { ...goal, [field]: value } : goal
      )
    }));
  };

  const addGoal = () => {
    setPlan((current) => ({
      ...current,
      goals: [...current.goals, { ...emptyGoal, goalId: `goal-${current.goals.length + 1}` }]
    }));
  };

  const removeGoal = (index) => {
    setPlan((current) => ({
      ...current,
      goals: current.goals.length === 1
        ? [{ ...emptyGoal }]
        : current.goals.filter((_, goalIndex) => goalIndex !== index)
    }));
  };

  const buildStructuredPlan = () => ({
    strengthsAndLimits: plan.strengthsAndLimits.trim(),
    identifiedBarriers: plan.identifiedBarriers.trim(),
    goals: plan.goals.map((goal, index) => ({
      goalId: ensureGoalId(goal, index),
      goalDescription: goal.goalDescription.trim(),
      actionSteps: goal.actionSteps.trim(),
      targetDate: dateInputToTimestamp(goal.targetDate),
      isCompleted: Boolean(goal.isCompleted),
      goalEvaluation: goal.isCompleted ? goal.goalEvaluation.trim() : ''
    })),
    finalEvaluation: goalsReadyForFinalEvaluation ? plan.finalEvaluation.trim() : '',
    acceptedPlanText: plan.acceptedPlanText.trim(),
    updatedAt: new Date().toISOString()
  });

  const buildPayload = () => {
    const structuredPlan = buildStructuredPlan();
    const firstGoal = structuredPlan.goals[0]?.goalDescription || 'Průběžný osobní rozvoj klienta';

    return {
      entityType: 'plans',
      ka: 'KA1',
      title: 'Individuální plán rozvoje',
      activityDate: todayIso(),
      worker: 'Sociální pracovník',
      clientId,
      clientIds: [clientId],
      clientName,
      documentText: [
        `Silné stránky a limity: ${structuredPlan.strengthsAndLimits}`,
        `Identifikované bariéry: ${structuredPlan.identifiedBarriers}`,
        `První cíl: ${firstGoal}`,
        structuredPlan.finalEvaluation ? `Závěrečné vyhodnocení: ${structuredPlan.finalEvaluation}` : ''
      ].filter(Boolean).join('\n\n'),
      strengthsAndLimits: structuredPlan.strengthsAndLimits,
      identifiedBarriers: structuredPlan.identifiedBarriers,
      goals: structuredPlan.goals,
      finalEvaluation: structuredPlan.finalEvaluation,
      payload: {
        ...structuredPlan,
        acceptedPlanText: structuredPlan.acceptedPlanText,
        structuredPersonalDevelopmentPlan: true
      },
      indicatorFlags: { ka02Plans: true },
      createdAt: Date.now(),
      updatedAt: structuredPlan.updatedAt
    };
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setNotice('');
    setError('');

    if (!clientId) {
      setError('Chyb\u00ed clientId, pl\u00e1n nelze ulo\u017eit.');
      return;
    }
    if (typeof onSaveRecord !== 'function' || typeof onUpdateRecord !== 'function') {
      setError('Ukl\u00e1d\u00e1n\u00ed individu\u00e1ln\u00edho pl\u00e1nu nen\u00ed p\u0159ipojeno.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const ok = planId
        ? await onUpdateRecord(planId, payload)
        : await onSaveRecord(payload);
      if (!ok) throw new Error('Google Sheet ulo\u017een\u00ed odm\u00edtl.');
      setNotice('Individu\u00e1ln\u00ed pl\u00e1n rozvoje byl ulo\u017een do Google Sheetu.');
    } catch (saveError) {
      setError('Pl\u00e1n se nepoda\u0159ilo ulo\u017eit: ' + (saveError.message || saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Individuální plán rozvoje" description="Cíle klienta a jejich vyhodnocení." icon={Target} className={compact ? 'p-3' : ''}>
      <form onSubmit={handleSave} className="space-y-3">
        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Načítám plán...</div>
        ) : (
          <>
            <div className={`grid gap-3 ${compact ? '' : 'lg:grid-cols-2'}`}>
              <div>
                <label className={labelClassName}>Silné stránky a limity *</label>
                <AutoResizeTextarea
                  required
                  rows={2}
                  value={plan.strengthsAndLimits}
                  onChange={(event) => updateField('strengthsAndLimits', event.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Identifikované bariéry *</label>
                <AutoResizeTextarea
                  required
                  rows={2}
                  value={plan.identifiedBarriers}
                  onChange={(event) => updateField('identifiedBarriers', event.target.value)}
                  placeholder="Např. dluhy, nízké vzdělání, zdravotní omezení..."
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-900">Cíle</h3>
                <button
                  type="button"
                  onClick={addGoal}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  Přidat cíl
                </button>
              </div>

              {plan.goals.map((goal, index) => (
                <div key={ensureGoalId(goal, index)} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-800">Cíl {index + 1}</div>
                    <button
                      type="button"
                      onClick={() => removeGoal(index)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      Odebrat
                    </button>
                  </div>

                  <div className={`mt-2 grid gap-2 ${compact ? '' : 'lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_150px_96px] lg:items-end'}`}>
                    <div>
                      <label className={labelClassName}>Popis cíle *</label>
                      <AutoResizeTextarea
                        required
                        rows={2}
                        value={goal.goalDescription}
                        onChange={(event) => updateGoal(index, 'goalDescription', event.target.value)}
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Akční kroky *</label>
                      <AutoResizeTextarea
                        required
                        rows={2}
                        value={goal.actionSteps}
                        onChange={(event) => updateGoal(index, 'actionSteps', event.target.value)}
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Termín *</label>
                      <input
                        required
                        type="date"
                        value={goal.targetDate}
                        onChange={(event) => updateGoal(index, 'targetDate', event.target.value)}
                        className={inputClassName}
                      />
                    </div>
                    <label className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={goal.isCompleted}
                        onChange={(event) => updateGoal(index, 'isCompleted', event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Splněno
                    </label>
                  </div>

                  {goal.isCompleted && (
                    <div className="mt-2">
                      <label className={labelClassName}>Hodnocení cíle *</label>
                      <AutoResizeTextarea
                        required
                        rows={2}
                        value={goal.goalEvaluation}
                        onChange={(event) => updateGoal(index, 'goalEvaluation', event.target.value)}
                        className={inputClassName}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>


            {goalsReadyForFinalEvaluation ? (
              <div>
                <label className={labelClassName}>Závěrečné vyhodnocení plánu</label>
                <AutoResizeTextarea
                  rows={2}
                  value={plan.finalEvaluation}
                  onChange={(event) => updateField('finalEvaluation', event.target.value)}
                  className={inputClassName}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                Závěrečné vyhodnocení se zobrazí po splnění a vyhodnocení všech cílů.
              </div>
            )}
          </>
        )}

        {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</div>}

        <button
          type="submit"
          disabled={loading || saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Ukládám...' : 'Uložit plán'}
        </button>
      </form>
    </Panel>
  );
}

export default PersonalDevelopmentPlanForm;

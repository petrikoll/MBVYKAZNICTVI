import React, { useEffect, useId, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, MapPin, ShieldAlert } from 'lucide-react';
import {
  findMunicipality,
  getAddressSuggestions,
  getMunicipalitySuggestions,
  loadRuianManifest,
  loadRuianMunicipalityShards,
  validateClientAddress
} from '../lib/ruianAddress.js';

const inputClassName = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

function AddressInput({ id, label, value, onChange, options, placeholder, disabled = false, required = false }) {
  const listId = `${id}-options`;
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-1 text-rose-500" aria-hidden="true">*</span>}
      </span>
      <input
        id={id}
        type="text"
        value={value || ''}
        list={options?.length ? listId : undefined}
        autoComplete="off"
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClassName} ${disabled ? 'cursor-not-allowed bg-slate-100 opacity-60' : ''}`}
      />
      {options?.length ? (
        <datalist id={listId}>
          {options.map((option) => <option key={option} value={option} />)}
        </datalist>
      ) : null}
    </label>
  );
}

function RuianAddressFields({ draft, setDraft, compact = false }) {
  const fieldId = useId().replace(/:/g, '');
  const [manifest, setManifest] = useState(null);
  const [shards, setShards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [validation, setValidation] = useState(null);
  const [loadError, setLoadError] = useState('');
  const mode = draft?.addressMode === 'municipalityOnly' ? 'municipalityOnly' : 'full';

  const update = (key, value) => {
    setValidation(null);
    setDraft((previous) => ({ ...previous, [key]: value }));
  };

  useEffect(() => {
    let active = true;
    loadRuianManifest()
      .then((loadedManifest) => {
        if (!active) return;
        setManifest(loadedManifest);
        setLoadError('');
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'Registr RÚIAN se nepodařilo načíst.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const municipality = manifest ? findMunicipality(manifest, draft?.mesto) : null;
    if (!municipality || mode === 'municipalityOnly') {
      setShards([]);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }
    setIsLoading(true);
    loadRuianMunicipalityShards(municipality)
      .then((loadedShards) => {
        if (active) {
          setShards(loadedShards);
          setLoadError('');
        }
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Adresní data obce se nepodařilo načíst.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [manifest, draft?.mesto, mode]);

  useEffect(() => {
    if (!manifest || loadError) return undefined;
    const hasEnoughData = mode === 'municipalityOnly'
      ? Boolean(String(draft?.mesto || '').trim())
      : Boolean(String(draft?.mesto || '').trim()
        && String(draft?.cisloPopisne || '').trim()
        && String(draft?.psc || '').trim());
    if (!hasEnoughData) {
      setValidation(null);
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      validateClientAddress(draft, { manifest })
        .then((result) => {
          if (active) setValidation(result);
        })
        .catch((error) => {
          if (active) {
            setValidation({
              valid: false,
              reason: error instanceof Error ? error.message : 'Adresu se nepodařilo ověřit.'
            });
          }
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [manifest, loadError, mode, draft?.mesto, draft?.ulice, draft?.cisloPopisne, draft?.psc]);

  const suggestions = useMemo(() => {
    if (!manifest) return { streets: [], houses: [], postalCodes: [] };
    return getAddressSuggestions(draft, manifest, shards);
  }, [draft?.mesto, draft?.ulice, draft?.cisloPopisne, draft?.psc, manifest, shards]);

  const municipalityOptions = useMemo(
    () => (manifest
      ? getMunicipalitySuggestions(manifest, draft?.mesto, draft?.psc, 12).map((item) => item.name)
      : []),
    [manifest, draft?.mesto, draft?.psc]
  );

  const setMode = (nextMode) => {
    setValidation(null);
    setDraft((previous) => ({
      ...previous,
      addressMode: nextMode,
      ...(nextMode === 'municipalityOnly' ? { ulice: '', cisloPopisne: '', psc: '' } : {})
    }));
  };

  return (
    <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/45 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <MapPin className="h-4 w-4 text-indigo-600" />
          Adresa ověřovaná v RÚIAN
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={mode === 'municipalityOnly'}
            onChange={(event) => setMode(event.target.checked ? 'municipalityOnly' : 'full')}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
          />
          Evidovat pouze obec
        </label>
      </div>

      <div className={compact ? 'grid gap-2' : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4'}>
        <AddressInput
          id={`${fieldId}-city`}
          label="Město / obec"
          value={draft?.mesto}
          onChange={(value) => update('mesto', value)}
          options={municipalityOptions}
          placeholder="Začněte psát obec"
          required
        />
        <AddressInput
          id={`${fieldId}-street`}
          label="Ulice"
          value={draft?.ulice}
          onChange={(value) => update('ulice', value)}
          options={suggestions.streets}
          placeholder={mode === 'municipalityOnly' ? 'Nevyplňuje se' : 'Vyberte ulici'}
          disabled={mode === 'municipalityOnly'}
        />
        <AddressInput
          id={`${fieldId}-house`}
          label="Číslo popisné"
          value={draft?.cisloPopisne}
          onChange={(value) => update('cisloPopisne', value)}
          options={suggestions.houses}
          placeholder={mode === 'municipalityOnly' ? 'Nevyplňuje se' : 'Např. 791/3'}
          disabled={mode === 'municipalityOnly'}
          required={mode !== 'municipalityOnly'}
        />
        <AddressInput
          id={`${fieldId}-zip`}
          label="PSČ"
          value={draft?.psc}
          onChange={(value) => update('psc', value)}
          options={suggestions.postalCodes}
          placeholder={mode === 'municipalityOnly' ? 'Nevyplňuje se' : 'Např. 70030'}
          disabled={mode === 'municipalityOnly'}
          required={mode !== 'municipalityOnly'}
        />
      </div>

      <div
        aria-live="polite"
        className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
          loadError || validation?.valid === false
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : validation?.valid
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white/80 text-slate-500'
        }`}
      >
        {isLoading ? (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
        ) : validation?.valid ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <span>
          {loadError
            || validation?.reason
            || (validation?.valid
              ? mode === 'municipalityOnly'
                ? 'Obec je potvrzena v RÚIAN. Uloží se bez ulice, čísla domu a PSČ.'
                : 'Úplná adresa je potvrzena v RÚIAN.'
              : mode === 'municipalityOnly'
                ? 'Vyberte obec z nabídky. Bez potvrzení adresy klienta nelze uložit.'
                : 'Vyberte obec a doplňte nabízenou ulici, číslo domu a PSČ. Bez potvrzení nelze klienta uložit.')}
        </span>
      </div>
    </div>
  );
}

export default RuianAddressFields;

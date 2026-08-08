export const KA1_SUPPORT_TYPE_OPTIONS = [
  'Depistáž',
  'Sociální šetření / mapování situace',
  'Základní sociální poradenství',
  'Terénní sociální práce',
  'Doprovod klienta',
  'Odborné sociální poradenství',
  'Krizová intervence',
  'Vyhodnocení spolupráce / ukončení podpory'
];

export const AMBULATORY_INCOMPATIBLE_SUPPORT_TYPES = [
  'Depistáž',
  'Terénní sociální práce',
  'Doprovod klienta'
];

const normalizeValue = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const ambulatoryExcluded = new Set(AMBULATORY_INCOMPATIBLE_SUPPORT_TYPES.map(normalizeValue));

export function getKa1SupportTypeOptions(deliveryForm) {
  if (normalizeValue(deliveryForm) !== 'ambulantni') return [...KA1_SUPPORT_TYPE_OPTIONS];
  return KA1_SUPPORT_TYPE_OPTIONS.filter((type) => !ambulatoryExcluded.has(normalizeValue(type)));
}

export function isKa1SupportCombinationAllowed(deliveryForm, supportType) {
  const normalizedType = normalizeValue(supportType);
  return Boolean(normalizedType) && getKa1SupportTypeOptions(deliveryForm)
    .some((type) => normalizeValue(type) === normalizedType);
}

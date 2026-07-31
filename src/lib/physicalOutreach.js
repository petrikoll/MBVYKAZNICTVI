const PHYSICAL_SIGNED_FILED_OUTREACH_TEXT = [
  'Zápis k depistáži byl fyzicky podepsán a založen do klientské dokumentace.',
  'Elektronický záznam slouží pouze k evidenci základních údajů o aktivitě v programu.',
  'Podrobný obsah aktivity je uveden ve fyzicky založeném zápisu.'
].join(' ');

function buildPhysicalSignedFiledOutreachText(comment = '') {
  const normalizedComment = String(comment || '').trim();
  return [
    PHYSICAL_SIGNED_FILED_OUTREACH_TEXT,
    normalizedComment ? `Doplňující elektronický komentář: ${normalizedComment}` : ''
  ].filter(Boolean).join('\n\n');
}

export {
  PHYSICAL_SIGNED_FILED_OUTREACH_TEXT,
  buildPhysicalSignedFiledOutreachText
};

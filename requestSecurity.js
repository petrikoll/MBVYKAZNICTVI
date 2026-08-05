function firstForwardedValue(value) {
  return String(value || '').split(',')[0].trim();
}

function expectedRequestOrigin(request) {
  const forwardedProto = firstForwardedValue(request.headers?.['x-forwarded-proto']);
  const forwardedHost = firstForwardedValue(request.headers?.['x-forwarded-host']);
  const protocol = forwardedProto || (request.socket?.encrypted ? 'https' : 'http');
  const host = forwardedHost || firstForwardedValue(request.headers?.host);
  return host ? `${protocol}://${host}` : '';
}

export function isTrustedMutationOrigin(request) {
  const fetchSite = String(request.headers?.['sec-fetch-site'] || '').trim().toLowerCase();
  if (fetchSite === 'cross-site') return false;

  const origin = String(request.headers?.origin || '').trim();
  if (!origin) return true;

  const expectedOrigin = expectedRequestOrigin(request);
  if (!expectedOrigin) return false;

  try {
    return new URL(origin).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
}
